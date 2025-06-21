import React from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="header-content">
                <NavLink to="/" className="header-logo">
                    <h2>TalentVibe</h2>
                </NavLink>
                <nav className="header-nav">
                    <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Home</NavLink>
                    <NavLink to="/upload" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Upload</NavLink>
                    <NavLink to="/jobs" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Jobs</NavLink>
                    <NavLink to="/interviews" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Interviews</NavLink>
                </nav>
            </div>
        </header>
    );
};

export default Header; 