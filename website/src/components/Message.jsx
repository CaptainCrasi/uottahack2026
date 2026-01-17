import React from 'react';
import './Message.css';

const Message = ({ role, content }) => {
    const isAi = role === 'assistant';

    return (
        <div className={`message-wrapper ${isAi ? 'ai-message' : 'user-message'}`}>
            <div className="message-content">
                <div className={`avatar ${isAi ? 'ai-avatar' : 'user-avatar-msg'}`}>
                    {isAi ? 'AI' : 'TL'}
                </div>
                <div className="text-content">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default Message;
