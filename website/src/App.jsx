import React from 'react';
import Header from './components/Header';
import InputArea from './components/InputArea';
import './App.css';

function App() {
  const handleSend = (text) => {
    console.log("User sent:", text);
    // In a real app, this would trigger navigation to the chat view
    alert("This is a demo of the Guest UI. Sending: " + text);
  };

  return (
    <div className="app-container">
      <Header />

      <main className="main-content">
        <h1 className="hero-text">What can I help with?</h1>

        <div className="input-centering-container">
          <InputArea onSend={handleSend} />
        </div>
      </main>

      <footer className="footer-disclaimer">
        By messaging ChatGPT, an AI chatbot, you agree to our <a href="#">Terms</a> and have read our <a href="#">Privacy Policy</a>. See <a href="#">Cookie Preferences</a>.
      </footer>
    </div>
  );
}

export default App;
