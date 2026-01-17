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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

  // Dummy history data
  const historyData = [
    { id: 1, query: "Eco-friendly packaging for cosmetics", date: "Today, 10:23 AM", matches: 12, status: "completed" },
    { id: 2, query: "AI tools for legal document review", date: "Yesterday, 4:45 PM", matches: 8, status: "saved" },
    { id: 3, query: "Subscription box for pet owners", date: "Jan 15, 2:30 PM", matches: 24, status: "completed" },
    { id: 4, query: "Vertical farming equipment", date: "Jan 14, 11:15 AM", matches: 0, status: "pending" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleSend = (text) => {
    if (!user) {
      setModalMode('signup');
      setIsModalOpen(true);
      return;
    }

    // Redirect to loading page
    navigate('/loading');
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
        historyItems={historyData}
      />
    </div>
  );
}

export default App;
