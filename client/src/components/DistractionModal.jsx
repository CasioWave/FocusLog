import { useState, useEffect } from 'react';
import { processDistractionCloud } from '../utils/AnalyticsEngine';

export default function DistractionModal({ onLog, onCancel }) {
  const [cause, setCause] = useState('');
  const [type, setType] = useState('internal'); // 'internal' | 'external'
  const [cloud, setCloud] = useState([]);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          setCloud(processDistractionCloud(data.sessions));
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cause.trim()) {
      onLog({ cause, type });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ zIndex: 100 }}>
        <h2 style={{ color: 'var(--md-sys-color-error)' }}>Log Distraction</h2>
        <p>What caused you to lose focus?</p>
        <form onSubmit={handleSubmit}>
          {cloud.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '8px' }}>Quick Select:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {cloud.map(w => (
                  <button 
                    key={w.text} 
                    type="button" 
                    onClick={() => {
                      setCause(w.text);
                      setType(w.type);
                    }}
                    style={{ 
                      padding: '4px 12px', 
                      borderRadius: '16px', 
                      border: cause === w.text ? '2px solid var(--md-sys-color-primary)' : '1px solid var(--md-sys-color-outline)', 
                      background: 'var(--md-sys-color-surface-variant)',
                      cursor: 'pointer',
                      fontSize: `${Math.min(1.2, 0.8 + w.value * 0.05)}rem`
                    }}
                  >
                    {w.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <input 
              type="text" 
              value={cause} 
              onChange={e => setCause(e.target.value)} 
              placeholder="e.g. Phone call, Instagram..."
              autoFocus
              className="md-input"
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
            <button type="button" onClick={onCancel} className="md-button md-button-secondary">Cancel</button>
            <button type="button" onClick={(e) => { e.preventDefault(); if (cause.trim()) onLog({ cause, type: 'internal' }); }} className="md-button" style={{ backgroundColor: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)' }}>
              Internal
            </button>
            <button type="button" onClick={(e) => { e.preventDefault(); if (cause.trim()) onLog({ cause, type: 'external' }); }} className="md-button" style={{ backgroundColor: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)' }}>
              External
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
