import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './UploadPage.css';

const UploadPage = () => {
    const [jobDescription, setJobDescription] = useState('');
    const [resumes, setResumes] = useState([]);
    const [message, setMessage] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const navigate = useNavigate();

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

        setTimeout(async () => {
            const formData = new FormData();
            formData.append('jobDescription', jobDescription);
            for (let i = 0; i < resumes.length; i++) {
                formData.append('resumes', resumes[i]);
            }

            try {
                const response = await fetch('http://127.0.0.1:5000/api/analyze', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                setAnalysisResult(data);

                if (response.ok) {
                    setMessage(`Analysis Complete: ${data.processed_files?.length || 0} processed, ${data.skipped_files?.length || 0} skipped.`);
                    setTimeout(() => {
                        navigate(`/jobs/${data.job_id}`);
                    }, 2000);
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            } catch (error) {
                setMessage(`Error: ${error.message}`);
                setIsAnalyzing(false);
            }
        }, 100);
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