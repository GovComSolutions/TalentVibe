import React, { useState } from 'react';
import './UploadPage.css';

function UploadPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumes, setResumes] = useState([]);

  const handleSubmit = (event) => {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    for (let i = 0; i < resumes.length; i++) {
      formData.append('resumes', resumes[i]);
    }

    fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        console.log('Success:', data);
        alert(`Success: ${data.message}`);
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. See console for details.');
      });
  };

  return (
    <div className="upload-container">
      <h1>Upload Job and Résumés</h1>
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="job-description">Job Description</label>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="resume-upload">Upload Résumés</label>
          <input
            id="resume-upload"
            type="file"
            multiple
            onChange={(e) => setResumes(e.target.files)}
            accept=".pdf,.doc,.docx"
            required
          />
        </div>
        <button type="submit" className="submit-btn">Analyze Résumés</button>
      </form>
    </div>
  );
}

export default UploadPage; 