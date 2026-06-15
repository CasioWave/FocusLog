import React, { useState } from 'react';

export default function FrictionModal({ onLog, onCancel }) {
  const [note, setNote] = useState('');

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ zIndex: 100 }}>
        <h2 style={{ color: 'var(--md-sys-color-primary)' }}>Log Cognitive Friction</h2>
        <p>Where did the pipeline break down?</p>
        
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label>Optional Note (What exactly went wrong?)</label>
          <input 
            type="text" 
            value={note} 
            onChange={e => setNote(e.target.value)} 
            className="md-input" 
            placeholder="e.g. Convergence failure on boundary condition" 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
          <button 
            type="button" 
            onClick={() => onLog('Mathematical', note)} 
            className="md-button" 
            style={{ padding: '16px', fontSize: '1rem' }}
          >
            <strong>Mathematical/Computational</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal', marginTop: '4px' }}>Algebra, integral convergence, debugging...</div>
          </button>
          
          <button 
            type="button" 
            onClick={() => onLog('Conceptual', note)} 
            className="md-button" 
            style={{ padding: '16px', fontSize: '1rem', backgroundColor: 'var(--md-sys-color-secondary)' }}
          >
            <strong>Conceptual</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal', marginTop: '4px' }}>Misunderstanding physical principles...</div>
          </button>

          <button 
            type="button" 
            onClick={() => onLog('Translational', note)} 
            className="md-button" 
            style={{ padding: '16px', fontSize: '1rem', backgroundColor: 'var(--md-sys-color-tertiary)', color: 'var(--md-sys-color-on-tertiary)' }}
          >
            <strong>Translational</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal', marginTop: '4px' }}>Mapping concept to mathematical formalism...</div>
          </button>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" onClick={onCancel} className="md-button md-button-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
