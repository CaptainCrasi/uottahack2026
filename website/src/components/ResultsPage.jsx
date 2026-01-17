import React, { useState, useEffect } from 'react';
import Header from './Header';
import AuthModal from './AuthModal';
import HistorySidebar from './HistorySidebar';
import { supabase } from '../supabase';
import { useLocation } from 'react-router-dom';
import '../App.css';
import { useAuth } from '../contexts/AuthContext';

const ResultSlice = ({ title, text, onAdd }) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '1rem',
        width: '100%',
        marginBottom: '0.8rem',
        transition: 'transform 0.2s ease, background 0.2s ease',
        cursor: 'pointer'
    }}
        className="result-slice"
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
        }}
    >
        <h3 style={{ margin: '0 0 0.3rem 0', color: '#ececf1', fontSize: '1rem' }}>{title}</h3>
        <p style={{ margin: '0 0 0.8rem 0', color: '#9da3ae', fontSize: '0.9rem' }}>{text}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{
                background: 'rgba(4, 141, 123, 0.2)',
                border: '1px solid rgba(4, 141, 123, 0.5)',
                color: '#048d7b',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
            }}
                onClick={(e) => {
                    e.stopPropagation();
                    console.log("Analyze clicked for:", title);
                }}
            >
                Analyze
            </button>
            <button style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#c5c5d2',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s'
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#c5c5d2';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd(title, text);
                }}
            >
                + Add to Project
            </button>
        </div>
    </div>
);

function ResultsPage() {
    const [user, setUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [modalMode, setModalMode] = useState('login');

    // History State
    const [projects, setProjects] = useState([]);
    const [savedComments, setSavedComments] = useState([]);

    const location = useLocation();
    const projectId = location.state?.projectId;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

    // Fetch projects from Supabase (Duplicated from App.jsx)
    const fetchProjects = async () => {
        if (!user) return;
        try {
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            const { data: commentsData, error: commentsError } = await supabase
                .from('saved_comments')
                .select('*');

            if (commentsError) throw commentsError;
            setSavedComments(commentsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch when user changes
    useEffect(() => {
        if (user) {
            fetchProjects();
        } else {
            setProjects([]);
            setSavedComments([]);
        }
    }, [user]);

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
    const handleAddToProject = async (title, text) => {
        if (!user) {
            setModalMode('signup');
            return;
        }

        if (!projectId) {
            alert("No active project found. Please start a search first.");
            return;
        }

        try {
            const { error } = await supabase.from('saved_comments').insert([
                {
                    user_id: user.id,
                    project_id: projectId,
                    comment_text: text,
                    source_url: 'Reddit', // Placeholder for now
                    author: 'Unknown'     // Placeholder for now
                }
            ]);

            if (error) throw error;
            alert(`Saved "${title}" to your project!`);
        } catch (error) {
            console.error('Error saving comment:', error);
            alert("Failed to save to project.");
        }
    };

    const handleAddToProject = async (title, text) => {
        if (!user) {
            setModalMode('signup');
            setIsModalOpen(true);
            return;
        }

        if (!projectId) {
            alert("No active project found. Please start a search first.");
            return;
        }

        try {
            const { error } = await supabase.from('saved_comments').insert([
                {
                    user_id: user.id,
                    project_id: projectId,
                    comment_text: text,
                    source_url: 'Reddit',
                    author: 'Unknown'
                }
            ]);

            if (error) throw error;

            // Refresh local list immediately
            fetchProjects();

            alert(`Saved "${title}" to your project!`);
        } catch (error) {
            console.error('Error saving comment:', error);
            alert("Failed to save to project.");
        }
    };

    if (!supabaseUrl || !supabaseKey) {
        return (
            <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <h1 style={{ color: '#ff4a4a' }}>Configuration Error</h1>
                <p>Environment files missing. Please check your .env file.</p>
            </div>
        );
    }

    const results = [
        { id: 1, title: "Market Gap Opportunity #1", text: "Analyzing subreddit discussions reveals a significant demand for automated social media scheduling tools specifically for artists." },
        { id: 2, title: "Market Gap Opportunity #2", text: "Users in r/smallbusiness are frequently complaining about the complexity of existing CRM solutions for solo entrepreneurs." },
        { id: 3, title: "Market Gap Opportunity #3", text: "There is a growing trend in r/productivity asking for a distraction-free writing app that integrates directly with WordPress." },
        { id: 4, title: "Market Gap Opportunity #4", text: "Gamers in r/pcgaming are looking for a unified launcher that is lightweight and open-source, as current options are bloated." },
        { id: 5, title: "Market Gap Opportunity #5", text: "Review of r/homeautomation suggests a gap for a privacy-focused, offline-first voice assistant for smart home control." },
    ];

    return (
        /* Container has background and handles overflow logic */
        <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>

            {/* Header is Fixed/Absolute outside scroll view so it stays put */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 10 }}>
                <Header
                    user={user}
                    onLoginClick={handleLoginClick}
                    onSignupClick={handleSignupClick}
                    onLogoutClick={handleLogout}
                    onHistoryClick={() => setIsHistoryOpen(true)}
                />
            </div>

            {/* Content Wrapper handles scrolling */}
            <div style={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overscrollBehavior: 'none',
                paddingTop: '120px', /* Push content down to start below Header */
                boxSizing: 'border-box',
                paddingBottom: '20px'
            }}>
                <main className="main-content" style={{
                    justifyContent: 'flex-start',
                    minHeight: 'auto',
                    gap: '0.5rem',
                    flex: '0 0 auto',
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '0 1rem'
                }}>
                    <h1 className="hero-text" style={{ marginBottom: '0.25rem', marginTop: '1rem' }}>Market Audience</h1>

                    <div className="results-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {results.map(result => (
                            <ResultSlice key={result.id} title={result.title} text={result.text} onAdd={handleAddToProject} />
                        ))}
                    </div>

                </main>

                <footer className="footer-disclaimer" style={{ marginTop: '1rem', paddingBottom: '1rem', textAlign: 'center', flexShrink: 0 }}>
                    Powered by Yellowcake Reddit Scanning Technology.
                    <br />
                    By matching, you agree to our <a href="#">Terms</a>.
                </footer>
            </div>

            <AuthModal
                isOpen={isModalOpen}
                onClose={closeModal}
                initialMode={modalMode}
            />

            <HistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                historyItems={projects}
                savedComments={savedComments}
            />
        </div>
    );
}

export default ResultsPage;
