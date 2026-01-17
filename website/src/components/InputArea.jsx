import React, { useState } from 'react';
import './InputArea.css';

const InputArea = ({ onSend }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="input-area-wrapper-guest">
            <div className="input-main-container">
                <textarea
                    rows={1}
                    placeholder="Ask anything"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <div className="input-actions-row">
                    <div className="input-actions-left">
                        <button className="action-pill">
                            <span className="icon">📎</span> Attach
                        </button>
                        <button className="action-pill">
                            <span className="icon">🌐</span> Search
                        </button>
                        <button className="action-pill">
                            <span className="icon">🎓</span> Study
                        </button>
                        <button className="action-pill">
                            <span className="icon">🖼️</span> Create image
                        </button>
                    </div>

                    <div className="input-actions-right">
                        <button className="action-pill voice-btn" title="Voice Mode">
                            <span className="icon">|||</span> Voice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
