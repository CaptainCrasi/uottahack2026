import React, { useState, useRef, useEffect } from 'react';
import './InputArea.css';

const InputArea = ({ onSend }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    return (
        <div className="input-area-wrapper-guest">
            <div className="input-main-container">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Describe your product and what problem you're solving..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <div className="input-actions-row">
                    <div className="input-actions-left">
                        {/* Actions removed */}
                    </div>

                    <div className="input-actions-right">
                        <button
                            className={`send-btn ${!input.trim() ? 'disabled' : ''}`}
                            onClick={handleSend}
                            disabled={!input.trim()}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
