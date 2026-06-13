import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export default function ManualSessionModal({ onClose, onSave }) {
  const [goal, setGoal] = useState('');
  const [tag, setTag] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sfi, setSfi] = useState(50);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setAvailableTags(data.tags);
        if (data.tags.length > 0) setTag(data.tags[0]);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goal || !tag || !startTime || !endTime) return;
    
    const start = new Date(startTime).toISOString();
    const end = new Date(endTime).toISOString();
    const durationActual = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    
    if (durationActual <= 0) {
      alert("End time must be after start time");
      return;
    }

    const sessionData = {
      goal, tag, type: 'manual', startTime: start, endTime: end, durationActual, sfi, distractions: []
    };

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      if (onSave) onSave();
      else onClose();
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Log Manual Session</h2>
          <button className="icon-btn" onClick={onClose} type="button"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Goal</label>
            <input type="text" className="md-input" value={goal} onChange={e => setGoal(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Tag</label>
            <select className="md-input" value={tag} onChange={e => setTag(e.target.value)} required>
              {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Start Time</label>
            <input type="datetime-local" className="md-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input type="datetime-local" className="md-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Focus Quality (SFI): {sfi}</label>
            <input type="range" min="0" max="100" value={sfi} onChange={e => setSfi(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button type="button" className="md-button md-button-secondary" style={{ marginRight: '16px' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="md-button"><Save size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
