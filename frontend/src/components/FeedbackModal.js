import React, { useState } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, resume, onSubmitFeedback, onSubmitOverride }) => {
  const [feedbackType, setFeedbackType] = useState('correction');
  const [feedbackText, setFeedbackText] = useState('');
  const [suggestedBucket, setSuggestedBucket] = useState('');
  const [newBucket, setNewBucket] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bucketOptions = ['Fast Track', 'Review', 'Reject'];

  const handleSubmitFeedback = async () => {
    if (!resume || !resume.analysis) return;

    setIsSubmitting(true);
    try {
      const feedbackData = {
        resume_id: resume.id,
        original_bucket: resume.analysis.bucket,
        feedback_type: feedbackType,
        feedback_text: feedbackText,
        suggested_bucket: suggestedBucket || null
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.ok) {
        onSubmitFeedback && onSubmitFeedback();
        onClose();
        setFeedbackText('');
        setSuggestedBucket('');
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOverride = async () => {
    if (!resume || !resume.analysis || !newBucket) return;

    setIsSubmitting(true);
    try {
      const overrideData = {
        resume_id: resume.id,
        original_bucket: resume.analysis.bucket,
        new_bucket: newBucket,
        reason: overrideReason
      };

      const response = await fetch('/api/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(overrideData),
      });

      if (response.ok) {
        onSubmitOverride && onSubmitOverride(newBucket);
        onClose();
        setNewBucket('');
        setOverrideReason('');
      } else {
        console.error('Failed to submit override');
      }
    } catch (error) {
      console.error('Error submitting override:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !resume) return null;

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h3>Feedback for {resume.candidate_name || resume.filename}</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="feedback-modal-content">
          <div className="current-analysis">
            <h4>Current Analysis</h4>
            <p><strong>Bucket:</strong> {resume.analysis?.bucket || 'Unknown'}</p>
            <p><strong>Confidence:</strong> {resume.analysis?.confidence || 'N/A'}</p>
            <p><strong>Reasoning:</strong> {resume.analysis?.reasoning || 'No reasoning provided'}</p>
          </div>

          <div className="feedback-tabs">
            <button 
              className={`tab-button ${feedbackType === 'correction' ? 'active' : ''}`}
              onClick={() => setFeedbackType('correction')}
            >
              Provide Feedback
            </button>
            <button 
              className={`tab-button ${feedbackType === 'override' ? 'active' : ''}`}
              onClick={() => setFeedbackType('override')}
            >
              Override Bucket
            </button>
          </div>

          {feedbackType === 'correction' && (
            <div className="feedback-form">
              <div className="form-group">
                <label>Feedback Type:</label>
                <select 
                  value={feedbackType} 
                  onChange={(e) => setFeedbackType(e.target.value)}
                >
                  <option value="correction">Correction</option>
                  <option value="improvement">Improvement Suggestion</option>
                  <option value="general">General Feedback</option>
                </select>
              </div>

              <div className="form-group">
                <label>Suggested Bucket (Optional):</label>
                <select 
                  value={suggestedBucket} 
                  onChange={(e) => setSuggestedBucket(e.target.value)}
                >
                  <option value="">Select a bucket</option>
                  {bucketOptions.map(bucket => (
                    <option key={bucket} value={bucket}>{bucket}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Feedback Details:</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Please provide detailed feedback about this categorization..."
                  rows="4"
                />
              </div>

              <button 
                className="submit-button"
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          )}

          {feedbackType === 'override' && (
            <div className="override-form">
              <div className="form-group">
                <label>New Bucket Assignment:</label>
                <select 
                  value={newBucket} 
                  onChange={(e) => setNewBucket(e.target.value)}
                  required
                >
                  <option value="">Select a new bucket</option>
                  {bucketOptions.map(bucket => (
                    <option key={bucket} value={bucket}>{bucket}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Reason for Override:</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Please explain why you're changing this bucket assignment..."
                  rows="3"
                />
              </div>

              <button 
                className="submit-button override"
                onClick={handleSubmitOverride}
                disabled={isSubmitting || !newBucket}
              >
                {isSubmitting ? 'Submitting...' : 'Override Bucket'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal; 