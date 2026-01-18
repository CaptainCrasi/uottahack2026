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

        // Reverted to reliable random subreddits
        const RELEVANT_SUBREDDITS = ['popular', 'AskReddit', 'technology'];
        const randomSub = RELEVANT_SUBREDDITS[Math.floor(Math.random() * RELEVANT_SUBREDDITS.length)];
        const targetUrl = `https://old.reddit.com/r/${randomSub}/`;

        setLoadingMessage(`Initialized. Target: r/${randomSub}...`);
        addLog(`Selected subreddit: r/${randomSub}`);

        let itemsFound = 0; // Track items found in this session

        try {
            const response = await fetch("/api/yellowcake/v1/extract-stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                },
                body: JSON.stringify({
                    url: targetUrl,
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
                        addLog(`Received post: ${parsed.title || parsed.post_title}`);
                        setPosts(prev => [...prev, parsed]);
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
            setPosts(items);
            itemsFound += items.length;
            addLog(`Posts updated: ${items.length} items.`);
        }

        function tryIncrementalParse(jsonStr) {
            // Simple heuristic to show partial items if possible
        }
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
                alignItems: 'center'
            }}>
                <h1 className="hero-text" style={{ opacity: 0.5, marginBottom: '2rem' }}>Explore Page</h1>

                {/* Scrape Action Button */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '30px' }}>
                    <button
                        onClick={scrapeRedditFixableProblems}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: '#ff4500',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            minWidth: '200px'
                        }}
                    >
                        {loading ? loadingMessage : 'Find Fixable Problems on Reddit'}
                    </button>
                    {!loading && posts.length === 0 && (error || debugLogs.length > 0) && (
                        <button
                            onClick={scrapeRedditFixableProblems}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                backgroundColor: '#555',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                            }}
                        >
                            Retry with different Subreddit
                        </button>
                    )}
                </div>

                {/* Warnings */}
                {usageWarning && (
                    <div style={{
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        padding: '10px',
                        borderRadius: '5px',
                        marginBottom: '20px',
                        border: '1px solid #ffeeba'
                    }}>
                        <strong>Note:</strong> The API is reporting usage limits. Results might be incomplete.
                    </div>
                )}

                {/* Error Message */}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {/* Debug Logs */}
                <div style={{
                    width: '100%',
                    display: 'flex',
                    gap: '20px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        flex: 1,
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '5px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: 'black',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ddd'
                    }}>
                        <strong>Live Debug Log:</strong>
                        {debugLogs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        {debugLogs.length === 0 && <div style={{ color: '#999' }}>Ready to scrape...</div>}
                    </div>

                    <div style={{
                        flex: 1,
                        backgroundColor: '#f0f0f0',
                        padding: '10px',
                        borderRadius: '5px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: 'black',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        whiteSpace: 'pre-wrap'
                    }}>
                        <strong>Raw Stream Content:</strong>
                        <div>{accumulatedRaw || '(Waiting for content...)'}</div>
                    </div>
                </div>

                {/* Results Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px',
                    width: '100%'
                }}>
                    {posts.length > 0 ? posts.map((post, index) => (
                        <div key={index} style={{
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            padding: '15px',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 10px 0', color: '#333' }}>
                                {post.title || post.post_title || post.headline || 'No Title'}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: '#555' }}>Posted by: <strong>{post.username || post.author || 'Unknown'}</strong></p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8rem', color: '#777' }}>
                                <span>👍 {post.upvotes || post.ups || 0}</span>
                                <span>💬 {post.comments || post.num_comments || post.comment_number || 0} comments</span>
                            </div>
                        </div>
                    )) : !loading && posts.length === 0 && (
                        null
                    )}
                </div>
            </main>

            <AuthModal
                isOpen={isModalOpen}
                onClose={closeModal}
                initialMode={modalMode}
            />
        </div>
    );
}

export default Explore;