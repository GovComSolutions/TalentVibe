import React, { useState, useEffect } from 'react';
import './InterviewModal.css';

const InterviewModal = ({ isOpen, onClose, resume, jobId, onInterviewCreated }) => {
    const [activeTab, setActiveTab] = useState('schedule');
    const [formData, setFormData] = useState({
        title: '',
        interview_type: 'video',
        duration_minutes: 60,
        scheduled_at: '',
        timezone: 'UTC',
        location: '',
        video_link: '',
        primary_interviewer: '',
        additional_interviewers: [],
        pre_interview_notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (resume && isOpen) {
            setFormData(prev => ({
                ...prev,
                title: `Interview with ${resume.candidate_name || resume.filename}`,
                scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
            }));
        }
    }, [resume, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/interviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    resume_id: resume.id,
                    additional_interviewers: formData.additional_interviewers.filter(i => i.trim())
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create interview');
            }

            const result = await response.json();
            onInterviewCreated(result.interview_id);
            onClose();
        } catch (error) {
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addInterviewer = () => {
        setFormData(prev => ({
            ...prev,
            additional_interviewers: [...prev.additional_interviewers, '']
        }));
    };

    const removeInterviewer = (index) => {
        setFormData(prev => ({
            ...prev,
            additional_interviewers: prev.additional_interviewers.filter((_, i) => i !== index)
        }));
    };

    const updateInterviewer = (index, value) => {
        setFormData(prev => ({
            ...prev,
            additional_interviewers: prev.additional_interviewers.map((interviewer, i) => 
                i === index ? value : interviewer
            )
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="interview-modal-overlay">
            <div className="interview-modal">
                <div className="interview-modal-header">
                    <h3>Interview Management - {resume?.candidate_name || resume?.filename}</h3>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="interview-modal-content">
                    <div className="tab-navigation">
                        <button 
                            className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
                            onClick={() => setActiveTab('schedule')}
                        >
                            📅 Schedule Interview
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('questions')}
                        >
                            ❓ Questions to Ask
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
                            onClick={() => setActiveTab('feedback')}
                        >
                            📝 Feedback After Interview
                        </button>
                    </div>

                    {activeTab === 'schedule' && (
                        <form onSubmit={handleSubmit} className="interview-form">
                            <div className="form-group">
                                <label>Interview Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g., Technical Interview with John Doe"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Interview Type *</label>
                                    <select
                                        name="interview_type"
                                        value={formData.interview_type}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="phone">Phone</option>
                                        <option value="video">Video</option>
                                        <option value="onsite">Onsite</option>
                                        <option value="technical">Technical</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Duration (minutes)</label>
                                    <select
                                        name="duration_minutes"
                                        value={formData.duration_minutes}
                                        onChange={handleInputChange}
                                    >
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        name="scheduled_at"
                                        value={formData.scheduled_at}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Timezone</label>
                                    <select
                                        name="timezone"
                                        value={formData.timezone}
                                        onChange={handleInputChange}
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">Eastern Time</option>
                                        <option value="America/Chicago">Central Time</option>
                                        <option value="America/Denver">Mountain Time</option>
                                        <option value="America/Los_Angeles">Pacific Time</option>
                                    </select>
                                </div>
                            </div>

                            {formData.interview_type === 'onsite' && (
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Office Building, Floor 3, Room 301"
                                    />
                                </div>
                            )}

                            {formData.interview_type === 'video' && (
                                <div className="form-group">
                                    <label>Video Link</label>
                                    <input
                                        type="url"
                                        name="video_link"
                                        value={formData.video_link}
                                        onChange={handleInputChange}
                                        placeholder="e.g., https://zoom.us/j/123456789"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Primary Interviewer</label>
                                <input
                                    type="text"
                                    name="primary_interviewer"
                                    value={formData.primary_interviewer}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Sarah Johnson"
                                />
                            </div>

                            <div className="form-group">
                                <label>Additional Interviewers</label>
                                {formData.additional_interviewers.map((interviewer, index) => (
                                    <div key={index} className="interviewer-input">
                                        <input
                                            type="text"
                                            value={interviewer}
                                            onChange={(e) => updateInterviewer(index, e.target.value)}
                                            placeholder="Interviewer name"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeInterviewer(index)}
                                            className="remove-button"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addInterviewer}
                                    className="add-button"
                                >
                                    + Add Interviewer
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Pre-Interview Notes</label>
                                <textarea
                                    name="pre_interview_notes"
                                    value={formData.pre_interview_notes}
                                    onChange={handleInputChange}
                                    placeholder="Any notes or context for the interviewer..."
                                    rows={4}
                                />
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <div className="form-actions">
                                <button type="button" onClick={onClose} className="cancel-button">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-button" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Schedule Interview'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'questions' && (
                        <div className="questions-tab">
                            <h4>Interview Questions</h4>
                            <p>This feature will allow you to create and manage interview questions for this candidate.</p>
                            <div className="coming-soon">
                                <span>🚧 Coming Soon</span>
                                <p>Question management will be available in the next update.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'feedback' && (
                        <div className="feedback-tab">
                            <h4>Interview Feedback</h4>
                            <p>This feature will allow you to provide structured feedback after the interview.</p>
                            <div className="coming-soon">
                                <span>🚧 Coming Soon</span>
                                <p>Feedback forms will be available in the next update.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewModal;
