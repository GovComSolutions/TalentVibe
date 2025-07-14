import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../logo.svg';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/upload', label: 'Upload' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/interviews', label: 'Interviews' },
];

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Close menu on navigation
  const handleNavClick = () => setMenuOpen(false);

  // Overlay click: close menu and go home
  const handleOverlayClick = () => {
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <NavLink to="/" className="header-logo">
          <div className="header-logo-group">
            <img src={logo} alt="TalentVibe Logo" className="tv-logo-icon" />
            <div className="tv-logo-text-group">
              <span className="tv-logo-text-gradient">TalentVibe</span>
              <div className="tv-logo-underline" />
            </div>
          </div>
        </NavLink>
        <div className="header-right">
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="bar top" />
            <span className="bar middle" />
            <span className="bar bottom" />
          </button>
        </div>
      </div>
      <div
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? ' open' : ''}`}
        tabIndex={-1}
        aria-hidden={!menuOpen}
      >
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            onClick={handleNavClick}
          >
            {label}
          </NavLink>
        ))}
      </div>
      {/* Overlay for mobile menu */}
      {menuOpen && <div className="menu-overlay" onClick={handleOverlayClick} tabIndex={-1} aria-hidden="true" />}
    </header>
  );
};

export default Header; 