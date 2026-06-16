import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Palette, Bell, Target, Lock, Database, Wind, Monitor, Download, Upload, Power, RefreshCw } from 'lucide-react';

export default function SettingsModal({ onClose, onSave }) {
  const [config, setConfig] = useState({ 
    dataPath: '', absoluteDataPath: '', dailyTargetMinutes: 240, weeklyTargetMinutes: 1200, 
    smartBreakPrompts: true, tagTargets: {}, tagColors: {}, intervalBellPath: '', endBellPath: '', 
    password: '', enableMeditation: false, meditationSoundPath: '', 
    meditationDailyTargetMinutes: 15, meditationWeeklyTargetMinutes: 60,
    meditationDailyTargetSessions: 1, meditationWeeklyTargetSessions: 3,
    theme: 'dark', accentHue: 210,
    timerStyle: 'text', showGoalsOnTimer: true,
    enabledVisualizations: { sfi: true, timeByTag: true, timeOfDay: true, heatmap: true, stressEnergy: true, timeFocused: true, tagPie: true },
    enableEpistemicTracking: false,
    enableInterleaving: false,
    cognitiveExpenditureLimit: 100,
    logRetentionDays: 7
  });
  const [tags, setTags] = useState([]);
  const [newMasterTag, setNewMasterTag] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagTarget, setNewTagTarget] = useState(60);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error);

    fetch('/api/data')
      .then(res => res.json())
      .then(d => setTags(d.tags))
      .catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPath: config.dataPath,
          dailyTargetMinutes: config.dailyTargetMinutes,
          tagTargets: config.tagTargets,
          intervalBellPath: config.intervalBellPath,
          endBellPath: config.endBellPath,
          weeklyTargetMinutes: config.weeklyTargetMinutes,
          smartBreakPrompts: config.smartBreakPrompts,
          tagColors: config.tagColors,
          password: config.password,
          enableMeditation: config.enableMeditation,
          meditationSoundPath: config.meditationSoundPath,
          meditationDailyTargetMinutes: config.meditationDailyTargetMinutes,
          meditationWeeklyTargetMinutes: config.meditationWeeklyTargetMinutes,
          meditationDailyTargetSessions: config.meditationDailyTargetSessions,
          meditationWeeklyTargetSessions: config.meditationWeeklyTargetSessions,
          theme: config.theme,
          accentHue: config.accentHue,
          timerStyle: config.timerStyle,
          showGoalsOnTimer: config.showGoalsOnTimer,
          enabledVisualizations: config.enabledVisualizations,
          enableEpistemicTracking: config.enableEpistemicTracking,
          enableInterleaving: config.enableInterleaving,
          cognitiveExpenditureLimit: config.cognitiveExpenditureLimit,
          showDailySectorChartOnTimer: config.showDailySectorChartOnTimer,
          backgroundImage: config.backgroundImage,
          customBackgroundImage: config.customBackgroundImage,
          logRetentionDays: config.logRetentionDays
        })
      });
      document.documentElement.setAttribute('data-theme', config.theme);
      document.documentElement.style.setProperty('--hue-primary', config.accentHue);
      if (onSave) onSave();
      else onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const addTagTarget = () => {
    if (!newTagName) return;
    setConfig(prev => ({
      ...prev,
      tagTargets: { ...prev.tagTargets, [newTagName]: newTagTarget }
    }));
  };

  const removeTagTarget = (tag) => {
    const newTargets = { ...config.tagTargets };
    delete newTargets[tag];
    setConfig(prev => ({ ...prev, tagTargets: newTargets }));
  };

  const addMasterTag = async () => {
    if (!newMasterTag) return;
    try {
      await fetch('/api/tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: newMasterTag })
      });
      setTags([...tags, newMasterTag]);
      setNewMasterTag('');
    } catch(e) {}
  };

  const deleteMasterTag = async (tag) => {
    try {
      await fetch(`/api/tags/${tag}`, { method: 'DELETE' });
      setTags(tags.filter(t => t !== tag));
      const newTargets = { ...config.tagTargets };
      delete newTargets[tag];
      setConfig(prev => ({ ...prev, tagTargets: newTargets }));
    } catch(e) {}
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--md-sys-color-outline)' }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: '400px' }}>
          {/* Sidebar Tabs */}
          <div style={{ width: '200px', borderRight: '1px solid var(--md-sys-color-outline)', padding: '16px 0' }}>
            {[
              { id: 'general', label: 'General', icon: <Database size={18} /> },
              { id: 'advanced', label: 'Advanced Features', icon: <Monitor size={18} /> },
              { id: 'visuals', label: 'Themes & UI', icon: <Palette size={18} /> },
              { id: 'tags', label: 'Tags & Targets', icon: <Target size={18} /> },
              { id: 'audio', label: 'Audio & Meditation', icon: <Wind size={18} /> },
              { id: 'security', label: 'Security', icon: <Lock size={18} /> },
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  width: '100%', padding: '12px 24px', textAlign: 'left', background: activeTab === t.id ? 'var(--md-sys-color-surface-variant)' : 'transparent',
                  border: 'none', color: activeTab === t.id ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: activeTab === t.id ? 600 : 400
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <form id="settings-form" onSubmit={handleSave}>
              
              {activeTab === 'general' && (
                <div className="timer-active-card">
                  <div className="form-group">
                    <label>Data File Absolute Path</label>
                    <input 
                      type="text" 
                      className="md-input" 
                      value={config.dataPath} 
                      onChange={e => setConfig({...config, dataPath: e.target.value})}
                      placeholder="/home/user/Dropbox/focus_data.json"
                    />
                    <small style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Current resolved path: {config.absoluteDataPath}</small>
                  </div>
                  
                  <div className="form-group" style={{ marginTop: '24px' }}>
                    <label>Daily Overall Target (minutes)</label>
                    <input 
                      type="number" 
                      className="md-input" 
                      value={config.dailyTargetMinutes} 
                      onChange={e => setConfig({...config, dailyTargetMinutes: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>Weekly Overall Target (minutes)</label>
                    <input 
                      type="number" 
                      className="md-input" 
                      value={config.weeklyTargetMinutes} 
                      onChange={e => setConfig({...config, weeklyTargetMinutes: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={config.smartBreakPrompts} 
                      onChange={e => setConfig({...config, smartBreakPrompts: e.target.checked})}
                    />
                    <label style={{ margin: 0 }}>Enable Smart Break Prompts</label>
                  </div>

                  <hr style={{ borderTop: '1px solid var(--md-sys-color-outline)', margin: '24px 0', opacity: 0.2 }} />

                  <h3 style={{ marginBottom: '16px' }}>Data Management</h3>
                  
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Log Retention (Days)</label>
                    <input 
                      type="number" 
                      className="md-input" 
                      value={config.logRetentionDays ?? 7} 
                      onChange={e => setConfig({...config, logRetentionDays: parseInt(e.target.value) || 7})}
                      min="1"
                    />
                    <small style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Logs older than this will be automatically deleted to save space.</small>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className="md-button md-button-secondary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/export');
                          const data = await res.json();
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `focuslog_backup_${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          alert('Export failed');
                        }
                      }}
                    >
                      <Download size={18} /> Export Backup
                    </button>
                    
                    <label className="md-button md-button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <Upload size={18} /> Import Backup
                      <input 
                        type="file" 
                        accept=".json" 
                        style={{ display: 'none' }} 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          try {
                            const text = await file.text();
                            const payload = JSON.parse(text);
                            const res = await fetch('/api/import', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'x-focuslog-password': password },
                              body: JSON.stringify(payload)
                            });
                            const result = await res.json();
                            if (result.success) {
                              alert(`Import successful! Action taken: ${result.action}. A backup of previous data was saved to ${result.backup}`);
                              window.location.reload();
                            } else {
                              alert('Import failed: ' + result.error);
                            }
                          } catch (err) {
                            alert('Invalid JSON file');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    
                    <button 
                      type="button" 
                      className="md-button" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)' }}
                      onClick={async () => {
                        const confirmed = window.confirm("Are you absolutely sure you want to wipe all local data? This will delete all your sessions, tags, and topics permanently (a backup file will be created just in case).");
                        if (confirmed) {
                          try {
                            const password = localStorage.getItem('focuslog_password') || '';
                            const res = await fetch('/api/data', { 
                              method: 'DELETE',
                              headers: { 'x-focuslog-password': password }
                            });
                            const result = await res.json();
                            if (result.success) {
                              alert(`Data wiped successfully. A backup was saved to ${result.backup}`);
                              window.location.reload();
                            } else {
                              alert('Failed to wipe data: ' + (result.error || 'Unknown error'));
                            }
                          } catch (err) {
                            alert('Failed to wipe data: ' + err.message);
                          }
                        }
                      }}
                    >
                      <Trash2 size={18} /> Wipe All Data
                    </button>
                  </div>

                  <h3 style={{ marginBottom: '16px', marginTop: '32px', color: 'var(--md-sys-color-error)' }}>System Controls</h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <button 
                      className="md-button md-button-secondary"
                      style={{ flex: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', borderColor: '#ff9800' }}
                      onClick={async () => {
                        const confirmed = window.confirm("Are you sure you want to restart the background server?");
                        if (confirmed) {
                          try {
                            const password = localStorage.getItem('focuslog_password') || '';
                            const res = await fetch('/api/system/restart', { method: 'POST', headers: { 'x-focuslog-password': password } });
                            const result = await res.json();
                            if (result.success) {
                              alert("Server is restarting. The page will reload in a few seconds.");
                              setTimeout(() => window.location.reload(), 3000);
                            } else {
                              alert('Failed to restart: ' + (result.error || 'Unknown error'));
                            }
                          } catch (err) {
                            alert('Failed to restart: ' + err.message);
                          }
                        }
                      }}
                    >
                      <RefreshCw size={18} /> Restart Server
                    </button>

                    <button 
                      className="md-button md-button-secondary"
                      style={{ flex: 1, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: 'var(--md-sys-color-error)', borderColor: 'var(--md-sys-color-error)' }}
                      onClick={async () => {
                        const confirmed = window.confirm("Are you sure you want to shutdown the background server? You will need to start it manually later.");
                        if (confirmed) {
                          try {
                            const password = localStorage.getItem('focuslog_password') || '';
                            const res = await fetch('/api/system/shutdown', { method: 'POST', headers: { 'x-focuslog-password': password } });
                            const result = await res.json();
                            if (result.success) {
                              alert("Server is shutting down. You can safely close this window.");
                              // Try to close window if allowed
                              try { window.close(); } catch(e){}
                            } else {
                              alert('Failed to shutdown: ' + (result.error || 'Unknown error'));
                            }
                          } catch (err) {
                            alert('Failed to shutdown: ' + err.message);
                          }
                        }
                      }}
                    >
                      <Power size={18} /> Shutdown Server
                    </button>
                  </div>

                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="timer-active-card">
                  <h3 style={{ marginBottom: '16px' }}>Advanced Cognitive Workflows</h3>
                  
                  <div className="form-group" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={config.enableEpistemicTracking || false} 
                      onChange={e => setConfig({...config, enableEpistemicTracking: e.target.checked})}
                    />
                    <label style={{ margin: 0, fontWeight: 'bold' }}>Enable Epistemic & Cognitive Friction Tracking</label>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', marginLeft: '24px', marginBottom: '16px' }}>
                    Enables tracking of high-friction epistemic stances (Ingestion, Symbolic, Sense-Making, Translation) and visualizes Focus Decay limits (τ).
                  </p>
                  
                  {config.enableEpistemicTracking && (
                    <div className="form-group" style={{ marginTop: '16px', marginLeft: '24px' }}>
                      <label>Cognitive Expenditure Limit (Decay Warning)</label>
                      <input 
                        type="number" 
                        value={config.cognitiveExpenditureLimit || 100} 
                        onChange={e => setConfig({...config, cognitiveExpenditureLimit: parseInt(e.target.value) || 100})}
                        className="md-input"
                        min="10" max="1000"
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={config.enableInterleaving || false} 
                      onChange={e => setConfig({...config, enableInterleaving: e.target.checked})}
                    />
                    <label style={{ margin: 0, fontWeight: 'bold' }}>Enable Algorithmic Interleaving & Spaced Retrieval</label>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', marginLeft: '24px' }}>
                    Automatically models a Priority Queue and interrupts your timer when focus capacity drops. Injects 'Entry Tickets' when returning to topics to build retrieval strength.
                  </p>
                </div>
              )}

              {activeTab === 'visuals' && (
                <div className="timer-active-card">
                  <h3 style={{ marginBottom: '16px' }}>Appearance</h3>
                  
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Color Theme</label>
                    <select className="md-input" value={config.theme} onChange={e => setConfig({...config, theme: e.target.value})}>
                      <option value="dark">Dark Theme</option>
                      <option value="light">Light Theme</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Accent Color (Hue)</span>
                      <span style={{ fontWeight: 'bold', color: `hsl(${config.accentHue || 210}, 70%, 50%)` }}>Preview</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      value={config.accentHue || 210} 
                      onChange={e => setConfig({...config, accentHue: parseInt(e.target.value)})}
                      style={{ 
                        width: '100%', 
                        marginTop: '8px', 
                        height: '12px',
                        borderRadius: '6px',
                        appearance: 'none',
                        outline: 'none',
                        background: `linear-gradient(to right, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%), hsl(180, 70%, 50%), hsl(240, 70%, 50%), hsl(300, 70%, 50%), hsl(360, 70%, 50%))` 
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Cyberpunk Pink', hue: 320 },
                        { label: 'Toxic Green', hue: 120 },
                        { label: 'Deep Ocean', hue: 210 },
                        { label: 'Sunset Orange', hue: 25 },
                        { label: 'Royal Purple', hue: 275 },
                        { label: 'Crimson Red', hue: 350 },
                      ].map(swatch => (
                        <button
                          key={swatch.hue}
                          type="button"
                          onClick={() => setConfig({...config, accentHue: swatch.hue})}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%', border: config.accentHue === swatch.hue ? '2px solid white' : 'none',
                            backgroundColor: `hsl(${swatch.hue}, 70%, 50%)`, cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                          }}
                          title={swatch.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>App Background</label>
                    <select 
                      className="md-input" 
                      value={config.backgroundImage || 'none'} 
                      onChange={e => setConfig({...config, backgroundImage: e.target.value})}
                      style={{ marginBottom: '8px' }}
                    >
                      <option value="none">Default Grid</option>
                      <option value="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop">Abstract Liquid Mesh</option>
                      <option value="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop">Deep Space Edge</option>
                      <option value="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670&auto=format&fit=crop">Subdued Cybernetic</option>
                      <option value="custom">Custom URL...</option>
                    </select>
                    {config.backgroundImage === 'custom' && (
                      <input 
                        type="text" 
                        className="md-input" 
                        placeholder="https://example.com/image.jpg"
                        value={config.customBackgroundImage || ''}
                        onChange={e => {
                          setConfig({...config, customBackgroundImage: e.target.value});
                          // Immediately apply custom bg if validish
                          if (e.target.value.startsWith('http')) {
                            document.body.style.backgroundImage = `url('${e.target.value}')`;
                            document.body.style.backgroundSize = 'cover';
                          }
                        }}
                      />
                    )}
                  </div>

                  <hr style={{ borderTop: '1px solid var(--md-sys-color-outline)', margin: '24px 0', opacity: 0.2 }} />

                  <h3 style={{ marginBottom: '16px' }}>Timer Screen</h3>
                  
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Timer Visual Style</label>
                    <select className="md-input" value={config.timerStyle || 'text'} onChange={e => setConfig({...config, timerStyle: e.target.value})}>
                      <option value="text">Massive Text</option>
                      <option value="circle">Circular Progress Ring</option>
                      <option value="analog">Analog Minimalist</option>
                      <option value="linear">Linear Drain</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <input 
                      type="checkbox" 
                      checked={config.showGoalsOnTimer !== false} 
                      onChange={e => setConfig({...config, showGoalsOnTimer: e.target.checked})}
                    />
                    <label style={{ margin: 0 }}>Show Goals & Challenge Dashboard on Timer Screen</label>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                    <input 
                      type="checkbox" 
                      checked={config.showDailySectorChartOnTimer || false} 
                      onChange={e => setConfig({...config, showDailySectorChartOnTimer: e.target.checked})}
                    />
                    <label style={{ margin: 0 }}>Show Daily Cognitive Sector Chart on Timer Screen</label>
                  </div>

                  <hr style={{ borderTop: '1px solid var(--md-sys-color-outline)', margin: '24px 0', opacity: 0.2 }} />

                  <h3 style={{ marginBottom: '16px' }}>Dashboard Visualizations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { key: 'sfi', label: 'SFI Line Chart' },
                      { key: 'timeByTag', label: 'Time by Tag Bar Chart' },
                      { key: 'timeOfDay', label: 'Time of Day Radar Chart' },
                      { key: 'heatmap', label: 'Activity Heatmap' },
                      { key: 'stressEnergy', label: 'Stress & Energy Line Chart' },
                      { key: 'timeFocused', label: 'Daily Focus Time Bar Chart' },
                      { key: 'tagPie', label: 'Time by Tag Pie Chart' }
                    ].map(viz => (
                      <label key={viz.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={config.enabledVisualizations?.[viz.key] ?? true} 
                          onChange={e => setConfig({ ...config, enabledVisualizations: { ...config.enabledVisualizations, [viz.key]: e.target.checked } })}
                        />
                        {viz.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'tags' && (
                <div className="timer-active-card">
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px' }}>Master Tag List</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input 
                        type="text" 
                        className="md-input" 
                        placeholder="New Tag Name" 
                        value={newMasterTag} 
                        onChange={e => setNewMasterTag(e.target.value)} 
                        style={{ flex: 1 }}
                      />
                      <button className="md-button" onClick={addMasterTag} type="button"><Plus size={20} /> Add</button>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {tags.map(tag => (
                        <li key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '8px 12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                              type="color" 
                              value={(config.tagColors && config.tagColors[tag]) ? config.tagColors[tag] : '#6750a4'} 
                              onChange={e => setConfig(prev => ({ ...prev, tagColors: { ...prev.tagColors, [tag]: e.target.value } }))}
                              style={{ cursor: 'pointer', width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px' }}
                              title="Set Tag Color"
                            />
                            <span>{tag}</span>
                          </div>
                          <button className="icon-btn" type="button" onClick={() => deleteMasterTag(tag)} style={{ color: 'var(--md-sys-color-error)' }}><Trash2 size={20} /></button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px' }}>Tag Time Targets (Minutes)</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <select className="md-input" value={newTagName} onChange={e => setNewTagName(e.target.value)} style={{ flex: 1 }}>
                        <option value="">Select a tag...</option>
                        {tags.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input 
                        type="number" 
                        className="md-input" 
                        placeholder="Mins" 
                        value={newTagTarget} 
                        onChange={e => setNewTagTarget(parseInt(e.target.value))} 
                        style={{ width: '80px' }}
                      />
                      <button className="md-button md-button-secondary" type="button" onClick={addTagTarget}>Add</button>
                    </div>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(config.tagTargets).map(([tag, target]) => (
                        <li key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '8px 12px', borderRadius: '8px' }}>
                          <span>{tag}: <strong>{target} mins</strong></span>
                          <button className="md-button md-button-secondary" type="button" style={{ padding: '4px 8px', color: 'var(--md-sys-color-error)' }} onClick={() => removeTagTarget(tag)}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="timer-active-card">
                  <h3 style={{ marginBottom: '16px' }}>Focus Audio</h3>
                  <div className="form-group">
                    <label>Interval Bell Audio (Absolute Path to MP3)</label>
                    <input 
                      type="text" 
                      className="md-input" 
                      placeholder="Leave blank for default synthetic bell"
                      value={config.intervalBellPath || ''} 
                      onChange={e => setConfig({ ...config, intervalBellPath: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '16px', marginBottom: '32px' }}>
                    <label>Timer End Notification Audio</label>
                    <input 
                      type="text" 
                      className="md-input" 
                      placeholder="Leave blank for default synthetic bell"
                      value={config.endBellPath || ''} 
                      onChange={e => setConfig({ ...config, endBellPath: e.target.value })}
                    />
                  </div>

                  <hr style={{ borderTop: '1px solid var(--md-sys-color-outline)', margin: '24px 0', opacity: 0.2 }} />

                  <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wind size={24} /> Meditation Tracker
                  </h3>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <input 
                      type="checkbox" 
                      checked={config.enableMeditation} 
                      onChange={e => setConfig({...config, enableMeditation: e.target.checked})}
                    />
                    <label style={{ margin: 0, fontWeight: 'bold' }}>Enable Meditation Mode</label>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '16px' }}>
                    Unlocks a dedicated timer without distractions, tracks consistency streaks, and provides ambient sound generation.
                  </p>

                  <div className="form-group">
                    <label>Custom Ambient Audio (Absolute Path to MP3)</label>
                    <input 
                      type="text" 
                      className="md-input" 
                      placeholder="Leave blank to use built-in synthetic noises"
                      value={config.meditationSoundPath || ''} 
                      onChange={e => setConfig({ ...config, meditationSoundPath: e.target.value })}
                    />
                    <small style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Optional. Overrides the synthetic white noise generators.</small>
                  </div>

                  <hr style={{ borderTop: '1px solid var(--md-sys-color-outline)', margin: '24px 0', opacity: 0.2 }} />
                  
                  <h3 style={{ marginBottom: '16px' }}>Meditation Goals</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label>Daily Target (Minutes)</label>
                      <input type="number" className="md-input" value={config.meditationDailyTargetMinutes ?? 15} onChange={e => setConfig({...config, meditationDailyTargetMinutes: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="form-group">
                      <label>Weekly Target (Minutes)</label>
                      <input type="number" className="md-input" value={config.meditationWeeklyTargetMinutes ?? 60} onChange={e => setConfig({...config, meditationWeeklyTargetMinutes: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Daily Target (Sessions)</label>
                      <input type="number" className="md-input" value={config.meditationDailyTargetSessions ?? 1} onChange={e => setConfig({...config, meditationDailyTargetSessions: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="form-group">
                      <label>Weekly Target (Sessions)</label>
                      <input type="number" className="md-input" value={config.meditationWeeklyTargetSessions ?? 3} onChange={e => setConfig({...config, meditationWeeklyTargetSessions: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="timer-active-card">
                  <div className="form-group">
                    <label>LAN Password</label>
                    <input 
                      type="password" 
                      className="md-input" 
                      value={config.password || ''} 
                      onChange={e => setConfig({...config, password: e.target.value})}
                      placeholder="Leave blank for no password"
                    />
                    <small style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Requires clients to enter this password to connect.</small>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--md-sys-color-outline)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--md-sys-color-surface)' }}>
          <button type="submit" form="settings-form" className="md-button" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Save size={20} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
