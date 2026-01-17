import React from 'react';
import './HistorySidebar.css';

const HistorySidebar = ({ isOpen, onClose, historyItems = [] }) => {
    return (
        <>
            {/* Backdrop for blur effect */}
            <div
                className={`history-backdrop ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div className={`history-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="history-header">
                    <h2 className="history-title">MY PROJECTS</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="history-content">
                    {historyItems.length === 0 ? (
                        <div className="empty-history">
                            <p>No snipes recorded in this sector.</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {historyItems.map((item) => (
                                <div key={item.id} className="history-item">
                                    <div className="item-status">
                                        <span className={`status-dot ${item.status}`}></span>
                                        <span className="status-text">{item.status.toUpperCase()}</span>
                                    </div>
                                    <h3 className="item-query">{item.query}</h3>
                                    <div className="item-meta">
                                        <span className="item-date">{item.date}</span>
                                        <span className="item-matches">{item.matches} Matches</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default HistorySidebar;
