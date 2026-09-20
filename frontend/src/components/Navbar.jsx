import React from 'react';

export default function Navbar({ user, onLogout }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--border-color)',
      background: '#0b1120',
      padding: '16px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: 'var(--primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '0.95rem'
        }}>
          AI
        </div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.2px' }}>
          AI Resume System with smart suggestions: webapplication using AI to improves resumes
        </h1>

      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            User: <strong style={{ color: '#ffffff' }}>{user.full_name || user.email}</strong>
          </div>
          <button 
            onClick={onLogout}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
