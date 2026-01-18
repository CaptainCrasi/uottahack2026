import React, { useState, useEffect } from 'react';
import Header from './Header';
import AuthModal from './AuthModal';
import { supabase } from '../supabase';
// import textLogo from '../assets/marketsnipe_text_logo.png'; // Not used in this version
import '../App.css';
import { useAuth } from '../contexts/AuthContext';

import { useLocation } from 'react-router-dom';

const sanitizeLink = (candidate) => {
    if (typeof candidate !== 'string') return '';
    const unquoted = candidate.trim().replace(/^"+|"+$/g, '').replace(/\\\//g, '/');
    if (!/^https?:\/\//i.test(unquoted)) {
        return '';
    }
    return unquoted;
};

const safeStringify = (value) => {
    if (typeof value === 'string') {
        return value;
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch (_err) {
        return '';
    }
};

const extractPostLink = (result) => {
    if (!result) return '';

    const candidateList = [
        result.post_link,
        result.url,
        result.link,
        result.permalink,
        result.post?.link,
        result.post?.url,
        result.metadata?.post_link,
        result.metadata?.url,
        result.chunk?.post_link,
        result.chunk?.url,
        result.chunk?.link,
        result.chunk?.permalink,
        result.chunk?.metadata?.post_link,
        result.chunk?.metadata?.url,
        Array.isArray(result.links) ? result.links[0] : null,
    ];

    for (const candidate of candidateList) {
        const sanitized = sanitizeLink(candidate);
        if (sanitized) {
            return sanitized;
        }
    }

    const serialized = typeof result === 'string' ? result : (() => {
        try {
            return JSON.stringify(result);
        } catch (_err) {
            return '';
        }
    })();

    if (!serialized) {
        return '';
    }

    const match = serialized.match(/https?:\\?\/?\\?\/[\w.?=&%\-#/]+/i);
    if (match) {
        return sanitizeLink(match[0]);
    }

    return '';
};

const ResultSlice = ({ title, text, url, onAdd, onAnalyze, analysis }) => {
    const isLoading = analysis?.status === 'loading';
    const hasLink = Boolean(url);
    const analyzeLabel = !hasLink ? 'No Link' : isLoading ? 'Analyzing...' : 'Analyze';

    const buildPermalink = (link) => {
        if (!link) return null;
        if (link.startsWith('http')) return link;
        return `https://old.reddit.com${link}`;
    };

    const getSubreddit = (link) => {
        if (!link) return 'r/Unknown';
        const match = link.match(/reddit\.com\/r\/([^/]+)/i);
        return match ? `r/${match[1]}` : 'r/reddit';
    };

    const getPostTitle = (link) => {
        if (!link) return null;
        const match = link.match(/comments\/[^/]+\/([^/]+)/i);
        if (match && match[1]) {
            // Replace hyphens/underscores with spaces and decode
            let clean = decodeURIComponent(match[1]).replace(/[_-]/g, ' ');
            // Capitalize first letter
            clean = clean.charAt(0).toUpperCase() + clean.slice(1);
            return clean;
        }
        return null; // Fallback if regular link
    };

    const subreddit = getSubreddit(url);
    const derivedTitle = getPostTitle(url);

    // If we have a derived title, use it. Otherwise use the passed text (if it's not just the url). 
    // If text IS the url, and we couldn't derive title, we show url? 
    // The user wants "replace the link on each box with the title".
    // "add a ... at the end of each incase title isnt full"

    let displayContent = text;
    if (derivedTitle) {
        displayContent = derivedTitle;
    } else if (title.startsWith('Reddit Post')) {
        // Fallback: truncate text if it's long
        displayContent = text.length > 150 ? text.substring(0, 150) : text;
    }

    // Always add ... for style as requested "incase title isnt full" - mostly for derived titles
    if (derivedTitle && !displayContent.endsWith('...')) {
        displayContent += '...';
    }

    return (
        <div style={{
            background: '#18181b', // Opaque dark background
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '100%',
            marginBottom: '0.8rem',
            transition: 'transform 0.2s ease, border-color 0.2s ease',
            cursor: 'default',
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
            className="result-slice"
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(4, 141, 123, 0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Top Right Open Link Button */}
            {hasLink && (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        color: '#9da3ae',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        gap: '6px'
                    }}
                    title="Open on Reddit"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#9da3ae';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                >
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Open Link</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </a>
            )}

            <h3 style={{
                margin: '0 0 0.5rem 0',
                color: '#048d7b', /* Greenish accent for subreddit */
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 700
            }}>
                {subreddit.toUpperCase()}
            </h3>

            {/* Main Content / Title */}
            <p style={{ margin: '0 0 1rem 0', color: '#ececf1', fontSize: '1rem', lineHeight: '1.5', fontWeight: 500 }}>
                {displayContent}
            </p>

            {/* Content Preview/Body */}
            <div style={{ color: '#9da3ae', fontSize: '0.9rem', lineHeight: '1.6', wordBreak: 'break-word', marginBottom: '1rem' }}>
                {/* If text was used as title, show nothing here, else show text */}
                {title.startsWith('Reddit Post') ? null : text}
            </div>

            {/* Analyze Button */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{
                    background: hasLink ? 'rgba(4, 141, 123, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: hasLink ? '1px solid rgba(4, 141, 123, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: hasLink ? '#048d7b' : '#6b6b7c',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: hasLink && !isLoading ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: hasLink ? 1 : 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
                    disabled={!hasLink || isLoading}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasLink) {
                            onAnalyze();
                        }
                    }}
                    onMouseEnter={(e) => {
                        if (hasLink && !isLoading) {
                            e.currentTarget.style.background = 'rgba(4, 141, 123, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (hasLink && !isLoading) {
                            e.currentTarget.style.background = 'rgba(4, 141, 123, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner-small"></span>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Analyze
                        </>
                    )}
                </button>
            </div>

            {analysis && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    {analysis.status === 'loading' && (
                        <p style={{ color: '#9da3ae', margin: 0 }}>{analysis.message || 'Analyzing comments...'}</p>
                    )}

                    {analysis.status === 'error' && (
                        <p style={{ color: '#ff6b6b', margin: 0 }}>{analysis.error || 'Unable to analyze this post.'}</p>
                    )}

                    {analysis.status === 'complete' && (
                        analysis.comments?.length ? (
                            analysis.comments.map((comment, index) => {
                                const commentLink = buildPermalink(comment?.permalink);
                                return (
                                    <div key={commentLink || `${title}-comment-${index}`} style={{
                                        padding: '0.65rem',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        background: 'rgba(255, 255, 255, 0.01)',
                                        marginBottom: index !== analysis.comments.length - 1 ? '0.5rem' : 0
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                            <span style={{ color: '#9da3ae', fontSize: '0.8rem' }}>Comment {index + 1}</span>
                                            {commentLink && (
                                                <a href={commentLink} target="_blank" rel="noopener noreferrer" style={{ color: '#048d7b', fontSize: '0.8rem' }}>
                                                    View Thread -&gt;
                                                </a>
                                            )}
                                        </div>
                                        <p style={{ color: '#d7dae0', margin: '0 0 0.45rem 0', lineHeight: 1.4 }}>
                                            {comment?.comment_summary || comment?.comment || comment?.summary || 'No insight provided.'}
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#9da3ae' }}>
                                            <span>by {comment?.author || 'Unknown'}</span>
                                            {comment?.pain_point && (
                                                <span style={{
                                                    background: 'rgba(4, 141, 123, 0.2)',
                                                    border: '1px solid rgba(4, 141, 123, 0.4)',
                                                    borderRadius: '12px',
                                                    padding: '0.15rem 0.5rem',
                                                    color: '#64d3c4'
                                                }}>
                                                    {comment.pain_point}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ color: '#9da3ae', margin: 0 }}>No insightful comments detected.</p>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

function ResultsPage() {
    const { user, isModalOpen, modalMode, handleLoginClick, handleSignupClick, handleLogout, closeModal, setModalMode } = useAuth();

    const location = useLocation();
    const projectId = location.state?.projectId;
    const inputText = location.state?.inputText;
    const scrapedResults = location.state?.results || [];
    const [cachedResults, setCachedResults] = useState(scrapedResults);
    const [analysisMap, setAnalysisMap] = useState({});
    const sessionLogs = location.state?.logs || [];

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

    useEffect(() => {
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

    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
        return (
            <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <h1 style={{ color: '#ff4a4a' }}>Configuration Error</h1>
                <p>Environment files missing. Please check your .env file.</p>
            </div>
        );
    }

    const handleAnalyzePost = async (result) => {
        const linkToUse = result?.url || extractPostLink(result?.raw);

        if (!linkToUse) {
            console.warn('Deep analysis aborted: no Reddit URL found for result', result);
            setAnalysisMap(prev => ({
                ...prev,
                [result.id]: {
                    status: 'error',
                    comments: [],
                    message: null,
                    error: 'This result does not include a Reddit link.',
                }
            }));
            return;
        }

        // Initialize loading state
        setAnalysisMap(prev => ({
            ...prev,
            [result.id]: {
                status: 'loading',
                comments: [],
                message: 'Connecting to Yellowcake...',
                error: null,
            }
        }));

        try {
            console.log('Starting deep analysis for', linkToUse);
            const functionUrl = `${supabaseUrl}/functions/v1/yellowcake-post-comments`;
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({ url: linkToUse, inputText }) 
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Deep analysis HTTP failure', response.status, errorBody);
                throw new Error(errorBody || 'Failed to analyze post.');
            }

            const reader = response.body?.getReader();
            if (!reader) {
                console.error('Deep analysis stream missing body for', linkToUse);
                throw new Error('No readable stream returned from analysis.');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            const collected = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                let fatalError = null;
                for (const eventBlock of events) {
                    const lines = eventBlock.split('\n');
                    let eventName = 'message';
                    let dataPayload = '';

                    lines.forEach((line) => {
                        const trimmed = line.trim();
                        if (!trimmed) return;
                        if (trimmed.startsWith('event:')) {
                            eventName = trimmed.slice(6).trim();
                        } else if (trimmed.startsWith('data:')) {
                            dataPayload += trimmed.slice(5).trim();
                        }
                    });

                    if (!dataPayload) continue;

                    if (eventName === 'chunk') {
                        try {
                            const chunkData = JSON.parse(dataPayload);
                            collected.push(chunkData);
                            setAnalysisMap(prev => ({
                                ...prev,
                                [result.id]: {
                                    status: 'loading',
                                    comments: [...collected],
                                    message: `Found ${collected.length} comment${collected.length === 1 ? '' : 's'}...`,
                                    error: null,
                                }
                            }));
                        } catch (err) {
                            console.error('Failed to parse chunk payload', err, dataPayload);
                        }
                    } else if (eventName === 'status' || eventName === 'progress') {
                        try {
                            const statusPayload = JSON.parse(dataPayload);
                            if (statusPayload.message) {
                                setAnalysisMap(prev => ({
                                    ...prev,
                                    [result.id]: {
                                        ...(prev[result.id] || { comments: [] }),
                                        status: prev[result.id]?.status === 'complete' ? 'complete' : 'loading',
                                        comments: prev[result.id]?.comments || [],
                                        message: statusPayload.message,
                                        error: null,
                                    }
                                }));
                            }
                        } catch (err) {
                            console.error('Failed to parse status payload', err);
                        }
                    } else if (eventName === 'error') {
                        try {
                            const payload = JSON.parse(dataPayload);
                            fatalError = new Error(payload.error || 'Analysis failed.');
                        } catch (_err) {
                            fatalError = new Error(dataPayload);
                        }
                        console.error('Deep analysis stream error event', fatalError, dataPayload);
                        break;
                    } else if (eventName === 'complete') {
                        setAnalysisMap(prev => ({
                            ...prev,
                            [result.id]: {
                                status: 'complete',
                                comments: [...collected],
                                message: 'Analysis complete',
                                error: null,
                            }
                        }));
                    }
                }

                if (fatalError) {
                    throw fatalError;
                }
            }

            setAnalysisMap(prev => ({
                ...prev,
                [result.id]: {
                    ...(prev[result.id] || {}),
                    status: 'complete',
                    comments: prev[result.id]?.comments?.length ? prev[result.id].comments : collected,
                    message: collected.length ? 'Analysis complete' : 'No comments found',
                    error: null,
                }
            }));

            if (!collected.length) {
                console.warn('Deep analysis completed with zero comments for', linkToUse);
            }
        } catch (error) {
            console.error('Error running deep comment analysis:', error);
            setAnalysisMap(prev => ({
                ...prev,
                [result.id]: {
                    status: 'error',
                    comments: [],
                    message: null,
                    error: error.message || 'Failed to analyze post.',
                }
            }));
        }
    };

    // Convert scraped results to display format
    const results = cachedResults.length > 0
        ? cachedResults.map((result, index) => {
            const postLink = extractPostLink(result);
            const displayText = postLink || safeStringify(result) || 'No Reddit link detected.';
            return {
                id: index + 1,
                title: `Reddit Post #${index + 1}`,
                text: displayText,
                url: postLink,
                raw: result
            };
        })
        : [
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
                            <ResultSlice
                                key={result.id}
                                title={result.title}
                                text={result.text}
                                url={result.url}
                                onAdd={handleAddToProject}
                                onAnalyze={() => handleAnalyzePost(result)}
                                analysis={analysisMap[result.id]}
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
