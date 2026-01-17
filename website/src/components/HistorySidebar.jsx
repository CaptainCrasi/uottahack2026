import React from 'react';
import './HistorySidebar.css';

const HistorySidebar = ({ isOpen, onClose, historyItems = [], savedComments = [] }) => {
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
                            {historyItems.map((item) => {
                                const projectComments = savedComments.filter(c => c.project_id === item.id);
                                return (
                                    <div key={item.id} className="history-item">
                                        <div className="item-status">
                                            <span className={`status-dot ${item.status}`}></span>
                                            <span className="status-text">{item.status?.toUpperCase() || 'COMPLETED'}</span>
                                        </div>
                                        <h3 className="item-query">{item.query}</h3>
                                        <div className="item-meta">
                                            <span className="item-date">{new Date(item.created_at).toLocaleDateString()}</span>
                                            <span className="item-matches">{item.matches_count || 0} Matches</span>
                                        </div>

                                        {/* Saved Comments Section */}
                                        {projectComments.length > 0 && (
                                            <div style={{ marginTop: '0.8rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                                <p style={{ fontSize: '0.75rem', color: '#8e8ea0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Saved Findings:</p>
                                                {projectComments.map(comment => (
                                                    <div key={comment.id} style={{
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: '6px 8px',
                                                        borderRadius: '4px',
                                                        marginBottom: '6px',
                                                        fontSize: '0.8rem',
                                                        color: '#d1d5db',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {comment.comment_text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default HistorySidebar;
