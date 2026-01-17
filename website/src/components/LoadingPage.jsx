import React from 'react';
import Header from './Header';
import textLogo from '../assets/marketsnipe_text_logo.png';
import '../App.css';

// Simple loading spinner styled component (or inline styles for simplicity)
const Spinner = () => (
    <div className="spinner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTop: '3px solid #048d7b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#8e8ea0', fontSize: '0.9rem', animation: 'pulse 1.5s ease-in-out infinite' }}>Loading...</p>
    </div>
);

const LoadingPage = () => {
    // Basic static header for loading state
    return (
        <div className="app-container">
            <Header />

            <main className="main-content">
                <h1 className="hero-text">Audience Discovery</h1>

                <div className="by-line">
                    <span style={{ color: '#048d7b', marginRight: '8px', fontSize: '1rem', fontWeight: 500 }}>by</span>
                    <img src={textLogo} alt="MarketSnipe" style={{ height: '24px', verticalAlign: 'middle', filter: 'brightness(0.9)' }} />
                </div>

                <div className="loading-wrapper" style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner />
                </div>
            </main>

            <footer className="footer-disclaimer">
                Powered by Yellowcake Reddit Scanning Technology.
                <br />
                By matching, you agree to our <a href="#">Terms</a>.
            </footer>
        </div>
    );
};

export default LoadingPage;
