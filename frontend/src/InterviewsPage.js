import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './InterviewsPage.css';

const InterviewsPage = () => {
    const [interviews, setInterviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await fetch('/api/interviews');
            if (!response.ok) throw new Error('Failed to fetch interviews');
            const data = await response.json();
            setInterviews(data);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching interviews:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'status-scheduled';
            case 'completed': return 'status-completed';
            case 'cancelled': return 'status-cancelled';
            case 'rescheduled': return 'status-rescheduled';
            default: return 'status-default';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'phone': return '📞';
            case 'video': return '📹';
            case 'onsite': return '🏢';
            case 'technical': return '💻';
            default: return '📋';
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not scheduled';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const filteredInterviews = interviews.filter(interview => {
        const statusMatch = filterStatus === 'all' || interview.status === filterStatus;
        const typeMatch = filterType === 'all' || interview.interview_type === filterType;
        return statusMatch && typeMatch;
    });

    if (isLoading) return <div className="interviews-container"><p>Loading interviews...</p></div>;
    if (error) return <div className="interviews-container message error">Error: {error}</div>;

    return (
        <div className="interviews-container">
            <div className="glass-container interviews-header">
                <h1>Interview Management</h1>
                <p>Manage and track all your candidate interviews in one place.</p>
            </div>

            <div className="glass-container filters-section">
                <div className="filters">
                    <div className="filter-group">
                        <label>Status:</label>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rescheduled">Rescheduled</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Type:</label>
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">All Types</option>
                            <option value="phone">Phone</option>
                            <option value="video">Video</option>
                            <option value="onsite">Onsite</option>
                            <option value="technical">Technical</option>
                        </select>
                    </div>
                </div>
                <div className="stats">
                    <span>Total: {interviews.length}</span>
                    <span>Filtered: {filteredInterviews.length}</span>
                </div>
            </div>

            {filteredInterviews.length === 0 ? (
                <div className="glass-container empty-state">
                    <h3>No interviews found</h3>
                    <p>Create your first interview by going to a job and scheduling interviews for candidates.</p>
                    <Link to="/jobs" className="cta-button">View Jobs</Link>
                </div>
            ) : (
                <div className="interviews-grid">
                    {filteredInterviews.map(interview => (
                        <div key={interview.id} className="glass-container interview-card">
                            <div className="interview-header">
                                <div className="interview-type">
                                    <span className="type-icon">{getTypeIcon(interview.interview_type)}</span>
                                    <span className="type-text">{interview.interview_type}</span>
                                </div>
                                <span className={`status-badge ${getStatusColor(interview.status)}`}>
                                    {interview.status}
                                </span>
                            </div>
                            
                            <h3 className="interview-title">{interview.title}</h3>
                            
                            <div className="interview-details">
                                <div className="detail-row">
                                    <span className="label">Candidate:</span>
                                    <span className="value">{interview.candidate_name || 'Unknown'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Job:</span>
                                    <span className="value">{interview.job_title}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Scheduled:</span>
                                    <span className="value">{formatDateTime(interview.scheduled_at)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Duration:</span>
                                    <span className="value">{interview.duration_minutes} minutes</span>
                                </div>
                                {interview.primary_interviewer && (
                                    <div className="detail-row">
                                        <span className="label">Interviewer:</span>
                                        <span className="value">{interview.primary_interviewer}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="interview-actions">
                                <Link 
                                    to={`/jobs/${interview.job_id}`} 
                                    className="action-button view-job"
                                >
                                    View Job
                                </Link>
                                <button className="action-button edit-interview">
                                    Edit Interview
                                </button>
                                {interview.status === 'completed' && (
                                    <button className="action-button view-feedback">
                                        View Feedback
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InterviewsPage; 