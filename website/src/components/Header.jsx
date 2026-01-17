import React from 'react';
import logo from '../assets/logo.png';
import './Header.css';

const Header = ({ user, onLoginClick, onSignupClick, onLogoutClick, onHistoryClick }) => {
    return (
        <header className="app-header">
            <div className="header-left">
                <img src={logo} alt="MarketSnipe Icon" className="app-logo" />
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
                        <button className="btn-logout" onClick={onLogoutClick}>Log out</button>
                    </div>
                ) : (
                    <button className="btn-primary btn-large" onClick={onSignupClick}>Get started</button>
                )}
            </div>
        </header>
    );
};

export default Header;
