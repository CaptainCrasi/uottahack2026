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
                        <button className="btn-secondary" onClick={onHistoryClick} style={{ color: '#048d7b', fontSize: '0.9rem', letterSpacing: '1px' }}>
                            [ PROJECTS ]
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#c5c5d2' }}>{user.email}</span>
                        <button className="btn-secondary" onClick={onLogoutClick}>Log out</button>
                    </div>
                ) : (
                    <button className="btn-primary btn-large" onClick={onSignupClick}>Get started</button>
                )}
            </div>
        </header>
    );
};

export default Header;
