import React from 'react';
import './Header.css';

const Header = () => {
    return (
        <header className="app-header">
            <div className="header-left">
                <span className="logo-text">ChatGPT</span>
                <span className="chevron-down">
                    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.34315 7.75732L4.92893 9.17154L12 16.2426L19.0711 9.17157L17.6569 7.75735L12 13.4142L6.34315 7.75732Z" fill="currentColor" /></svg>
                </span>
            </div>

            <div className="header-right">
                <button className="btn-secondary">Log in</button>
                <button className="btn-primary">Sign up for free</button>
            </div>
        </header>
    );
};

export default Header;
