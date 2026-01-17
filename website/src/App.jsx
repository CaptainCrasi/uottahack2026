import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Message from './components/Message';
import InputArea from './components/InputArea';
import './App.css'; // We will create this for layout

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI assistant. How can I help you today?' }
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text) => {
    // Add user message
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm a demo AI. I can't actually think yet, but I look nice and green! \n\nCheck out this unique professional interface."
      }]);
    }, 1000);
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-chat">
        <div className="messages-container">
          {messages.map((msg, idx) => (
            <Message key={idx} role={msg.role} content={msg.content} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area-wrapper">
          <InputArea onSend={handleSend} />
        </div>
      </main>
    </div>
  );
}

export default App;
