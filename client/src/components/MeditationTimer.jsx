import { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Wind, Trash2, Target, Trophy } from 'lucide-react';
import { io } from 'socket.io-client';
import NoiseGenerator from '../utils/NoiseGenerator';
import Heatmap from './Heatmap';

const socket = io('/', {
  auth: { password: localStorage.getItem('focuslog_password') || '' }
});

export default function MeditationTimer({ refreshKey, config }) {
  const [globalState, setGlobalState] = useState({ state: 'idle' });
  const [durationMins, setDurationMins] = useState(15);
  const [noiseType, setNoiseType] = useState('brown');
  const [gongIntervalMins, setGongIntervalMins] = useState(5);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(false);
  
  const [elapsed, setElapsed] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [earlyReason, setEarlyReason] = useState('');
  const [rating, setRating] = useState(8);
  const [isEarly, setIsEarly] = useState(false);

  const [data, setData] = useState({ meditations: [] });
  const [fetchKey, setFetchKey] = useState(0);

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const nextGongTimeRef = useRef(0);

  useEffect(() => {
    if (globalState.state === 'idle') {
      fetch('/api/data')
        .then(res => res.json())
        .then(d => setData({ meditations: d.meditations || [] }))
        .catch(console.error);
    }
  }, [globalState.state, refreshKey, fetchKey]);

  useEffect(() => {
    socket.on('sync', (state) => {
      // Only process if it's a meditation session or idle
      if (state.state !== 'idle' && state.mode !== 'meditation') return;
      
      setGlobalState(state);
      if (state.state === 'running') {
        setDurationMins(state.sessionData.duration);
        setNoiseType(state.sessionData.noiseType);
        setGongIntervalMins(state.sessionData.gongInterval);
        
        // Auto-enable audio if this is the initiator and they just started it
        if (state.initiator === socket.id && elapsed === 0) {
          setLocalAudioEnabled(true);
        }
      } else if (state.state === 'finished') {
        setLocalAudioEnabled(false);
        NoiseGenerator.stopNoise();
        if (audioRef.current) { audioRef.current.pause(); }
        
        // Show post-session modal if we were tracking it
        if (elapsed > 0 && !showPostModal && state.finishingDevice === socket.id) {
          const expectedSecs = state.sessionData.duration * 60;
          setIsEarly(elapsed < expectedSecs - 5);
          setShowPostModal(true);
        }
      } else if (state.state === 'idle') {
        setElapsed(0);
        setLocalAudioEnabled(false);
        NoiseGenerator.stopNoise();
        if (audioRef.current) { audioRef.current.pause(); }
      }
    });
    return () => socket.off('sync');
  }, [elapsed, showPostModal]);

  useEffect(() => {
    if (globalState.state === 'running') {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - globalState.startTime) / 1000);
        setElapsed(diff);

        const expectedSecs = globalState.sessionData.duration * 60;
        
        // Handle Gongs
        if (globalState.sessionData.gongInterval > 0 && diff > 0) {
           const gongSecs = globalState.sessionData.gongInterval * 60;
           if (diff % gongSecs === 0 && diff !== nextGongTimeRef.current) {
             nextGongTimeRef.current = diff;
             if (localAudioEnabled) NoiseGenerator.playSyntheticGong(440, 'triangle');
           }
        }

        if (diff >= expectedSecs) {
          if (localAudioEnabled) NoiseGenerator.playSyntheticGong(220, 'sine'); // End bell
          socket.emit('stopEarly'); // Actually just ends it
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [globalState, localAudioEnabled]);

  // Handle local audio playing
  useEffect(() => {
    if (globalState.state === 'running' && localAudioEnabled) {
      if (config?.meditationSoundPath) {
        if (!audioRef.current) {
          audioRef.current = new Audio(`/api/audio?path=${encodeURIComponent(config.meditationSoundPath)}`);
          audioRef.current.loop = true;
        }
        audioRef.current.play().catch(e => console.error("Audio playback failed", e));
      } else {
        if (noiseType !== 'none') {
          NoiseGenerator.playNoise(noiseType);
        }
      }
    } else {
      NoiseGenerator.stopNoise();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    
    return () => {
      NoiseGenerator.stopNoise();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [globalState.state, localAudioEnabled, noiseType, config]);

  const startMeditation = () => {
    socket.emit('startSession', {
      mode: 'meditation',
      duration: durationMins,
      noiseType,
      gongInterval: gongIntervalMins
    });
  };

  const stopMeditation = () => {
    socket.emit('stopEarly');
  };

  const saveSession = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/meditations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(globalState.startTime).toISOString(),
          endTime: new Date().toISOString(),
          durationActual: elapsed,
          intendedDuration: globalState.sessionData.duration * 60,
          noiseType: globalState.sessionData.noiseType,
          notes,
          earlyReason: isEarly ? earlyReason : null,
          rating,
          isEarly
        })
      });
      setShowPostModal(false);
      setNotes('');
      setEarlyReason('');
      setRating(8);
      socket.emit('finalizeSession', 0); // Reset to idle
      setFetchKey(prev => prev + 1); // trigger refetch
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to delete this meditation log?")) return;
    try {
      await fetch(`/api/meditations/${id}`, { method: 'DELETE' });
      setFetchKey(prev => prev + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (globalState.state === 'idle' || globalState.mode !== 'meditation') {
    const totalMins = Math.round(data.meditations.reduce((acc, m) => acc + (m.durationActual || 0), 0) / 60);
    const avgRating = data.meditations.length > 0 
      ? (data.meditations.reduce((acc, m) => acc + (m.rating || 0), 0) / data.meditations.length).toFixed(1)
      : 'N/A';

    const today = new Date();
    today.setHours(0,0,0,0);
    const currentDayOfWeek = today.getDay() || 7; 
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDayOfWeek + 1);

    let todayMins = 0;
    let todaySessions = 0;
    let weekMins = 0;
    let weekSessions = 0;
    let longestSession = 0;

    const map = {};
    for(let i=0; i<364; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map[dStr] = 0;
    }

    data.meditations.forEach(m => {
       const mDate = new Date(m.startTime);
       const dStr = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}-${String(mDate.getDate()).padStart(2, '0')}`;
       const mins = (m.durationActual || 0) / 60;
       
       if (map[dStr] !== undefined) map[dStr] += mins;
       if (mDate.getTime() >= today.getTime()) { todayMins += mins; todaySessions++; }
       if (mDate.getTime() >= weekStart.getTime()) { weekMins += mins; weekSessions++; }
       if (mins > longestSession) longestSession = mins;
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDays = Object.keys(map).sort();
    for (let i = 0; i < sortedDays.length; i++) {
      if (map[sortedDays[i]] > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        if (i === sortedDays.length - 1) currentStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    const renderProgressBar = (label, current, target, suffix = '') => {
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      return (
        <div style={{ marginBottom: '16px', fontSize: '0.9rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', opacity: 0.8 }}>
            <span>{label}</span>
            <span>{Math.round(current)} / {target}{suffix}</span>
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--md-sys-color-surface-variant)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--md-sys-color-primary)', transition: 'width 0.5s' }} />
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="md-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            <Wind size={28} /> Meditation
          </h2>
          
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Duration (Minutes)</label>
            <input type="number" className="md-input" value={durationMins} onChange={e => setDurationMins(parseInt(e.target.value) || 1)} min="1" />
          </div>
          
          <div className="form-group" style={{ textAlign: 'left', marginTop: '16px' }}>
            <label>Gong Interval (Minutes)</label>
            <input type="number" className="md-input" value={gongIntervalMins} onChange={e => setGongIntervalMins(parseInt(e.target.value) || 0)} min="0" />
            <small style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Set to 0 for no interval gongs.</small>
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginTop: '16px' }}>
            <label>Ambient Noise</label>
            <select className="md-input" value={noiseType} onChange={e => setNoiseType(e.target.value)}>
              <option value="none">No Sound</option>
              <option value="white">White Noise</option>
              <option value="pink">Pink Noise</option>
              <option value="brown">Brown Noise</option>
              <option value="rain">Synthetic Rain</option>
            </select>
            {config?.meditationSoundPath && <small style={{ color: 'var(--md-sys-color-primary)' }}>Overridden by custom MP3 in settings.</small>}
          </div>

          <button className="md-button" style={{ marginTop: '32px', width: '100%', fontSize: '18px', padding: '16px' }} onClick={startMeditation}>
            Begin Meditation
          </button>
        </div>

        {/* Heatmap */}
        <div style={{ width: '100%', maxWidth: '800px', margin: '16px auto 0' }}>
          <Heatmap sessions={data.meditations} />
        </div>

        {/* Goals & Streaks */}
        <div style={{ display: 'flex', gap: '32px', width: '100%', maxWidth: '800px', margin: '16px auto 32px', opacity: 0.9 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}><Target size={16}/> Goals</h4>
            {(config?.meditationDailyTargetMinutes > 0) && renderProgressBar("Daily Mins", todayMins, config.meditationDailyTargetMinutes, 'm')}
            {(config?.meditationWeeklyTargetMinutes > 0) && renderProgressBar("Weekly Mins", weekMins, config.meditationWeeklyTargetMinutes, 'm')}
            {(config?.meditationDailyTargetSessions > 0) && renderProgressBar("Daily Sessions", todaySessions, config.meditationDailyTargetSessions)}
            {(config?.meditationWeeklyTargetSessions > 0) && renderProgressBar("Weekly Sessions", weekSessions, config.meditationWeeklyTargetSessions)}
          </div>
          <div style={{ flex: 1 }}>
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}><Trophy size={16}/> Consistency & Bests</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Current Streak</span> <strong>{currentStreak} Days</strong></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Longest Streak</span> <strong>{longestStreak} Days</strong></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Longest Session</span> <strong>{Math.round(longestSession)}m</strong></div>
             </div>
          </div>
        </div>

        {/* Meditation Stats Dashboard */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div className="md-card">
            <h4>Total Meditation Time</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>
              {totalMins} mins
            </div>
          </div>
          <div className="md-card">
            <h4>Total Sessions</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>
              {data.meditations.length}
            </div>
          </div>
          <div className="md-card">
            <h4>Average Rating</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>
              {avgRating} {avgRating !== 'N/A' && <span style={{ fontSize: '1rem', color: 'var(--md-sys-color-on-surface-variant)' }}>/ 10</span>}
            </div>
          </div>
        </div>
        
        <div className="md-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Meditation Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.meditations.length === 0 ? (
              <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>No meditation sessions logged yet.</p>
            ) : [...data.meditations].sort((a,b) => new Date(b.startTime) - new Date(a.startTime)).map(m => (
              <div key={m.id} style={{ padding: '16px', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{new Date(m.startTime).toLocaleString()}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Duration: {Math.round((m.durationActual || 0) / 60)} mins • Noise: {m.noiseType} {m.rating ? `• Rating: ${m.rating}/10` : ''}
                  </div>
                  {m.notes && (
                    <div style={{ marginTop: '8px', fontStyle: 'italic', borderLeft: '2px solid var(--md-sys-color-primary)', paddingLeft: '8px' }}>
                      "{m.notes}"
                    </div>
                  )}
                  {m.isEarly && (
                    <div style={{ marginTop: '8px', color: 'var(--md-sys-color-error)', fontSize: '0.85rem' }}>
                      <strong>Ended Early:</strong> {m.earlyReason}
                    </div>
                  )}
                </div>
                <button 
                  className="icon-btn" 
                  onClick={() => handleDeleteSession(m.id)}
                  title="Delete Session"
                  style={{ color: 'var(--md-sys-color-error)', marginLeft: '16px' }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const expectedSecs = (globalState.sessionData?.duration || 0) * 60;
  const remaining = Math.max(0, expectedSecs - elapsed);

  return (
    <div className="md-card timer-active-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-surface-variant)' }}>Meditating...</h3>
        <button 
          className="icon-btn" 
          onClick={() => setLocalAudioEnabled(!localAudioEnabled)}
          style={{ color: localAudioEnabled ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)' }}
          title={localAudioEnabled ? "Mute local audio" : "Play audio on this device"}
        >
          {localAudioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </div>

      <div style={{ fontSize: '4rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--md-sys-color-primary)', margin: '32px 0' }}>
        {formatTime(remaining)}
      </div>

      <button className="md-button md-button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }} onClick={stopMeditation}>
        <Square size={20} /> End Early
      </button>

      {/* Post Session Modal */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="md-card modal-content">
            <h2 style={{ marginBottom: '16px' }}>Session Complete</h2>
            <form onSubmit={saveSession}>
              {isEarly && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ color: 'var(--md-sys-color-error)' }}>Reason for ending early</label>
                  <input type="text" className="md-input" required value={earlyReason} onChange={e => setEarlyReason(e.target.value)} placeholder="e.g. Too restless, interruption..." />
                </div>
              )}
              <div className="form-group">
                <label>How did the session go?</label>
                <textarea className="md-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Briefly describe your experience..." />
              </div>
              
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Session Rating</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>{rating}/10</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={rating} 
                  onChange={e => setRating(parseInt(e.target.value))} 
                  style={{ width: '100%', marginTop: '8px' }} 
                />
              </div>

              <button type="submit" className="md-button" style={{ marginTop: '24px', width: '100%' }}>Save Session</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
