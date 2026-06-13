import { useState, useEffect } from 'react';
import { Palette, Clock, BarChart2, Settings, Lock, Wind } from 'lucide-react';
import Timer from './components/Timer';
import MeditationTimer from './components/MeditationTimer';
import StatsDashboard from './components/StatsDashboard';
import SettingsModal from './components/SettingsModal';

function App() {
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('timer'); // 'timer', 'meditation', 'stats'
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const fetchConfig = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        if (data.theme) {
          document.documentElement.setAttribute('data-theme', data.theme);
        }
        if (data.accentHue !== undefined) {
          document.documentElement.style.setProperty('--hue-primary', data.accentHue);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchConfig();
    
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const handleUnauthorized = () => setIsAuthenticated(false);
    window.addEventListener('focuslog-unauthorized', handleUnauthorized);

    // Initial check
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: localStorage.getItem('focuslog_password') || '' })
    }).then(res => {
      if (res.status === 401) setIsAuthenticated(false);
    }).catch(console.error);

    return () => window.removeEventListener('focuslog-unauthorized', handleUnauthorized);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('focuslog_password', passwordInput);
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setAuthError('');
        setRefreshKey(prev => prev + 1);
      } else {
        setAuthError('Incorrect password');
      }
    } catch (e) {
      setAuthError('Error connecting to server');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={32} /> FocusLog Login</h1>
        <div className="md-card" style={{ width: '300px', textAlign: 'center' }}>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="md-input" 
              placeholder="Enter LAN Password" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              autoFocus 
            />
            {authError && <p style={{ color: 'var(--md-sys-color-error)', fontSize: '0.85rem', marginTop: '8px' }}>{authError}</p>}
            <button type="submit" className="md-button" style={{ width: '100%', marginTop: '16px' }}>Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">
          <Clock size={28} />
          FocusLog
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
            <Settings size={24} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            <Clock size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}/>
            Timer
          </button>
          {config?.enableMeditation && (
            <button 
              className={`tab-btn ${activeTab === 'meditation' ? 'active' : ''}`}
              onClick={() => setActiveTab('meditation')}
            >
              <Wind size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}/>
              Meditation
            </button>
          )}
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart2 size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}/>
            Stats & Reports
          </button>
        </div>

        <div style={{ display: activeTab === 'timer' ? 'block' : 'none', flex: 1 }}>
          <Timer refreshKey={refreshKey} />
        </div>
        {config?.enableMeditation && (
          <div style={{ display: activeTab === 'meditation' ? 'block' : 'none', flex: 1 }}>
            <MeditationTimer refreshKey={refreshKey} config={config} />
          </div>
        )}
        <div style={{ display: activeTab === 'stats' ? 'block' : 'none', flex: 1 }}>
          <StatsDashboard isActive={activeTab === 'stats'} refreshKey={refreshKey} onDataChange={() => setRefreshKey(prev => prev + 1)} config={config} />
        </div>
      </main>

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onSave={() => {
            setRefreshKey(prev => prev + 1);
            setShowSettings(false);
          }} 
        />
      )}
    </>
  );
}

export default App;
