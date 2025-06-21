import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './JobsPage.css';

const JobsListPage = () => {
    const [jobs, setJobs] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/jobs');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setJobs(data);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch jobs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, []);

    const truncateText = (text, length) => {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    };

    return (
        <div className="jobs-page-container">
            <h2>Active Job Roles</h2>
            {isLoading && <p>Loading jobs...</p>}
            {error && <p className="message error">Error: {error}</p>}
            {!isLoading && !error && (
                <div className="jobs-grid">
                    {jobs.length > 0 ? (
                        jobs.map(job => (
                            <div key={job.id} className="glass-container job-card">
                                <h3>{truncateText(job.description, 100)}</h3>
                                <div className="job-card-meta">
                                    <span>{job.resume_count} Résumés</span>
                                </div>
                                <Link to={`/jobs/${job.id}`} className="details-button">View Analysis</Link>
                            </div>
                        ))
                    ) : (
                        <p>No jobs submitted yet. <Link to="/upload">Upload one now!</Link></p>
                    )}
                </div>
            )}
        </div>
    );
};

export default JobsListPage; 