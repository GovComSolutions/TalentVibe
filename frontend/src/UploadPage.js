import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './UploadPage.css';

const UploadPage = () => {
    const [jobDescription, setJobDescription] = useState('');
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

        setIsAnalyzing(true);
        setAnalysisResult(null);
        setMessage('');
        setProgressUpdates([]);

        setTimeout(async () => {
            const formData = new FormData();
            formData.append('jobDescription', jobDescription);
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
                        <textarea
                            id="jobDescription"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the full job description here..."
                            required
                        />
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