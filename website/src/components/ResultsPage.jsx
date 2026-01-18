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

    return (
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
            <p style={{ margin: '0 0 0.8rem 0', color: '#9da3ae', fontSize: '0.9rem', wordBreak: 'break-all' }}>{text}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{
                    background: hasLink ? 'rgba(4, 141, 123, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: hasLink ? '1px solid rgba(4, 141, 123, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: hasLink ? '#048d7b' : '#6b6b7c',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: hasLink && !isLoading ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: hasLink ? 1 : 0.7
                }}
                    disabled={!hasLink || isLoading}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasLink) {
                            onAnalyze();
                        }
                    }}
                >
                    {analyzeLabel}
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
                body: JSON.stringify({ url: linkToUse })
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
