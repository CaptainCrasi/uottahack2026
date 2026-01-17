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

    try {
      const { data, error } = await supabase.from('projects').insert([
        {
          user_id: user.id,
          query: text,
          status: 'completed',
          matches_count: Math.floor(Math.random() * 20) // Random for demo
        }
      ]).select();

      if (error) throw error;

      const newProjectId = data[0]?.id;

      // Refresh projects list locally
      fetchProjects();

      // Redirect to loading page
      navigate('/loading', { state: { projectId: newProjectId } });

    } catch (error) {
      console.error('Error saving project:', error);
      alert("Failed to save project. Check console.");
    }
  };

  const openMarketGapTool = async () => {
    if (!user) {
      setModalMode('signup');
      setIsModalOpen(true);
      return;
    }

    try {
      const { data, error } = await supabase.from('projects').insert([
        {
          user_id: user.id,
          query: "Market Gap Discovery",
          status: 'completed',
          matches_count: Math.floor(Math.random() * 20)
        }
      ]).select();

      if (error) throw error;

      const newProjectId = data[0]?.id;

      // Refresh projects list locally
      fetchProjects();

      navigate('/loading', { state: { projectId: newProjectId } });

    } catch (error) {
      console.error('Error starting market gap tool:', error);
      navigate('/loading');
    }
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
