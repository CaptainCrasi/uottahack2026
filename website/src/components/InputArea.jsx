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
                        {/* Actions removed */}
                    </div>

                    <div className="input-actions-right">
                        <button className="action-pill voice-btn" title="Voice Mode">
                            <span className="icon">|||</span> Voice
                        </button>
                        <button
                            className={`send-btn ${!input.trim() ? 'disabled' : ''}`}
                            onClick={handleSend}
                            disabled={!input.trim()}
                        >
                            ➞
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
