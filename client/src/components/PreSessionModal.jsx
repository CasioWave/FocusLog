import { useState, useEffect } from 'react';

export default function PreSessionModal({ onStart, onCancel, config }) {
  const [goal, setGoal] = useState('');
  const [stance, setStance] = useState('INGESTION');
  const [type, setType] = useState('countdown'); // 'countdown' | 'infinite'
  const [duration, setDuration] = useState(25); // in minutes
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.topics && Object.keys(data.topics).length > 0) {
          const keys = Object.keys(data.topics);
          setTags(keys);
          setSelectedTag(keys[0]);
        } else if (data.tags) {
          setTags(data.tags);
          if (data.tags.length > 0) setSelectedTag(data.tags[0]);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!goal.trim()) {
      alert("Please specify what you will be working on.");
      return;
    }
    onStart({
      goal,
      type,
      duration: type === 'countdown' ? duration * 60 : 0,
      tag: selectedTag,
      energy,
      stress,
      stance: config?.enableEpistemicTracking ? stance : null
    });
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content">
        <h2>Start Focus Session</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>What are you working on?</label>
            <input 
              type="text" 
              value={goal} 
              onChange={e => setGoal(e.target.value)} 
              placeholder="e.g. Read Chapter 4 of Quantum Mechanics"
              autoFocus
              required
              className="md-input"
            />
          </div>

          <div className="form-group">
            <label>Tag</label>
            <div className="tag-row">
              <select 
                value={selectedTag} 
                onChange={e => setSelectedTag(e.target.value)}
                className="md-input"
              >
                {tags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Timer Type</label>
            <div className="radio-group" style={{ display: 'flex', gap: '16px' }}>
              <label>
                <input 
                  type="radio" 
                  name="type" 
                  value="countdown" 
                  checked={type === 'countdown'} 
                  onChange={() => setType('countdown')} 
                />
                Countdown
              </label>
              <label>
                <input 
                  type="radio" 
                  name="type" 
                  value="infinite" 
                  checked={type === 'infinite'} 
                  onChange={() => setType('infinite')} 
                />
                Infinite Stopwatch
              </label>
            </div>
          </div>

          {type === 'countdown' && (
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input 
                type="number" 
                min="1" 
                value={duration} 
                onChange={e => setDuration(parseInt(e.target.value))}
                className="md-input"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Energy Level ({energy}/5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={energy} 
                onChange={e => setEnergy(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                <span>Exhausted</span>
                <span>Wired</span>
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Stress Level ({stress}/5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={stress} 
                onChange={e => setStress(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                <span>Calm</span>
                <span>Overwhelmed</span>
              </div>
            </div>
          </div>

          {config?.enableEpistemicTracking && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Initial Epistemic Stance</label>
              <select 
                value={stance} 
                onChange={e => setStance(e.target.value)}
                className="md-input"
              >
                <option value="INGESTION">Ingestion (Reading, lit review)</option>
                <option value="SYMBOL_MANIPULATION">Symbol Manipulation / Derivation</option>
                <option value="SENSE_MAKING">Sense-Making / Sanity Checking</option>
                <option value="TRANSLATION">Translation / Implementation</option>
              </select>
            </div>
          )}

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
            <button type="button" onClick={onCancel} className="md-button md-button-secondary">Cancel</button>
            <button type="submit" className="md-button">Start Timer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
