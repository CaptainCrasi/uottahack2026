import React from 'react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <button className="new-chat-btn">
        <span>+</span> New chat
      </button>

      <div className="history-list">
        <div className="history-group">
          <div className="history-label">Today</div>
          <div className="history-item">Green UI Design Ideas</div>
          <div className="history-item">React Vite Migration</div>
          <div className="history-item active">UottaHack 2026 Project</div>
        </div>
        
        <div className="history-group">
          <div className="history-label">Yesterday</div>
          <div className="history-item">Debugging Next.js</div>
          <div className="history-item">Assignment 2 Req...</div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-item">
          <div className="user-avatar">TL</div>
          <div className="user-name">Tyler Le</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
