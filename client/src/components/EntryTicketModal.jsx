import { useState } from 'react';

export default function EntryTicketModal({ topic, lastFrictionNote, lastSessionEndState, onSubmit }) {
  const [ticket, setTicket] = useState('');
  const [mountTime] = useState(Date.now());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticket.trim().length < 10) {
      alert("Please provide a brief 1-2 sentence summary.");
      return;
    }
    const latency = Date.now() - mountTime;
    onSubmit(ticket, latency);
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxWidth: '500px' }}>
        <h2>Entry Ticket: {topic}</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '16px' }}>
          Before starting, summarize your last state to retrieve schemas into working memory.
        </p>
        
        <div style={{ padding: '12px', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px' }}><strong>Last State:</strong> {lastSessionEndState || 'Unknown'}</div>
          {lastFrictionNote && (
            <div><strong>Last Friction Note:</strong> {lastFrictionNote}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <textarea 
              value={ticket} 
              onChange={e => setTicket(e.target.value)} 
              placeholder="e.g. Last time I was stuck on..."
              rows={3}
              required
              className="md-input"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="md-button">Submit & Unlock Timer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
