import React, { useState } from 'react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const Explore = () => {
    const { user, handleLoginClick, handleSignupClick, handleLogout } = useAuth();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    return (
        <div className="app-container">
            <Header
                user={user}
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
                onLogoutClick={handleLogout}
                onHistoryClick={() => setIsHistoryOpen(true)}
            />

            <main className="main-content">
                <h1 className="hero-text">Explore Market Gaps</h1>
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
                    <p>This is the new Explore page. Content coming soon.</p>
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

export default Explore;
