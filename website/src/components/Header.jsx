import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Header.css';

const Header = ({ user, onLoginClick, onSignupClick, onLogoutClick, onHistoryClick }) => {
    const navigate = useNavigate();

    return (
        <header className="app-header">
            <div className="header-left">
                <img
                    src={logo}
                    alt="MarketSnipe Icon"
                    className="app-logo"
                    onClick={() => navigate('/')}
                    style={{ cursor: 'pointer' }}
                />
            </div>

            {/* Center text logo was removed previously */}

            <div className="header-right">
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button className="btn-projects" onClick={onHistoryClick}>
                            PROJECTS
                        </button>
                        <div className="user-profile">
                            <div className="user-avatar">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="user-name">{user.email?.split('@')[0]}</span>
                        </div>
                        <button className="btn-logout" onClick={onLogoutClick} title="Sign out">
                            <span className="btn-text">Log out</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <button className="btn-primary btn-large" onClick={onSignupClick}>Get started</button>
                )}
            </div>
        </header>
    );
};

export default Header;
