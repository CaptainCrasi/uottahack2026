import React from 'react';
import Header from './components/Header';
import InputArea from './components/InputArea';
import './App.css';

function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

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
    console.log("User sent:", text);
    // In a real app, this would trigger navigation to the chat view
    alert("This is a demo of Audience Discovery. Searching for: " + text);
  };

  const openMarketGapTool = () => {
    alert("Opening Market Gap Discovery Tool (WOW Feature)!");
  };

  return (
    <div className="app-container">
      <Header />

      <main className="main-content">
        <h1 className="hero-text">Audience Discovery</h1>

        <div className="input-centering-container">
          <InputArea onSend={handleSend} />
        </div>

        <div className="feature-promotion">
          <button className="wow-feature-btn" onClick={openMarketGapTool}>
            ✨ Try Market Gap Discovery Tool
          </button>
        </div>
      </main>

      <footer className="footer-disclaimer">
        Powered by Yellowcake Reddit Scanning Technology.
        <br />
        By matching, you agree to our <a href="#">Terms</a>.
      </footer>
    </div>
  );
}

export default App;
