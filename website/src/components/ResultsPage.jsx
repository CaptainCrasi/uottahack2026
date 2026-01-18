import React, { useState, useEffect } from 'react';
import Header from './Header';
import AuthModal from './AuthModal';
import { supabase } from '../supabase';
// import textLogo from '../assets/marketsnipe_text_logo.png'; // Not used in this version
import '../App.css';
import { useAuth } from '../contexts/AuthContext';

import { useNavigate, useLocation } from 'react-router-dom';

const ResultSlice = ({ title, postTitle, text, url, comments, score, date, isMostPopular }) => {
    const [expanded, setExpanded] = useState(false);

    // Estimate logical length (approx 7 lines). 
    // This is heuristic, assuming avg chars per line or just character count.
    const isLongText = text && text.length > 500;
    const displayText = expanded ? text : (isLongText ? text.slice(0, 500) + '...' : text);

    return (
        <div style={{
            background: '#18181b', // Solid dark background
            border: isMostPopular ? '1px solid #d946ef' : '1px solid rgba(255, 255, 255, 0.08)', // Distinct border for popular
            borderRadius: '12px',
            padding: '1rem',
            width: '100%',
            marginBottom: '0.8rem',
            transition: 'transform 0.2s ease, background 0.2s ease',
            cursor: 'default',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            boxShadow: isMostPopular ? '0 0 15px rgba(217, 70, 239, 0.1)' : 'none'
        }}
            className="result-slice"
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#27272a'; // Slightly lighter on hover
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = '#18181b';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Header Row: Subreddit & Source */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#048d7b', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {title.toUpperCase()}
                    </span>
                    {isMostPopular && (
                        <span style={{
                            background: 'rgba(217, 70, 239, 0.1)',
                            color: '#d946ef',
                            fontSize: '0.6rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(217, 70, 239, 0.3)'
                        }}>
                            Most Popular
                        </span>
                    )}
                </div>

                {url && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#ffffff',
                            backgroundColor: '#048d7b',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#037465';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#048d7b';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        Source
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                )}
            </div>

            {/* Post Title */}
            <h3 style={{
                margin: '0 0 0.5rem 0',
                color: '#ececf1',
                fontSize: '1.1rem',
                fontWeight: 700,
                lineHeight: '1.4'
            }}>
                {postTitle}
            </h3>

            {/* Body Text */}
            <div style={{
                color: '#9da3ae',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                marginBottom: '0.5rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {displayText}
                {/* Loading Indicator */}
                {String(text) === 'Loading preview...' && (
                    <div style={{
                        display: 'inline-block',
                        marginLeft: '8px',
                        width: '12px',
                        height: '12px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#048d7b',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                )}
            </div>

            {isLongText && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#048d7b',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '0',
                        marginBottom: '1rem',
                        fontWeight: 500,
                        alignSelf: 'flex-start',
                        textDecoration: 'underline'
                    }}
                >
                    {expanded ? 'Show Less' : 'Read More'}
                </button>
            )}

            {/* Metadata Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.5rem',
                paddingTop: '0.8rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.8rem',
                color: '#6e6e80',
            }}>
                {/* Left: Upvotes with Dynamic Color */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span title="Upvotes" style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: (parseInt(score) || 0) > 300 ? '#ff4a4a' : // Red
                            (parseInt(score) || 0) > 100 ? '#ffbf00' : // Orange
                                (parseInt(score) || 0) > 50 ? '#ffff00' : // Yellow
                                    '#00e676' // Green (0-50)
                    }}>
                        {score || 0} Upvotes {(parseInt(score) || 0) >= 300 && '🔥'}
                    </span>
                </div>

                {/* Right: Comments and Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span title="Comments" style={{ fontWeight: 600 }}>Comments:</span> {comments || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span title="Date" style={{ fontWeight: 600 }}>Date:</span> {date || 'Unknown'}
                    </span>
                </div>
            </div>
        </div>
    );
};

function ResultsPage() {
    const { user, isModalOpen, modalMode, handleLoginClick, handleSignupClick, handleLogout, closeModal, setModalMode } = useAuth();

    const location = useLocation();
    const projectId = location.state?.projectId;
    const scrapedResults = location.state?.results || [];
    const [cachedResults, setCachedResults] = useState(scrapedResults);
    const sessionLogs = location.state?.logs || [];

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

    // Log session logs when component mounts
    useEffect(() => {
        if (sessionLogs.length > 0) {
            console.log('=== LOADING PAGE SESSION LOGS ===');
            sessionLogs.forEach(log => {
                console.log(`[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`);
            });
            console.log('=== END LOADING PAGE LOGS ===');
        }
    }, [sessionLogs]);

    // Hydrate results with full Reddit data
    useEffect(() => {
        // Initialize cache if needed
        if (scrapedResults.length > 0) {
            setCachedResults(scrapedResults);
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('yellowcake_chunk_cache', JSON.stringify(scrapedResults));
            }
        } else if (typeof window !== 'undefined') {
            const stored = window.sessionStorage.getItem('yellowcake_chunk_cache');
            if (stored) {
                try {
                    setCachedResults(JSON.parse(stored));
                } catch (err) {
                    console.error('Failed to parse cached chunk data:', err);
                }
            }
        }

        // Fetch detailed data for each result
        const hydrateResults = async () => {
            // Only hydrate if we have results and they haven't been hydrated yet (avoid infinite loop or re-fetching)
            // We can check if a result needs hydration if it lacks 'hydrated' flag or specific fields
            // For now, let's just try to fetch for all that have a URL but missing detailed body/score

            // We need to work with the latest results source, which is either scrapedResults or cached
            const source = scrapedResults.length > 0 ? scrapedResults : cachedResults;
            if (source.length === 0) return;

            const newResults = [...source];
            let hasUpdates = false;

            for (let i = 0; i < newResults.length; i++) {
                const result = newResults[i];
                const url = result.post_link || result.url;

                // Skip if no URL or already looks like it has full data (e.g. selftext is populated and not generic)
                // Or if we already marked it as hydrated
                if (!url || result.hydrated === true) continue;

                try {
                    // Mark as hydrating to prevent double fetch if we re-run
                    newResults[i].hydrated = 'loading'; // Temporary state? or just don't set true yet. 
                    // Actually, better to just fire simpler promises? 
                    // Let's do it sequentially for now to be safe, or parallel

                    // We update state individually to show progress?
                    // Or batch? Let's update state individually for better UX
                } catch (e) {
                    // ignore
                }
            }
        };

        // Actually, a better pattern:
        // Iterate through cachedResults. If any item needs hydration, trigger a fetch for it.
        // Update the item in setCachedResults when done.

        cachedResults.forEach(async (result, index) => {
            const url = result.post_link || result.url;
            if (!url || result.hydrated || result.hydrating) return;

            // Mark as hydrating to prevent duplicates
            setCachedResults(prev => {
                const update = [...prev];
                update[index] = { ...update[index], hydrating: true };
                return update;
            });

            try {
                // Use local proxy or Vercel function
                // Using relative path so it works in both dev (via vite proxy) and prod (on Vercel domain)
                const response = await fetch('/api/reddit-meta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                if (!response.ok) {
                    throw new Error(`Proxy error: ${response.status}`);
                }

                const data = await response.json();

                // Merge data
                setCachedResults(prev => {
                    const update = [...prev];
                    update[index] = {
                        ...update[index],
                        title: data.subreddit ? `r/${data.subreddit}` : update[index].title,
                        postTitle: data.title,
                        text: data.text || data.title, // text (selftext) from proxy
                        score: data.upvotes,
                        comments: data.comments,
                        date: data.date,
                        body: data.text || update[index].body,
                        hydrated: true,
                        hydrating: false
                    };
                    // Update storage too
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem('yellowcake_chunk_cache', JSON.stringify(update));
                    }
                    return update;
                });
            } catch (err) {
                console.warn(`Failed to hydrate result ${index}:`, err);
                setCachedResults(prev => {
                    const update = [...prev];
                    update[index] = { ...update[index], hydrating: false, hydrated: true }; // Mark hydrated so we don't retry forever
                    return update;
                });
            }
        });

    }, [scrapedResults.length]); // Dependencies? We want to run this when we load the page or new results come in. 
    // Ideally we depend on cachedResults but that causes infinite loop if we update it.
    // So we rely on the initial load logic or a specific triggering effect.
    // Logic above: scrapedResults change triggers it. What if we reload and scrapedResults is empty but cachedResults is populated?
    // We need an effect that runs once on mount or when cachedResults is initially set.

    // Let's separate hydration effect
    useEffect(() => {
        if (cachedResults.length === 0) return;

        cachedResults.forEach((result, index) => {
            const url = result.post_link || result.url;
            // Check if already hydrated or hydrating
            if (!url || result.hydrated || result.hydrating) return;

            // Only fetch if it looks like a real reddit link
            if (!url.includes('reddit.com')) return;

            // Trigger fetch
            (async () => {
                // Set hydrating flag
                setCachedResults(prev => {
                    // Safe check to avoid setting if already hydrating in latest state
                    if (prev[index].hydrating) return prev;
                    const update = [...prev];
                    update[index] = { ...update[index], hydrating: true };
                    return update;
                });

                try {
                    const { data, error } = await supabase.functions.invoke('fetch-reddit-post', {
                        body: { url }
                    });

                    if (error) throw error;

                    setCachedResults(prev => {
                        const update = [...prev];
                        // Preserve original keys but overwrite with detailed data
                        update[index] = {
                            ...update[index],
                            ...data,
                            body: data.selftext || data.title, // Fallback if no body
                            hydrated: true,
                            hydrating: false
                        };
                        if (typeof window !== 'undefined') {
                            window.sessionStorage.setItem('yellowcake_chunk_cache', JSON.stringify(update));
                        }
                        return update;
                    });

                } catch (e) {
                    console.warn('Hydration failed for', url, e);
                    setCachedResults(prev => {
                        const update = [...prev];
                        update[index] = { ...update[index], hydrating: false, hydrated: true }; // Stop trying
                        return update;
                    });
                }
            })();
        });
    }, [cachedResults.length]); // Only run if list length changes (new items) or initial load. 
    // Note: updating state inside doesn't change length, so this is safe.

    // Original effect for loading scrapedResults into cache
    useEffect(() => {
        if (scrapedResults.length > 0) {
            // Check if we already have these in cache to preserve hydration?
            // If scrapedResults comes from navigate state, it might mean a FRESH search.
            // So we should probably reset unless we want to keep old cache?
            // Usually new search = new results.
            setCachedResults(scrapedResults);
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('yellowcake_chunk_cache', JSON.stringify(scrapedResults));
            }
        }
        // Fallback load moved to state initializer or separate effect? 
        // We can leave the original logic if we are careful.
        else if (typeof window !== 'undefined' && cachedResults.length === 0) {
            const stored = window.sessionStorage.getItem('yellowcake_chunk_cache');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setCachedResults(parsed);
                } catch (err) {
                    // ignore
                }
            }
        }
    }, [scrapedResults]);

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

    if (!supabaseUrl || !supabaseKey) {
        return (
            <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <h1 style={{ color: '#ff4a4a' }}>Configuration Error</h1>
                <p>Environment files missing. Please check your .env file.</p>
            </div>
        );
    }

    // Helper to extract subreddit from URL
    const getSubreddit = (url) => {
        if (!url) return 'Reddit Post';
        try {
            // Handle standard reddit.com/r/subreddit format
            const match = url.match(/reddit\.com\/r\/([^/]+)/);
            if (match && match[1]) return `From r/${match[1]}`;

            // Fallback for just hostname if regex fails
            return 'From Reddit';
        } catch (e) {
            return 'Reddit Post';
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Recent';
        try {
            const date = new Date(timestamp * 1000); // Assuming UTC timestamp
            return date.toLocaleDateString();
        } catch (e) {
            return timestamp;
        }
    };

    // Helper to extract title from URL
    const getTitleFromUrl = (url) => {
        if (!url) return '';
        try {
            // Remove trailing slash if present
            const cleanUrl = url.replace(/\/$/, '');
            // Get the last segment
            const segments = cleanUrl.split('/');
            let slug = segments[segments.length - 1];

            // If the last segment looks like an ID (short alphanum), try the next to last
            // Standard: /r/sub/comments/id/title/
            // Segments: r, sub, comments, id, title
            if (slug.length < 15 && /^[a-z0-9]+$/i.test(slug) && segments.length > 2) {
                // Might be the ID, look safely at previous segment?
                // Actually, if url ends in ID, it might not have title.
                // But usually they have title.
            }

            // Convert kebab-case or snake_case to Title Case
            const decoded = decodeURIComponent(slug);
            const title = decoded.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            return title || 'Reddit Post';
        } catch (e) {
            return 'Reddit Post';
        }
    };

    // Convert scraped results to display format
    const results = cachedResults.length > 0
        ? cachedResults.map((result, index) => {
            const postLink = result.post_link || result.url || '';
            const subredditTitle = result.subreddit ? `r/${result.subreddit}` : getSubreddit(postLink);
            const bodyText = result.body || result.text || result.selftext || 'No content preview available.';

            // Should use hydrated postTitle if available, otherwise check title or extract from URL
            let postTitle = result.postTitle;
            if (!postTitle) {
                postTitle = result.title;
                if (!postTitle || postTitle.startsWith('Reddit Post #')) {
                    const extracted = getTitleFromUrl(postLink);
                    if (extracted && extracted !== 'Reddit Post') postTitle = extracted;
                }
            }
            if (!postTitle) {
                postTitle = `Reddit Post #${index + 1}`;
            }

            const comments = result.num_comments || result.comments || 0;
            const score = result.score || result.upvotes || 0;
            const date = result.created_utc ? formatDate(result.created_utc) : result.date || 'Unknown Date';

            return {
                id: index + 1,
                title: subredditTitle,
                postTitle: postTitle,
                text: bodyText,
                url: postLink,
                comments,
                score,
                date
            };
        }).sort((a, b) => (parseInt(b.score) || 0) - (parseInt(a.score) || 0))
        : [
            {
                id: 1,
                title: "r/ArtistLounge",
                postTitle: "Why is there no good scheduler for artists?",
                text: "Analyzing subreddit discussions reveals a significant demand for automated social media scheduling tools specifically for artists. I've been looking for something that handles Instagram sizes correctly but no luck.",
                url: "https://reddit.com/r/ArtistLounge",
                comments: 42,
                score: 156,
                date: "10/24/2023"
            },
            {
                id: 2,
                title: "r/smallbusiness",
                postTitle: "CRM for solo founders?",
                text: "Users in r/smallbusiness are frequently complaining about the complexity of existing CRM solutions for solo entrepreneurs. Hubspot is too expensive and Excel is too messy.",
                url: "https://reddit.com/r/smallbusiness",
                comments: 89,
                score: 340,
                date: "11/02/2023"
            },
            {
                id: 3,
                title: "r/productivity",
                postTitle: "Distraction free writing app needed",
                text: "There is a growing trend in r/productivity asking for a distraction-free writing app that integrates directly with WordPress.",
                url: "https://reddit.com/r/productivity",
                comments: 12,
                score: 45,
                date: "Yesterday"
            },
            {
                id: 4,
                title: "r/pcgaming",
                postTitle: "Launcher fatigue is real",
                text: "Gamers in r/pcgaming are looking for a unified launcher that is lightweight and open-source, as current options are bloated.",
                url: "https://reddit.com/r/pcgaming",
                comments: 231,
                score: 1205,
                date: "2 days ago"
            },
            {
                id: 5,
                title: "r/homeautomation",
                postTitle: "Offline voice assistant?",
                text: "Review of r/homeautomation suggests a gap for a privacy-focused, offline-first voice assistant for smart home control.",
                url: "https://reddit.com/r/homeautomation",
                comments: 56,
                score: 210,
                date: "1 week ago"
            },
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
                        {results.map((result, index) => (
                            <ResultSlice
                                key={result.id || index}
                                {...result}
                                // Pass isMostPopular to the very first item (since it's sorted)
                                isMostPopular={index === 0}
                                onAdd={handleAddToProject}
                            />
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
        </div>
    );
}

export default ResultsPage;
