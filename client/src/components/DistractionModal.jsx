import { useState } from 'react';

export default function DistractionModal({ onLog, onCancel }) {
  const [cause, setCause] = useState('');
  const [type, setType] = useState('internal'); // 'internal' | 'external'

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
