/**
 * Sidebar - Collapsible conversation history
 * Hidden by default, toggled via header menu button
 */

import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isOpen,
  onClose,
}) {
  const handleConversationClick = (id) => {
    onSelectConversation(id);
    onClose();
  };

  const handleNewConversation = () => {
    onNewConversation();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
        aria-label="Conversation history"
      >
        <div className="sidebar-header">
          <h2 className="sidebar-title">History</h2>
          <button
            className="sidebar-close btn-ghost"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          <button
            className="new-conversation-btn"
            onClick={handleNewConversation}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New conversation
          </button>

          <div className="conversation-list">
            {conversations.length === 0 ? (
              <div className="empty-state">
                <p>No conversations yet</p>
                <span>Start a new conversation to begin</span>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`conversation-item ${
                    conv.id === currentConversationId ? 'conversation-item--active' : ''
                  }`}
                  onClick={() => handleConversationClick(conv.id)}
                >
                  <span className="conversation-title">
                    {conv.title || 'New conversation'}
                  </span>
                  <span className="conversation-meta">
                    {conv.message_count} {conv.message_count === 1 ? 'message' : 'messages'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
