/**
 * Header - App header with menu toggle and settings
 */

import './Header.css';

export default function Header({ onMenuClick, onSettingsClick }) {
  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-menu-btn btn-ghost"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <h1 className="header-title">LLM Council</h1>
      </div>

      <div className="header-right">
        <button
          className="header-settings-btn btn-ghost"
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M16.5 10c0-.34-.03-.67-.08-1l1.58-1.18-1.5-2.6-1.83.74c-.5-.42-1.07-.76-1.7-1L12.5 3h-3l-.47 1.96c-.63.24-1.2.58-1.7 1l-1.83-.74-1.5 2.6L5.58 9c-.05.33-.08.66-.08 1s.03.67.08 1L4 12.18l1.5 2.6 1.83-.74c.5.42 1.07.76 1.7 1L9.5 17h3l.47-1.96c.63-.24 1.2-.58 1.7-1l1.83.74 1.5-2.6L16.42 11c.05-.33.08-.66.08-1z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
