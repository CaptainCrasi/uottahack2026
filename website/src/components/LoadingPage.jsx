import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import AuthModal from './AuthModal';
import { createClient } from '@supabase/supabase-js';
import textLogo from '../assets/marketsnipe_text_logo.png';
import '../App.css';
import { useAuth } from '../contexts/AuthContext';

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
    const { user, isModalOpen, modalMode, handleLoginClick, handleSignupClick, handleLogout, closeModal } = useAuth();
    const [statusMessage, setStatusMessage] = useState('Generating Reddit scrape prompt...');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [logs, setLogs] = useState([]);
    const [hasError, setHasError] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const projectId = location.state?.projectId;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Create supabase client with anon key for edge function calls
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
        console.log(`[${type.toUpperCase()}] ${message}`);
    };

    useEffect(() => {
        const generateAndScrape = async () => {
            const inputText = location.state?.inputText;
            
            if (!inputText) {
                addLog('No input text provided, redirecting to home', 'error');
                setHasError(true);
                return;
            }

            try {
                // Step 1: Generate the prompt
                addLog('Starting prompt generation...', 'info');
                setStatusMessage('Generating Reddit scrape prompt...');
                
                addLog(`Calling generate-keywords with input: "${inputText}"`, 'info');
                const { data, error } = await supabaseClient.functions.invoke('generate-keywords', {
                    body: { input: inputText }
                });

                if (error) {
                    addLog(`generate-keywords error: ${JSON.stringify(error)}`, 'error');
                    throw error;
                }

                addLog(`generate-keywords response: ${JSON.stringify(data)}`, 'success');

                if (!data || !data.prompt) {
                    addLog('No prompt generated in response', 'error');
                    setStatusMessage('Error: No prompt generated');
                    setHasError(true);
                    return;
                }

                setGeneratedPrompt(data.prompt);
                addLog(`Generated prompt: "${data.prompt}"`, 'success');
                setStatusMessage('Connecting to Yellowcake...');

                // Step 2: Start streaming scrape with the generated prompt
                addLog('Starting Yellowcake scrape stream...', 'info');
                
                const streamUrl = `${supabaseUrl}/functions/v1/yellowcake-scrape`;
                addLog(`Stream URL: ${streamUrl}`, 'info');
                
                const streamResponse = await fetch(streamUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'apikey': supabaseAnonKey,
                    },
                    body: JSON.stringify({ prompt: data.prompt })
                });

                addLog(`Stream response status: ${streamResponse.status} ${streamResponse.statusText}`, streamResponse.ok ? 'success' : 'error');

                if (!streamResponse.ok) {
                    const errorText = await streamResponse.text();
                    addLog(`Stream error response body: ${errorText}`, 'error');
                    throw new Error(`Streaming error: ${streamResponse.status} - ${errorText}`);
                }

                const reader = streamResponse.body?.getReader();
                const decoder = new TextDecoder();
                const results = [];

                if (!reader) {
                    addLog('No reader available from stream response', 'error');
                    throw new Error('No response body reader');
                }

                addLog('Stream reader initialized, starting to read chunks...', 'info');
                setStatusMessage('Searching Reddit...');
                
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        addLog('Stream reading complete', 'success');
                        break;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        addLog(`Raw line: ${line}`, 'debug');

                        if (line.startsWith('event: progress')) {
                            const dataLine = lines[i + 1];
                            if (dataLine && dataLine.startsWith('data: ')) {
                                try {
                                    const progressData = JSON.parse(dataLine.slice(6));
                                    addLog(`Progress event: ${JSON.stringify(progressData)}`, 'info');
                                    if (progressData.message) {
                                        setStatusMessage(progressData.message);
                                    }
                                } catch (e) {
                                    addLog(`Failed to parse progress data: ${e.message}`, 'error');
                                }
                            }
                        } else if (line.startsWith('event: status')) {
                            const dataLine = lines[i + 1];
                            if (dataLine && dataLine.startsWith('data: ')) {
                                try {
                                    const statusData = JSON.parse(dataLine.slice(6));
                                    addLog(`Status event: ${JSON.stringify(statusData)}`, 'info');
                                    if (statusData.message) {
                                        setStatusMessage(statusData.message);
                                    }
                                } catch (e) {
                                    addLog(`Failed to parse status data: ${e.message}`, 'error');
                                }
                            }
                        } else if (line.startsWith('event: chunk')) {
                            const dataLine = lines[i + 1];
                            if (dataLine && dataLine.startsWith('data: ')) {
                                try {
                                    const chunkData = JSON.parse(dataLine.slice(6));
                                    results.push(chunkData);
                                    addLog(`Chunk received: ${JSON.stringify(chunkData)}`, 'success');
                                    setStatusMessage(`Found ${results.length} result${results.length !== 1 ? 's' : ''}...`);
                                } catch (e) {
                                    addLog(`Failed to parse chunk data: ${e.message}`, 'error');
                                }
                            }
                        } else if (line.startsWith('event: complete')) {
                            const dataLine = lines[i + 1];
                            if (dataLine && dataLine.startsWith('data: ')) {
                                try {
                                    const completeData = JSON.parse(dataLine.slice(6));
                                    addLog(`Complete event: ${JSON.stringify(completeData)}`, 'success');
                                    setStatusMessage('Scraping complete! Preparing results...');
                                } catch (e) {
                                    addLog(`Failed to parse complete data: ${e.message}`, 'error');
                                }
                            }
                        } else if (line.startsWith('data: ') && line.includes('error')) {
                            try {
                                const errorData = JSON.parse(line.slice(6));
                                addLog(`Error event: ${JSON.stringify(errorData)}`, 'error');
                                throw new Error(errorData.error || 'Unknown error from stream');
                            } catch (e) {
                                addLog(`Stream error: ${line}`, 'error');
                            }
                        }
                    }
                }

                addLog(`Total results collected: ${results.length}`, 'success');

                // Navigate to results with the collected data
                addLog('Navigating to results page...', 'success');
                
                // Console log all logs before navigating
                console.log('=== FINAL SESSION LOGS ===');
                logs.forEach(log => {
                    console.log(`[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`);
                });
                console.log('=== END SESSION LOGS ===');
                
                setTimeout(() => {
                    navigate('/results', { 
                        state: { 
                            prompt: data.prompt, 
                            inputText,
                            results: results,
                            projectId: projectId,
                            logs: logs
                        } 
                    });
                }, 1000);
            } catch (err) {
                addLog(`FATAL ERROR: ${err.message}`, 'error');
                addLog(`Error stack: ${err.stack}`, 'error');
                console.error('Error in scraping workflow:', err);
                setStatusMessage(`Error: ${err.message}`);
                setHasError(true);
            }
        };

        generateAndScrape();
    }, [navigate, location.state, projectId]);

    // We keep the env check for consistency
    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
        return (
            <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <h1 style={{ color: '#ff4a4a' }}>Configuration Error</h1>
                <p>Environment files missing. Please check your .env file.</p>
                <p style={{ fontSize: '0.9rem', color: '#888' }}>Required: VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_SUPABASE_ANON_KEY</p>
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

                {/* Log Console */}
                {logs.length > 0 && (
                    <div style={{ 
                        maxWidth: '900px', 
                        margin: '20px auto', 
                        backgroundColor: '#1e1e1e', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        textAlign: 'left',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        border: '1px solid #333'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '10px',
                            paddingBottom: '10px',
                            borderBottom: '1px solid #333'
                        }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>System Logs</h3>
                            <button 
                                onClick={() => setLogs([])}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#fff',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                }}
                            >
                                Clear
                            </button>
                        </div>
                        {logs.map((log, index) => (
                            <div key={index} style={{ 
                                marginBottom: '4px',
                                color: log.type === 'error' ? '#ff6b6b' : 
                                       log.type === 'success' ? '#51cf66' : 
                                       log.type === 'debug' ? '#868e96' : '#c5c5d2',
                                lineHeight: 1.4
                            }}>
                                <span style={{ color: '#666', marginRight: '8px' }}>[{log.timestamp}]</span>
                                <span style={{ 
                                    color: log.type === 'error' ? '#ff6b6b' : 
                                           log.type === 'success' ? '#51cf66' : '#999',
                                    fontWeight: 600,
                                    marginRight: '8px'
                                }}>
                                    [{log.type.toUpperCase()}]
                                </span>
                                {log.message}
                            </div>
                        ))}
                    </div>
                )}

                {hasError && (
                    <div style={{
                        maxWidth: '800px',
                        margin: '20px auto',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        border: '1px solid rgba(255, 107, 107, 0.3)',
                        padding: '20px',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ color: '#ff6b6b', marginTop: 0 }}>⚠️ Operation Failed</h3>
                        <p style={{ color: '#e5e5f0', marginBottom: '15px' }}>
                            An error occurred during the scraping process. Check the logs above for details.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                background: '#048d7b',
                                border: 'none',
                                color: '#fff',
                                padding: '10px 24px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 600
                            }}
                        >
                            Return to Home
                        </button>
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
                onClose={closeModal}
                initialMode={modalMode}
            />
        </div>
    );
}

export default LoadingPage;
