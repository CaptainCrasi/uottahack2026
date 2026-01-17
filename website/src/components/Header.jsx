import React from 'react';
import logo from '../assets/logo.png';
import './Header.css';

const Header = () => {
    return (
        <header className="app-header">
            <div className="header-left">
                <img src={logo} alt="MarketSnipe Logo" className="app-logo" />
                <span className="logo-text">MarketSnipe</span>
            </div>

            <div className="header-right">
                <button className="btn-secondary">Log in</button>
                <button className="btn-primary">Sign up for free</button>
            </div>
        </header>
    );
};

export default Header;
