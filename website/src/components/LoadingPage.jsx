import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import AuthModal from './AuthModal';
import { supabase } from '../supabase';
import textLogo from '../assets/marketsnipe_text_logo.png';
import '../App.css';

const Spinner = ({ message }) => (
    <div className="spinner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #048d7b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#8e8ea0', fontSize: '1rem', animation: 'pulse 1.5s ease-in-out infinite', marginTop: '10px' }}>
            {message}
        </p>
    </div>
);

function LoadingPage() {
    const [user, setUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('login');
    const [statusMessage, setStatusMessage] = useState('Generating Reddit scrape prompt...');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const generatePrompt = async () => {
            const inputText = location.state?.inputText;
            
            if (!inputText) {
                navigate('/');
                return;
            }

            try {
                setStatusMessage('Generating Reddit scrape prompt...');
                
                const { data, error } = await supabase.functions.invoke('generate-keywords', {
                    body: { input: inputText }
                });

                if (error) throw error;

                if (data && data.prompt) {
                    setGeneratedPrompt(data.prompt);
                    setStatusMessage('Searching the web with YellowCake...');
                    
                    // Wait a bit before redirecting to results
                    setTimeout(() => {
                        navigate('/results', { state: { prompt: data.prompt, inputText } });
                    }, 2000);
                } else {
                    setStatusMessage('Error: No prompt generated');
                    setTimeout(() => navigate('/'), 3000);
                }
            } catch (err) {
                console.error('Error generating keywords:', err);
                setStatusMessage('Error: ' + err.message);
                setTimeout(() => navigate('/'), 3000);
            }
        };

        generatePrompt();
    }, [navigate, location.state]);

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

    // We keep the env check for consistency
    if (!supabaseUrl || !supabaseKey) {
        return (
            <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <h1 style={{ color: '#ff4a4a' }}>Configuration Error</h1>
                <p>Environment files missing. Please check your .env file.</p>
                <p style={{ fontSize: '0.9rem', color: '#888' }}>Required: VITE_SUPABASE_URL, VITE_SUPABASE_KEY</p>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header
                user={user}
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
                onLogoutClick={handleLogout}
            />

            <main className="main-content">
                <h1 className="hero-text">Audience Discovery</h1>

                <div className="by-line">
                    <span style={{ color: '#048d7b', marginRight: '8px', fontSize: '1rem', fontWeight: 500 }}>by</span>
                    <img src={textLogo} alt="MarketSnipe" style={{ height: '24px', verticalAlign: 'middle', filter: 'brightness(0.9)' }} />
                </div>

                <Spinner message={statusMessage} />

                {generatedPrompt && (
                    <div style={{ maxWidth: '800px', margin: '20px auto', backgroundColor: '#444654', padding: '20px', borderRadius: '8px', textAlign: 'left' }}>
                        <h3 style={{ marginTop: 0, color: '#fff' }}>Generated Prompt:</h3>
                        <p style={{ color: '#e5e5f0', lineHeight: 1.6 }}>{generatedPrompt}</p>
                    </div>
                )}

            </main>

            <footer className="footer-disclaimer">
                Powered by Yellowcake Reddit Scanning Technology.
                <br />
                By matching, you agree to our <a href="#">Terms</a>.
            </footer>

            <AuthModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialMode={modalMode}
            />
        </div>
    );
}

export default LoadingPage;
