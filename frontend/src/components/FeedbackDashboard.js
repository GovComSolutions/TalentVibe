import React, { useState, useEffect } from 'react';
import './FeedbackDashboard.css';

const FeedbackDashboard = () => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFeedbackStats();
    }, []);

    const fetchFeedbackStats = async () => {
        try {
            const response = await fetch('/api/feedback/stats');
            if (!response.ok) throw new Error('Failed to fetch feedback stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching feedback stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="feedback-dashboard">Loading feedback statistics...</div>;
    if (error) return <div className="feedback-dashboard error">Error: {error}</div>;
    if (!stats) return <div className="feedback-dashboard">No feedback data available</div>;

    return (
        <div className="feedback-dashboard">
            <h3>Feedback Analytics</h3>
            
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{stats.total_feedback}</div>
                    <div className="stat-label">Total Feedback</div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-number">{stats.total_overrides}</div>
                    <div className="stat-label">Bucket Overrides</div>
                </div>
            </div>

            {stats.feedback_by_type && Object.keys(stats.feedback_by_type).length > 0 && (
                <div className="feedback-breakdown">
                    <h4>Feedback by Type</h4>
                    <div className="feedback-types">
                        {Object.entries(stats.feedback_by_type).map(([type, count]) => (
                            <div key={type} className="feedback-type-item">
                                <span className="type-name">{type}</span>
                                <span className="type-count">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats.common_overrides && Object.keys(stats.common_overrides).length > 0 && (
                <div className="override-breakdown">
                    <h4>Most Overridden Buckets</h4>
                    <div className="override-list">
                        {Object.entries(stats.common_overrides).map(([bucket, count]) => (
                            <div key={bucket} className="override-item">
                                <span className="bucket-name">{bucket}</span>
                                <span className="override-count">{count} overrides</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackDashboard; 