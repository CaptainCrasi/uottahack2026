import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import InputArea from './components/InputArea';
import AuthModal from './components/AuthModal';
import textLogo from './assets/marketsnipe_text_logo.png';
import './App.css';

import HistorySidebar from './components/HistorySidebar';

function App() {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const navigate = useNavigate();

  // State for projects
  const [projects, setProjects] = useState([]);
  const [savedComments, setSavedComments] = useState([]);

  // Supabase keys
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

  // Fetch projects from Supabase
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

  // Fetch projects when user changes
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
  };

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <h1 style={{ color: '#ff4a4a' }}>Configuration Error</h1>
        <p>Environment files missing. Please check your .env file.</p>
        <p style={{ fontSize: '0.9rem', color: '#888' }}>Required: VITE_SUPABASE_URL, VITE_SUPABASE_KEY</p>
      </div>
    );
  }

  const handleSend = async (text) => {
    if (!user) {
      setModalMode('signup');
      setIsModalOpen(true);
      return;
    }
    
    setLoading(true);
    setStatusMessage('Generating Reddit scrape prompt...');
    setGeneratedPrompt(''); // Reset prompt

    try {
      const { data, error } = await supabase.functions.invoke('generate-keywords', {
        body: { input: text }
      });

      if (error) throw error;

      if (data && data.prompt) {
        setGeneratedPrompt(data.prompt);
        setStatusMessage('Prompt generated successfully!');
      } else {
        setStatusMessage('No prompt generated.');
      }
    } catch (err) {
      console.error('Error generating keywords:', err);
      setStatusMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openMarketGapTool = () => {
    if (!user) {
      setModalMode('signup');
      setIsModalOpen(true);
      return;
    }
    navigate('/loading');
  };

  return (
    <div className="app-container">
      <Header
        user={user}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onLogoutClick={handleLogout}
        onHistoryClick={() => setIsHistoryOpen(true)}
      />

      <main className="main-content">
        <h1 className="hero-text">Audience Discovery</h1>

        <div className="by-line">
          <span style={{ color: '#048d7b', marginRight: '8px', fontSize: '1rem', fontWeight: 500 }}>by</span>
          <img src={textLogo} alt="MarketSnipe" style={{ height: '24px', verticalAlign: 'middle', filter: 'brightness(0.9)' }} />
        </div>

        <div className="input-centering-container">
          <InputArea onSend={handleSend} />
        </div>

        {/* Status and Results Display */}
        <div style={{ maxWidth: '800px', margin: '20px auto', textAlign: 'center', color: '#c5c5d2' }}>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '1.2rem' }}>✨ {statusMessage}</div>
                    {/* Simple loader */}
                    <div style={{ width: '20px', height: '20px', border: '2px solid #565869', borderTopColor: '#10a37f', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
            )}

            {!loading && !generatedPrompt && statusMessage && (
                <div style={{ marginTop: '20px', color: statusMessage.startsWith('Error') ? '#ff4a4a' : '#c5c5d2' }}>
                    {statusMessage}
                </div>
            )}
            
            {!loading && generatedPrompt && (
              <div style={{ marginTop: '20px', backgroundColor: '#444654', padding: '20px', borderRadius: '8px', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, color: '#fff' }}>Reddit Scrape Prompt:</h3>
                <p style={{ color: '#e5e5f0', lineHeight: 1.6 }}>{generatedPrompt}</p>
              </div>
            )}
        </div>

        <div className="feature-promotion">
          <button className="wow-feature-btn" onClick={openMarketGapTool}>
            ✨ Find A Gap In The Market
          </button>
        </div>
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

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyItems={projects}
        savedComments={savedComments}
      />
    </div>
  );
}

export default App;
