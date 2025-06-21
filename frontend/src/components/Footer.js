import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="app-footer">
      <p>&copy; {new Date().getFullYear()} AI Résumé Sorter. All rights reserved.</p>
    </footer>
  );
}

export default Footer; 