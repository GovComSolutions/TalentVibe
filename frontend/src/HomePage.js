import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="homepage-container">
      <div className="glass-container homepage-content">
        <h1 className="homepage-title">
          Hire Smarter, Not Harder.
        </h1>
        <p className="homepage-subtitle">
          Welcome to <strong>TalentVibe</strong>. Our AI-powered platform intelligently analyzes and ranks résumés based on your job descriptions, helping you find the perfect candidate in record time.
        </p>
        <Link to="/upload" className="cta-button">
          Get Started Now
        </Link>
      </div>
    </div>
  );
}

export default HomePage; 