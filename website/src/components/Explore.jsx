import React, { useState } from 'react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

function Explore() {
    const { user, isModalOpen, modalMode, handleLoginClick, handleSignupClick, handleLogout, closeModal } = useAuth();

    // State for storing scraped posts, loading status, and debug logs
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Finding Fixable Problems on Reddit...');
    const [error, setError] = useState(null);
    const [debugLogs, setDebugLogs] = useState([]);
    const [accumulatedRaw, setAccumulatedRaw] = useState('');
    const [usageWarning, setUsageWarning] = useState(false);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => {
            // Prevent spamming the same complex message
            if (prev.length > 0 && prev[prev.length - 1].includes(msg)) return prev;
            return [...prev.slice(-49), `[${time}] ${msg}`];
        });
    };

    // Function to scrape Reddit using Yellowcake
    const scrapeRedditFixableProblems = async () => {
        setLoading(true);
        setLoadingMessage('Initializing scrape...');
        setError(null);
        setUsageWarning(false);
        setPosts([]);
        setDebugLogs([]);
        setAccumulatedRaw('');
        addLog('Starting scrape request...');

        // API Key should ideally be in environment variables (e.g., process.env.REACT_APP_YELLOWCAKE_KEY)
        const API_KEY = 'yc_live_fLKs1CM-UpssiYIu_m87Q3eKoP4ZP-D_0UUXvhDE0fE=';

        setLoadingMessage(`Initialized. Target: r/popular...`);
        addLog(`Selected subreddit: popular`);

        let itemsFound = 0; // Track items found in this session

        try {
            const response = await fetch("/api/yellowcake/v1/extract-stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                },
                body: JSON.stringify({
                    url: "https://www.reddit.com/r/popular/",
                    prompt: "Extract 5 posts from this page. Fields: title, username, upvotes, comment number."
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                addLog(`HTTP Error: ${response.status} ${response.statusText}`);
                throw new Error(`Error: ${response.statusText}`);
            }

            addLog('Response OK. Reading stream...');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let currentEventLines = [];
            let jsonBuffer = ''; // To accumulate raw JSON content (token by token or strings)

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });

                    // Check for usage warnings in the raw text
                    if (chunk.toLowerCase().includes('usage limit')) {
                        setUsageWarning(true);
                        addLog('Warning: API usage limit approaching.');
                    }

                    buffer += chunk;

                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();

                        // SSE message boundary is an empty line (but careful about trim)
                        if (line.trim() === '') {
                            if (currentEventLines.length > 0) {
                                // Process the accumulated event
                                processSSEEvent(currentEventLines);
                                currentEventLines = [];
                            }
                            continue;
                        }

                        currentEventLines.push(trimmedLine);
                    }
                }

                // Process any remaining event
                if (currentEventLines.length > 0) {
                    processSSEEvent(currentEventLines);
                }

            } finally {
                reader.releaseLock();
            }

            addLog('Stream closed.');

            if (itemsFound === 0) {
                // Try one last parse of the full collected raw string if we have no posts
                try {
                    if (jsonBuffer.trim()) {
                        // Sometimes the stream is just one big JSON blob at the end (not SSE formatted?)
                        // or we built it up.
                        const result = JSON.parse(jsonBuffer);
                        handleResultPayload(result);
                    }
                } catch (e) {
                    addLog(`Final manual parse check failed. Length: ${jsonBuffer.length}`);
                }
            }

        } catch (err) {
            console.error("Failed to scrape:", err);
            addLog(`Stream interrupted: ${err.message}`);

            if (itemsFound > 0) {
                // If we found items, don't show a fatal error, just a warning
                setLoadingMessage(`Completed with warnings.`);
                setUsageWarning(true);
            } else {
                setError(err.message || "Failed to load posts.");
            }
        } finally {
            setLoading(false);
            if (itemsFound > 0) {
                setLoadingMessage('Find Fixable Problems on Reddit');
            }
        }

        function processSSEEvent(lines) {
            // Find data lines
            const dataLines = lines
                .filter(l => l.startsWith('data: '))
                .map(l => l.substring(6));

            if (dataLines.length === 0) return;

            const dataContent = dataLines.join('\n');

            if (dataContent.toLowerCase().includes('usage limit')) {
                setUsageWarning(true);
                addLog('Warning: API usage limit reported in data content.');
            }

            if (dataContent.trim() === '[DONE]') {
                addLog('Stream [DONE].');
                return;
            }

            try {
                // Try parsing as JSON object (e.g. progress or final result)
                const parsed = JSON.parse(dataContent);

                // Log raw object to raw view for debugging
                setAccumulatedRaw(prev => prev + JSON.stringify(parsed, null, 2) + '\n\n');

                if (parsed && parsed.stage) {
                    setLoadingMessage(`Scraping: ${parsed.stage}...`);
                    addLog(`Progress: ${parsed.stage}`);
                } else if (parsed && parsed.error) {
                    addLog(`Stream Error: ${parsed.error}`);
                    throw new Error(parsed.error);
                } else if (parsed && parsed.code === 'ERROR') {
                    addLog(`API Error: ${parsed.message}`);
                    throw new Error(parsed.message);
                } else if (typeof parsed === 'object') {
                    // Could be final result or chunks
                    if (Array.isArray(parsed.data)) {
                        addLog(`Final payload with ${parsed.data.length} items.`);
                        handleResultPayload(parsed.data);
                    } else if (parsed.result) {
                        addLog(`Final payload (result prop) with items.`);
                        handleResultPayload(parsed.result);
                    } else if (parsed.post_title || parsed.title) {
                        // It's a single post item streamed individually
                        const title = parsed.title || parsed.post_title || parsed.headline;
                        addLog(`Received post: ${title}`);

                        // Normalize the post object
                        const newPost = {
                            ...parsed,
                            title: title,
                            url: parsed.url || parsed.post_url || parsed.link,
                            subreddit: parsed.subreddit, // might be null, handled by helper
                            username: parsed.username || parsed.author,
                            upvotes: parsed.upvotes || parsed.ups,
                            comments: parsed.comments || parsed.num_comments || parsed.comment_number
                        };

                        setPosts(prev => [...prev, newPost]);
                        itemsFound++;
                    } else {
                        // Unknown object
                        // addLog('Received data object.');
                    }
                } else if (typeof parsed === 'string') {
                    // It's a string token
                    jsonBuffer += parsed;
                    // setAccumulatedRaw(prev => prev + parsed); // already logged above

                    // Attempt incremental parse (very basic)
                    tryIncrementalParse(jsonBuffer);
                }
            } catch (e) {
                // If it's not valid JSON (e.g. broken chunk), just ignore
            }
        }

        function handleResultPayload(data) {
            const items = Array.isArray(data) ? data : (data.result || []);

            // CRITICAL FIX: If we effectively found items via streaming, do NOT overwrite with an empty final payload
            if (items.length === 0 && itemsFound > 0) {
                addLog('Final payload empty. Keeping streamed items.');
                return;
            }

            if (items.length > 0) {
                setPosts(items);
                itemsFound += items.length; // accurate enough for session
                addLog(`Posts updated: ${items.length} items from final payload.`);
            }
        }

        function tryIncrementalParse(jsonStr) {
            // Simple heuristic to show partial items if possible
        }


    };

    // Helper to extract subreddit from URL
    const getSubredditFromUrl = (url) => {
        if (!url) return null;
        try {
            // matches /r/subredditName/
            const match = url.match(/\/r\/([^/]+)/);
            if (match && match[1]) {
                return `r/${match[1]}`;
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    // Helper to open link safely
    const openLink = (url) => {
        if (!url) return;
        // Ensure absolute URL
        const fullUrl = url.startsWith('http') ? url : `https://www.reddit.com${url}`;
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="app-container">
            <Header
                user={user}
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
                onLogoutClick={handleLogout}
            />

            <main className="main-content" style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '20px',
                width: '100%',
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative' // For absolute positioning context if needed
            }}>
                <h1 className="hero-text" style={{ marginBottom: '2rem' }}>Explore Page</h1>

                {/* Scrape Action Button */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '40px' }}>
                    <button
                        onClick={scrapeRedditFixableProblems}
                        disabled={loading}
                        className="wow-feature-btn" // Use the class from App.css if available, else style inline below
                        style={{
                            // Inline fallback matching wow-feature-btn
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            border: 'none',
                            padding: '0.8rem 2rem',
                            borderRadius: '100px',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.8 : 1,
                            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                                {loadingMessage}
                            </>
                        ) : '✨ Find Fixable Problems on Reddit'}
                    </button>

                    {!loading && posts.length === 0 && (error || debugLogs.length > 0) && (
                        <button
                            onClick={scrapeRedditFixableProblems}
                            style={{
                                padding: '0.8rem 1.5rem',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                backgroundColor: '#334155',
                                color: '#cbd5e1',
                                border: '1px solid #475569',
                                borderRadius: '100px',
                                transition: 'all 0.2s',
                                fontWeight: 500
                            }}
                        >
                            Retry Request
                        </button>
                    )}
                </div>

                {/* Warnings */}
                {usageWarning && (
                    <div style={{
                        backgroundColor: 'rgba(255, 243, 205, 0.1)',
                        color: '#fcd34d',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid rgba(252, 211, 77, 0.3)',
                        backdropFilter: 'blur(4px)',
                        maxWidth: '600px',
                        textAlign: 'center'
                    }}>
                        <strong>Note:</strong> The API is reporting usage limits. Results might be incomplete.
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div style={{
                        color: '#f87171',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                {/* Results Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px',
                    width: '100%'
                }}>
                    {posts.length > 0 ? posts.map((post, index) => (
                        <div key={index} style={{
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            padding: '24px',
                            backgroundColor: 'rgba(30, 41, 59, 0.7)', // Dark slate, semi-transparent
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            cursor: post.url ? 'pointer' : 'default',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                            onClick={() => openLink(post.url || post.permalink)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
                                e.currentTarget.querySelector('.analyze-btn').style.opacity = '1';
                                e.currentTarget.querySelector('.analyze-btn').style.transform = 'translateY(0)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                                e.currentTarget.querySelector('.analyze-btn').style.opacity = '0';
                                e.currentTarget.querySelector('.analyze-btn').style.transform = 'translateY(10px)';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                                <span style={{
                                    background: 'rgba(236, 72, 153, 0.1)',
                                    color: '#ec4899',
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    fontWeight: 500
                                }}>
                                    {getSubredditFromUrl(post.url) || post.subreddit || 'r/reddit'}
                                </span>
                                <span>• Posted by <span style={{ color: '#cbd5e1' }}>{post.username || post.author || 'Unknown'}</span></span>
                            </div>

                            <h3 style={{
                                fontSize: '1.25rem',
                                margin: 0,
                                lineHeight: 1.5,
                                color: '#f8fafc',
                                fontWeight: 700,
                                letterSpacing: '-0.01em'
                            }}>
                                {post.title || post.post_title || post.headline || 'No Title'}
                            </h3>

                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#fbbf24' }}>⇧</span> {post.upvotes || post.ups || 0}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💬 {post.comments || post.num_comments || post.comment_number || 0}
                                    </span>
                                </div>

                                {post.url && (
                                    <span style={{ fontSize: '0.85rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        View on Reddit ↗
                                    </span>
                                )}
                            </div>

                            {/* Hover Action Button */}
                            <button
                                className="analyze-btn"
                                style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    right: '20px',
                                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                    opacity: 0,
                                    transform: 'translateY(10px)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    alert('Analysis feature coming soon!');
                                }}
                            >
                                ✨ Analyze
                            </button>
                        </div>
                    )) : !loading && posts.length === 0 && (
                        null
                    )}
                </div>
            </main>

            {/* Collapsible Debug Widget */}
            <DebugWidget debugLogs={debugLogs} accumulatedRaw={accumulatedRaw} />

            <AuthModal
                isOpen={isModalOpen}
                onClose={closeModal}
                initialMode={modalMode}
            />
        </div>
    );
}

