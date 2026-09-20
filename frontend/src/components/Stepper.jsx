import React from 'react';

export default function Stepper({ activeStep }) {
  const steps = [
    { number: 1, title: '1. Account & Auth' },
    { number: 2, title: '2. Upload & OCR Scan' },
    { number: 3, title: '3. AI Analysis & Matcher' },
    { number: 4, title: '4. Export & Applications' },
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: '65px',
      zIndex: 99,
      background: '#080d1a',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 40px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {steps.map((s) => {
          const isActive = activeStep === s.number;
          const isCompleted = activeStep > s.number;

          return (
            <div
              key={s.number}
              style={{
                padding: '14px 20px',
                cursor: 'default',
                userSelect: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? '#ffffff' : isCompleted ? '#34d399' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: isCompleted || isActive ? 1 : 0.6
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: isActive ? 'var(--primary)' : isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: isCompleted ? '#34d399' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                {isCompleted ? '✓' : s.number}
              </span>
              <span>{s.title}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
