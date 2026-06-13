import { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';

export default function EditSessionModal({ session, onClose, onSave }) {
  const [goal, setGoal] = useState(session.goal);
  const [tag, setTag] = useState(session.tag);
  const [distractions, setDistractions] = useState(session.distractions || []);
  const [newDistraction, setNewDistraction] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => setAvailableTags(data.tags));
  }, []);

  const handleAddDistraction = () => {
    if (!newDistraction) return;
    setDistractions([...distractions, { cause: newDistraction, time: new Date().toISOString() }]);
    setNewDistraction('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goal || !tag) return;
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, tag, distractions })
      });
      if (onSave) onSave();
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Edit Session</h2>
          <button className="icon-btn" type="button" onClick={onClose}><X size={24} /></button>
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
          
          <div className="form-group" style={{ marginTop: '24px' }}>
            <label>Distractions</label>
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {distractions.map((d, i) => (
                <li key={i} style={{ backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                  {new Date(d.time).toLocaleTimeString()} - {d.cause}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="md-input" value={newDistraction} onChange={e => setNewDistraction(e.target.value)} placeholder="New Distraction..." style={{ flex: 1 }} />
              <button type="button" className="md-button md-button-secondary" onClick={handleAddDistraction}><Plus size={20}/></button>
            </div>
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
