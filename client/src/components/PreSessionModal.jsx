import { useState, useEffect } from 'react';

export default function PreSessionModal({ onStart, onCancel, config, enduranceLimit }) {
  const [goal, setGoal] = useState('');
  const [stance, setStance] = useState('INGESTION');
  const [type, setType] = useState('countdown'); // 'countdown' | 'infinite'
  const [duration, setDuration] = useState(25); // in minutes
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [audioMode, setAudioMode] = useState('interval'); // 'off' | 'interval' | 'random'
  const [intervalMins, setIntervalMins] = useState(5);
  const [randomMin, setRandomMin] = useState(5);
  const [randomMax, setRandomMax] = useState(15);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.tags) {
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
      stance: config?.enableEpistemicTracking ? stance : null,
      audioMode,
      intervalMins,
      randomMin,
      randomMax
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  min="1" 
                  value={duration} 
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="md-input"
                  style={{ flex: 1 }}
                />
                {enduranceLimit > 0 && config?.enduranceStrategy === 'flow_scaffolding' && (
                  <button 
                    type="button" 
                    className="md-button md-button-secondary" 
                    onClick={() => setDuration(Math.ceil(enduranceLimit * 1.1))}
                    title={`Your historical cliff is ~${Math.floor(enduranceLimit)}m. Push +10% to build flow resilience.`}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🧠 Scaffold Target ({Math.ceil(enduranceLimit * 1.1)}m)
                  </button>
                )}
              </div>
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

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Audio Interval Bells</label>
            <select 
              value={audioMode} 
              onChange={e => setAudioMode(e.target.value)}
              className="md-input"
            >
              <option value="off">Off</option>
              <option value="interval">Regular Intervals</option>
              <option value="random">Random Intervals</option>
            </select>
          </div>

          {audioMode === 'interval' && (
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label>Interval (minutes)</label>
              <input 
                type="number" 
                min="1" 
                value={intervalMins} 
                onChange={e => setIntervalMins(parseInt(e.target.value) || 1)}
                className="md-input"
              />
            </div>
          )}

          {audioMode === 'random' && (
            <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Min Interval (mins)</label>
                <input 
                  type="number" 
                  min="1" 
                  value={randomMin} 
                  onChange={e => setRandomMin(parseInt(e.target.value) || 1)}
                  className="md-input"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Max Interval (mins)</label>
                <input 
                  type="number" 
                  min="2" 
                  value={randomMax} 
                  onChange={e => setRandomMax(parseInt(e.target.value) || 2)}
                  className="md-input"
                />
              </div>
            </div>
          )}

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
