import { useState } from 'react';
import { Save, Coffee } from 'lucide-react';

export default function PostSessionModal({ onSave }) {
  const [notes, setNotes] = useState('');
  const [breakDuration, setBreakDuration] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("[PostSessionModal] Submit clicked", { notes, breakDuration });
    try {
      onSave(notes, breakDuration);
    } catch(err) {
      console.error("[PostSessionModal] Error calling onSave:", err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Session Complete!</h2>
        <p style={{ marginBottom: '24px', color: 'var(--md-sys-color-on-surface-variant)' }}>How did this session go? Any notes you want to keep?</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <textarea 
              className="md-input" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={4} 
              placeholder="e.g. Struggled with the second problem, but managed to focus deeply towards the end..."
            />
          </div>
          
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Coffee size={16}/> Intended Break Duration (minutes)</label>
            <input 
              type="number" 
              className="md-input" 
              value={breakDuration} 
              onChange={e => setBreakDuration(parseInt(e.target.value) || 0)} 
              min="0"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="md-button md-button-secondary" style={{ marginRight: '16px' }} onClick={() => onSave('', breakDuration)}>Skip</button>
            <button type="submit" className="md-button"><Save size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> Save Notes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