// Separate component for the debug widget to keep main clean
function DebugWidget({ debugLogs, accumulatedRaw }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '10px'
        }}>
            {/* The Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '50px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                }}
            >
                {isOpen ? 'Hide Debug Logs ▼' : 'Show Debug Logs ▲'}
                <span style={{
                    backgroundColor: debugLogs.length > 0 ? '#10b981' : '#64748b',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    display: 'inline-block'
                }} />
            </button>

            {/* The Panel */}
            {isOpen && (
                <div style={{
                    width: '800px',
                    maxWidth: '90vw',
                    height: '400px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    gap: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {/* Log Column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                        <strong style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Live Logs</strong>
                        <div style={{
                            flex: 1,
                            backgroundColor: '#1e293b',
                            borderRadius: '6px',
                            padding: '10px',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#e2e8f0',
                            overflowY: 'auto',
                            border: '1px solid #334155'
                        }}>
                            {debugLogs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>{log}</div>
                            ))}
                            {debugLogs.length === 0 && <div style={{ color: '#64748b' }}>Waiting for activity...</div>}
                        </div>
                    </div>

                    {/* Raw Stream Column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                        <strong style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Raw Stream</strong>
                        <div style={{
                            flex: 1,
                            backgroundColor: '#1e293b',
                            borderRadius: '6px',
                            padding: '10px',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            overflowY: 'auto',
                            border: '1px solid #334155',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {accumulatedRaw || '(Content will appear here)'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}

export default Explore;