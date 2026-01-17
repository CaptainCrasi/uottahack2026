import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InputArea from './components/InputArea';
import AuthModal from './components/AuthModal';
import { supabase } from './supabase';
import textLogo from './assets/marketsnipe_text_logo.png';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

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
    console.log("User sent:", text);
    // In a real app, this would trigger navigation to the chat view
    alert("This is a demo of Audience Discovery. Searching for: " + text);
  };

  const openMarketGapTool = () => {
    if (!user) {
      setModalMode('signup');
      setIsModalOpen(true);
      return;
    }
    alert("Opening Market Gap Discovery Tool (WOW Feature)!");
  };

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
    </div>
  );
}

export default App;
