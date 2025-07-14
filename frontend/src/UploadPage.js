import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './UploadPage.css';

const allowedJobDescTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const UploadPage = () => {
    const [jobDescription, setJobDescription] = useState('');
    const [jobDescFile, setJobDescFile] = useState(null);
    const [jobDescDrag, setJobDescDrag] = useState(false);
    const [resumes, setResumes] = useState([]);
    const [message, setMessage] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [progressUpdates, setProgressUpdates] = useState([]);
    const [currentJobId, setCurrentJobId] = useState(null);
    const navigate = useNavigate();
    const socketRef = useRef(null);

    // Initialize WebSocket connection
    useEffect(() => {
        socketRef.current = io('http://127.0.0.1:5000');
        
        socketRef.current.on('connect', () => {
            console.log('Connected to server');
        });

        socketRef.current.on('progress_update', (data) => {
            console.log('Progress update:', data);
            setProgressUpdates(prev => [...prev, data]);
            
            // Auto-navigate when analysis is complete
            if (data.type === 'complete' && currentJobId) {
                setTimeout(() => {
                    navigate(`/jobs/${currentJobId}`);
                }, 2000);
            }
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [navigate, currentJobId]);

    // Job Description File Handlers
    const handleJobDescFileChange = (e) => {
        const file = e.target.files[0];
        if (file && allowedJobDescTypes.includes(file.type)) {
            setJobDescFile(file);
            setJobDescription('');
        } else {
            setMessage('Error: Only .pdf, .docx, or .txt files are allowed for job description.');
        }
    };
    const handleJobDescDragOver = (e) => {
        e.preventDefault();
        setJobDescDrag(true);
    };
    const handleJobDescDragLeave = (e) => {
        e.preventDefault();
        setJobDescDrag(false);
    };
    const handleJobDescDrop = (e) => {
        e.preventDefault();
        setJobDescDrag(false);
        const file = e.dataTransfer.files[0];
        if (file && allowedJobDescTypes.includes(file.type)) {
            setJobDescFile(file);
            setJobDescription('');
        } else {
            setMessage('Error: Only .pdf, .docx, or .txt files are allowed for job description.');
        }
    };
    const handleJobDescText = (e) => {
        setJobDescription(e.target.value);
        setJobDescFile(null);
    };
    const clearJobDescFile = () => setJobDescFile(null);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setResumes([...e.target.files]);
        }
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setResumes([...e.dataTransfer.files]);
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (resumes.length === 0) {
            setMessage('Error: Please upload at least one résumé.');
            return;
        }
        if (!jobDescription && !jobDescFile) {
            setMessage('Error: Please provide a job description (paste/type or upload a file).');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);
        setMessage('');
        setProgressUpdates([]);

        setTimeout(async () => {
            const formData = new FormData();
            if (jobDescFile) {
                formData.append('job_description_file', jobDescFile);
            } else {
                formData.append('job_description', jobDescription);
            }
            for (let i = 0; i < resumes.length; i++) {
                formData.append('resumes', resumes[i]);
            }

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                setAnalysisResult(data);
                setCurrentJobId(data.job_id);

                if (response.ok) {
                    setMessage(`Analysis queued successfully! ${data.total_resumes} resumes are being processed in the background. You'll be redirected when complete.`);
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            } catch (error) {
                setMessage(`Error: ${error.message}`);
                setIsAnalyzing(false);
            }
        }, 100);
    };

    const getProgressTypeClass = (type) => {
        switch (type) {
            case 'success': return 'progress-success';
            case 'error': return 'progress-error';
            case 'warning': return 'progress-warning';
            case 'processing': return 'progress-processing';
            default: return 'progress-info';
        }
    };

    return (
        <div className="upload-page-container">
            <div className="glass-container">
                <h2>Analyze New Role</h2>
                <p>Provide a job description and the corresponding résumés to begin the analysis.</p>
                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label htmlFor="jobDescription">Job Description</label>
                        <div className="jobdesc-multi-input">
                            {/* Paste/Type */}
                            <textarea
                                id="jobDescription"
                                value={jobDescription}
                                onChange={handleJobDescText}
                                placeholder="Paste or type the full job description here..."
                                disabled={!!jobDescFile}
                                required={!jobDescFile}
                            />
                            {/* Drag & Drop */}
                            <div
                                className={`jobdesc-drop-zone${jobDescDrag ? ' dragging' : ''}`}
                                onDragOver={handleJobDescDragOver}
                                onDragLeave={handleJobDescDragLeave}
                                onDrop={handleJobDescDrop}
                                tabIndex={0}
                                aria-label="Drag and drop a job description file here"
                            >
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    className="jobdesc-drop-input"
                                    onChange={handleJobDescFileChange}
                                    disabled={!!jobDescFile}
                                />
                                <div className="jobdesc-drop-prompt">
                                    <span className="jobdesc-drop-icon">📎</span>
                                    <p>Drag & drop a file here, or click to attach</p>
                                    <p className="file-types">Supports: .pdf, .docx, .txt</p>
                                </div>
                            </div>
                            {/* Show attached file if present */}
                            {jobDescFile && (
                                <div className="jobdesc-file-list">
                                    <span className="jobdesc-file-name">{jobDescFile.name}</span>
                                    <button type="button" className="jobdesc-file-remove" onClick={clearJobDescFile}>&times;</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Upload Résumés</label>
                        <div 
                            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="resumes"
                                onChange={handleFileChange}
                                multiple
                                className="drop-zone-input"
                            />
                            <div className="drop-zone-prompt">
                                <span className="drop-zone-icon">☁️</span>
                                <p>Drag & drop files here, or click to select files</p>
                                <p className="file-types">Supports: .pdf, .docx, .txt</p>
                            </div>
                        </div>
                        {resumes.length > 0 && (
                            <div className="file-list">
                                <h4>Selected Files:</h4>
                                <ul>
                                    {Array.from(resumes).map((file, index) => (
                                        <li key={index}>{file.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <button type="submit" className={`cta-button ${isAnalyzing ? 'analyzing' : ''}`} disabled={isAnalyzing}>
                        <span className="button-text">
                            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                        </span>
                    </button>
                </form>
                
                {/* Real-time Progress Updates */}
                {isAnalyzing && progressUpdates.length > 0 && (
                    <div className="progress-updates">
                        <h4>Analysis Progress</h4>
                        <div className="progress-list">
                            {progressUpdates.map((update, index) => (
                                <div key={index} className={`progress-item ${getProgressTypeClass(update.type)}`}>
                                    <span className="progress-message">{update.message}</span>
                                    <span className="progress-time">
                                        {new Date(update.timestamp * 1000).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {message && <p className={`message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>}
                
                {analysisResult && analysisResult.skipped_files && analysisResult.skipped_files.length > 0 && (
                    <div className="skipped-files-report">
                        <h4>Skipped Files Report</h4>
                        <ul>
                            {analysisResult.skipped_files.map((file, index) => (
                                <li key={index}><strong>{file.filename}</strong> - {file.reason}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadPage;