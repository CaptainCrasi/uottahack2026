import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import AuthModal from './AuthModal';
import './Header.css';

const Header = () => {
    const [user, setUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('login');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLoginClick = () => {
        setModalMode('login');
        setIsModalOpen(true);
    };

    const handleSignupClick = () => {
        setModalMode('signup');
        setIsModalOpen(true);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <header className="app-header">
            <div className="header-left">
                <span className="logo-text">ChatGPT</span>
                <span className="chevron-down">
                    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.34315 7.75732L4.92893 9.17154L12 16.2426L19.0711 9.17157L17.6569 7.75735L12 13.4142L6.34315 7.75732Z" fill="currentColor" /></svg>
                </span>
            </div>

            <div className="header-right">
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#c5c5d2' }}>{user.email}</span>
                        <button className="btn-secondary" onClick={handleLogout}>Log out</button>
                    </div>
                ) : (
                    <>
                        <button className="btn-secondary" onClick={handleLoginClick}>Log in</button>
                        <button className="btn-primary" onClick={handleSignupClick}>Sign up for free</button>
                    </>
                )}
            </div>
            
            <AuthModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialMode={modalMode}
            />
        </header>
    );
};

export default Header;
