/**
 * ChatInterface - Main chat view with messages and input
 * Simplified design with tabbed response display
 */

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ResponseTabs from './ResponseTabs';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  defaultCouncil = null,
}) {
  const [input, setInput] = useState('');
  const [councilPreset, setCouncilPreset] = useState('balanced');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      // Pass council config based on preset
      onSendMessage(input, defaultCouncil);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Welcome screen when no conversation
  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="welcome-state">
          <div className="welcome-content">
            <h2>Welcome to LLM Council</h2>
            <p>
              Ask a question and get answers from multiple AI models,
              peer-reviewed and synthesized into a final response.
            </p>
            <div className="welcome-features">
              <div className="feature">
                <span className="feature-num">1</span>
                <span>Multiple models respond independently</span>
              </div>
              <div className="feature">
                <span className="feature-num">2</span>
                <span>Models rank each other anonymously</span>
              </div>
              <div className="feature">
                <span className="feature-num">3</span>
                <span>Chairman synthesizes the best answer</span>
              </div>
            </div>
          </div>
        </div>

        <form className="input-area" onSubmit={handleSubmit}>
          <div className="input-row">
            <textarea
              className="message-input"
              placeholder="Ask your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>
          <div className="input-actions">
            <select
              className="council-select"
              value={councilPreset}
              onChange={(e) => setCouncilPreset(e.target.value)}
            >
              <option value="balanced">Balanced (5 models)</option>
              <option value="fast">Fast (3 models)</option>
              <option value="deep">Deep (7 models)</option>
            </select>
            <button
              type="submit"
              className="send-btn btn btn-primary"
              disabled={!input.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation</p>
            <span>Ask a question to consult the council</span>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="message message--user">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="message message--assistant">
                  <div className="message-label">Council</div>
                  <ResponseTabs
                    stage1={msg.stage1}
                    stage2={msg.stage2}
                    stage3={msg.stage3}
                    metadata={msg.metadata}
                    loading={msg.loading}
                  />
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <div className="input-row">
          <textarea
            className="message-input"
            placeholder="Ask your question... (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={3}
          />
        </div>
        <div className="input-actions">
          <select
            className="council-select"
            value={councilPreset}
            onChange={(e) => setCouncilPreset(e.target.value)}
            disabled={isLoading}
          >
            <option value="balanced">Balanced (5 models)</option>
            <option value="fast">Fast (3 models)</option>
            <option value="deep">Deep (7 models)</option>
          </select>
          <button
            type="submit"
            className="send-btn btn btn-primary"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner spinner--small" />
                Consulting...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
