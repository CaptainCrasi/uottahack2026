import React, { useState } from 'react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const Explore = () => {
    const { user, handleLoginClick, handleSignupClick, handleLogout } = useAuth();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Feature States
    const [hasExplored, setHasExplored] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Initializing search...');
    const [visiblePosts, setVisiblePosts] = useState([]);

    const posts = [
        {
            id: 1,
            title: "EVERY business asking for a review, so annoying!",
            subreddit: "r/mildlyinfuriating",
            date: "4 days ago",
            upvotes: "14.2k",
            frustration: "The user complains that every single interaction—from a haircut to a pest control visit—now triggers a follow-up text or email begging for a 5-star review. It’s creating \"notification fatigue\" and resentment toward the brands.",
            opportunity: "Feedback Firewall: A privacy tool that automatically intercepts these specific \"Rate Your Visit\" automated texts and emails."
        },
        {
            id: 2,
            title: "DAE also live imaginary lives in their heads? Is it unhealthy?",
            subreddit: "r/DoesAnybodyElse",
            date: "24 hours ago",
            upvotes: "3.8k",
            frustration: "Users discuss \"Maladaptive Daydreaming\"—getting so lost in an idealized fantasy version of their life that they neglect their actual reality, leading to depression and boredom with real life.",
            opportunity: "Real-Life RPG: An app that strictly mimics the UI of a fantasy RPG but maps them 1:1 to the mundane tasks they are avoiding."
        },
        {
            id: 3,
            title: "My friend can't walk normally around people, and it pisses me off",
            subreddit: "r/mildlyinfuriating",
            date: "8 hours ago",
            upvotes: "22.5k",
            frustration: "The user describes the agony of walking with someone who lacks \"proprioception\" (body awareness)—constantly cutting people off, stopping in doorways, or drifting into others.",
            opportunity: "The Polite Chime: A small device for urban walkers that emits a pleasant directional sound to alert oblivious people behind or in front of you."
        },
        {
            id: 4,
            title: "Everytime my parents ask me if I know something... they become really annoying",
            subreddit: "r/rant",
            date: "4 days ago",
            upvotes: "8.1k",
            frustration: "A conflict arises from the ambiguity of the question \"Do you know how to do X?\" The parent wants a binary \"Yes/No,\" but the user answers \"Kinda,\" causing friction.",
            opportunity: "SkillDex: A visual \"competency inventory\" app for households that gamifies learning practical life skills."
        },
        {
            id: 5,
            title: "Love the look of Joybird furniture, but not the quality. What to get instead?",
            subreddit: "r/BuyItForLife",
            date: "Active now",
            upvotes: "1.2k",
            frustration: "Users love the aesthetic of modern mid-century brands but hate that the cushions go flat and the fabric pills within a year. They feel trapped between \"ugly durable\" and \"pretty disposable.\"",
            opportunity: "CushionHacker: A service that sells industrial-grade foam upgrade kits pre-measured for popular Ikea/West Elm models."
        }
    ];

    const handleExploreClick = () => {
        setIsLoading(true);
        setHasExplored(true);
        setVisiblePosts([]);

        // Fake Loading Sequence
        const sequence = [
            { msg: "Scanning r/mildlyinfuriating...", time: 0 },
            { msg: "Scanning r/DoesAnybodyElse...", time: 800 },
            { msg: "Scanning r/BuyItForLife...", time: 1600 },
            { msg: "Identifying pain points...", time: 2400 },
            { msg: "Generating product opportunities...", time: 3200 },
        ];

        sequence.forEach(({ msg, time }) => {
            setTimeout(() => setLoadingMessage(msg), time);
        });

        // Finish loading and start revealing posts
        setTimeout(() => {
            setIsLoading(false);
            revealPosts();
        }, 4000);
    };

    const revealPosts = () => {
        posts.forEach((post, index) => {
            setTimeout(() => {
                setVisiblePosts(prev => [...prev, post]);
            }, index * 400); // Stagger by 400ms
        });
    };

    return (
        <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 10 }}>
                <Header
                    user={user}
                    onLoginClick={handleLoginClick}
                    onSignupClick={handleSignupClick}
                    onLogoutClick={handleLogout}
                    onHistoryClick={() => setIsHistoryOpen(true)}
                />
            </div>

            <div style={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                paddingTop: '100px',
                paddingBottom: '40px',
                boxSizing: 'border-box'
            }}>
                <main className="main-content" style={{
                    justifyContent: 'flex-start',
                    paddingTop: '1rem',
                    minHeight: 'auto',
                    margin: '0 auto'
                }}>
                    <h1 className="hero-text">Explore Market Gaps</h1>

                    {!hasExplored && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem', animation: 'fadeIn 0.8s ease-out' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '600px' }}>
                                Discover real problems people are complaining about right now on Reddit.
                            </p>
                            <button
                                className="wow-feature-btn"
                                onClick={handleExploreClick}
                                style={{
                                    fontSize: '1.2rem',
                                    padding: '1rem 2.5rem',
                                    boxShadow: '0 0 30px rgba(236, 72, 153, 0.3)'
                                }}
                            >
                                Explore Trending Topics
                            </button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="spinner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '4rem' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                border: '4px solid rgba(255, 255, 255, 0.1)',
                                borderTop: '4px solid #048d7b',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <p style={{ color: '#8e8ea0', fontSize: '1.1rem', animation: 'pulse 1.5s ease-in-out infinite' }}>
                                {loadingMessage}
                            </p>
                        </div>
                    )}

                    <div className="results-container" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                        {visiblePosts.map((post) => (
                            <div key={post.id} style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                animation: 'fadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                                backdropFilter: 'blur(10px)',
                                transformOrigin: 'top center'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#ff4500', fontWeight: 'bold' }}>●</span> {post.subreddit}
                                    </span>
                                    <span>{post.date} • {post.upvotes} upvotes</span>
                                </div>

                                <h3 style={{ margin: '0 0 1rem 0', color: '#ececf1', fontSize: '1.2rem', lineHeight: '1.4' }}>
                                    "{post.title}"
                                </h3>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.2rem' }}>
                                    <p style={{ margin: 0, color: '#9da3ae', fontSize: '0.95rem', fontStyle: 'italic' }}>
                                        <span style={{ color: '#777', fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>The Frustration</span>
                                        {post.frustration}
                                    </p>
                                </div>

                                <div style={{
                                    background: 'linear-gradient(90deg, rgba(4, 141, 123, 0.15) 0%, rgba(4, 141, 123, 0.05) 100%)',
                                    borderLeft: '4px solid #048d7b',
                                    padding: '1rem',
                                    borderRadius: '0 8px 8px 0'
                                }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#64d3c4', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Product Opportunity
                                    </h4>
                                    <p style={{ margin: 0, color: '#e5e5e5', fontSize: '1rem', fontWeight: 500 }}>
                                        {post.opportunity}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                <footer className="footer-disclaimer">
                    Powered by Yellowcake Reddit Scanning Technology.
                    <br />
                    By matching, you agree to our <a href="#">Terms</a>.
                </footer>
            </div>
        </div>
    );
};

export default Explore;
