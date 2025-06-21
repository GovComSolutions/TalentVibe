import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import './JobsPage.css';

const SkillMatrix = ({ skills }) => (
    <div className="skill-matrix">
        <div className="skill-column matches">
            <h4>✅ Matches ({skills.matches?.length || 0})</h4>
            <ul>
                {skills.matches?.map((skill, i) => <li key={`match-${i}`}>{skill}</li>)}
            </ul>
        </div>
        <div className="skill-column gaps">
            <h4>🚫 Gaps ({skills.gaps?.length || 0})</h4>
            <ul>
                {skills.gaps?.map((skill, i) => <li key={`gap-${i}`}>{skill}</li>)}
            </ul>
        </div>
    </div>
);

const Timeline = ({ timeline }) => (
    <div className="timeline">
        <h4>Timeline & Impact</h4>
        <ul>
            {timeline?.map((item, i) => (
                <li key={`timeline-${i}`}>
                    <strong>{item.period}:</strong> {item.role} - <em>{item.details}</em>
                </li>
            ))}
        </ul>
    </div>
);

const Logistics = ({ logistics }) => (
    <div className="logistics">
        <h4>Comp & Logistics</h4>
        <ul>
            <li><strong>Desired Comp:</strong> {logistics?.compensation || 'N/A'}</li>
            <li><strong>Notice Period:</strong> {logistics?.notice_period || 'N/A'}</li>
            <li><strong>Work Auth:</strong> {logistics?.work_authorization || 'N/A'}</li>
            <li><strong>Location:</strong> {logistics?.location || 'N/A'}</li>
        </ul>
    </div>
);

const JobDetailsPage = () => {
    const { jobId } = useParams();
    const [jobDetails, setJobDetails] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:5000/api/jobs/${jobId}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setJobDetails(data);
            } catch (error) {
                setError(error.message);
                console.error(`Failed to fetch job details for job ${jobId}:`, error);
            } finally {
                setIsLoading(false);
            }
        };
        if (jobId) fetchJobDetails();
    }, [jobId]);

    const sortedResumes = useMemo(() => {
        if (!jobDetails?.resumes) return [];
        return [...jobDetails.resumes].sort((a, b) => (b.analysis?.fit_score || 0) - (a.analysis?.fit_score || 0));
    }, [jobDetails]);

    const getScoreClass = (score) => {
        if (score >= 90) return 'high';
        if (score >= 80) return 'medium-high';
        if (score >= 65) return 'medium';
        return 'low';
    };

    if (isLoading) return <div className="job-details-container"><p>Loading job details...</p></div>;
    if (error) return <div className="job-details-container message error">Error: {error}</div>;
    if (!jobDetails) return <div className="job-details-container"><p>Job not found.</p></div>;

    return (
        <div className="job-details-container">
            <Link to="/jobs" className="back-link">← Back to All Jobs</Link>
            
            <div className="glass-container job-summary-card">
                <h2>{jobDetails.description.split('\\n')[0]} - Candidate Overview</h2>
                <div className="candidate-summary-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Candidate</th>
                                <th>Fit Score</th>
                                <th>Bucket</th>
                                <th>Key Skill Hits</th>
                                <th>Gaps / Flags</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedResumes.map((resume, index) => (
                                <tr key={resume.id}>
                                    <td><strong>{index + 1}</strong></td>
                                    <td>{resume.filename}</td>
                                    <td>
                                        <span className={`score-badge ${getScoreClass(resume.analysis?.fit_score)}`}>
                                            {resume.analysis?.fit_score || 'N/A'}
                                        </span>
                                    </td>
                                    <td>{resume.analysis?.bucket || 'N/A'}</td>
                                    <td>{resume.analysis?.skill_matrix?.matches?.join(', ') || 'N/A'}</td>
                                    <td>{resume.analysis?.skill_matrix?.gaps?.join(', ') || 'None'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="detailed-resumes-list">
                <h3>Detailed Analysis</h3>
                {sortedResumes.map(resume => {
                    const analysis = resume.analysis || {};
                    return (
                        <div key={resume.id} className="glass-container detailed-resume-card">
                             <div className="detailed-resume-header">
                                <h3>{analysis.bucket || 'Analysis Pending'}</h3>
                                <span className={`score-badge large ${getScoreClass(analysis.fit_score)}`}>
                                    FIT SCORE: {analysis.fit_score || 'N/A'} / 100
                                </span>
                            </div>

                            <p className="reasoning">{analysis.reasoning}</p>

                            <div className="summary-points">
                                <h4>Summary</h4>
                                <ul>
                                    {analysis.summary_points?.map((point, i) => <li key={`sum-${i}`}>{point}</li>)}
                                </ul>
                            </div>
                            
                            {analysis.skill_matrix && <SkillMatrix skills={analysis.skill_matrix} />}
                            {analysis.timeline && <Timeline timeline={analysis.timeline} />}
                            {analysis.logistics && <Logistics logistics={analysis.logistics} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default JobDetailsPage; 