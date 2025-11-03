import React, { useState } from 'react';

const Navigation = ({ onNavigate, currentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo/Brand */}
        <div className="nav-brand">
          <span className="brand-text">CTI Dashboard</span>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-links desktop-nav">
          <button 
            onClick={() => handleNavigation('dashboard')} 
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => handleNavigation('threat-intelligence')} 
            className={`nav-link ${currentPage === 'threat-intelligence' ? 'active' : ''}`}
          >
            AI Threat Intelligence
          </button>
          <button 
            onClick={() => handleNavigation('analytics')} 
            className={`nav-link ${currentPage === 'analytics' ? 'active' : ''}`}
          >
            Analytics
          </button>
          <button 
            onClick={() => handleNavigation('reports')} 
            className={`nav-link ${currentPage === 'reports' ? 'active' : ''}`}
          >
            Reports
          </button>
          <button 
            onClick={() => handleNavigation('about')} 
            className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
          >
            About Us
          </button>
          <button 
            onClick={() => handleNavigation('contact')} 
            className={`nav-link ${currentPage === 'contact' ? 'active' : ''}`}
          >
            Contact
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger"></span>
          <span className="hamburger"></span>
          <span className="hamburger"></span>
        </button>

        {/* Mobile Navigation */}
        <div className={`nav-links mobile-nav ${isMenuOpen ? 'open' : ''}`}>
          <button 
            onClick={() => handleNavigation('dashboard')} 
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => handleNavigation('threat-intelligence')} 
            className={`nav-link ${currentPage === 'threat-intelligence' ? 'active' : ''}`}
          >
            AI Threat Intelligence
          </button>
          <button 
            onClick={() => handleNavigation('analytics')} 
            className={`nav-link ${currentPage === 'analytics' ? 'active' : ''}`}
          >
            Analytics
          </button>
          <button 
            onClick={() => handleNavigation('reports')} 
            className={`nav-link ${currentPage === 'reports' ? 'active' : ''}`}
          >
            Reports
          </button>
          <button 
            onClick={() => handleNavigation('about')} 
            className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
          >
            About Us
          </button>
          <button 
            onClick={() => handleNavigation('contact')} 
            className={`nav-link ${currentPage === 'contact' ? 'active' : ''}`}
          >
            Contact
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;



