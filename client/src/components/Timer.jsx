import { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertTriangle, Trophy, Target, Settings as SettingsIcon } from 'lucide-react';
import PreSessionModal from './PreSessionModal';
import DistractionModal from './DistractionModal';
import PostSessionModal from './PostSessionModal';
import { audioController } from '../utils/AudioController';
import { calculateFatigueCurve } from '../utils/AnalyticsEngine';
import { io } from 'socket.io-client';
import Heatmap from './Heatmap';

const computeSFI = (startTime, endTime, distractions) => {
  const tStart = new Date(startTime).getTime();
  const tEnd = new Date(endTime).getTime();
  const total = tEnd - tStart;
  if (total <= 0) return 0;
  
  const distTimes = distractions.map(d => new Date(d.time).getTime()).sort();
  const points = [tStart, ...distTimes, tEnd];
  let sumSq = 0;
  for(let i = 1; i < points.length; i++) {
    const interval = points[i] - points[i-1];
    sumSq += (interval * interval);
  }
  return Math.pow(sumSq / (total * total), 0.25) * 100;
};

const getLocalDate = (isoString) => {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Timer({ refreshKey }) {
  const [sessionState, setSessionState] = useState('idle'); 
  const [sessionData, setSessionData] = useState(null);
  
  const [timeRemaining, setTimeRemaining] = useState(0); 
  const [timeElapsed, setTimeElapsed] = useState(0); 
  
  const [showPreModal, setShowPreModal] = useState(false);
  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState(null);
  const [distractions, setDistractions] = useState([]);
  
  const [audioMode, setAudioMode] = useState('off'); 
  const [intervalMins, setIntervalMins] = useState(5);
  const [randomMin, setRandomMin] = useState(5);
  const [randomMax, setRandomMax] = useState(15);
  
  const [config, setConfig] = useState({ dailyTargetMinutes: 0, weeklyTargetMinutes: 1200, smartBreakPrompts: true, tagTargets: {}, showGoalsOnTimer: true, timerStyle: 'text' });
  const [todaysData, setTodaysData] = useState({ totalTime: 0, tagsTime: {} });
  const [weeklyData, setWeeklyData] = useState({ totalTime: 0, consistency: 0 });
  const [bestStats, setBestStats] = useState({ bestSFI: 0, longestSession: 0, bestDaily: 0 });
  const [peakBin, setPeakBin] = useState(null);
  const [smartBreakPrompted, setSmartBreakPrompted] = useState(false);
  const [showSmartToast, setShowSmartToast] = useState(false);
  const [allSessions, setAllSessions] = useState([]);
  const [finishingDevice, setFinishingDevice] = useState(null);

  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const fetchStats = async () => {
    try {
      const [confRes, dataRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/data')
      ]);
      const conf = await confRes.json();
      const allData = await dataRes.json();
      setConfig(conf);
      setAllSessions(allData.sessions || []);
      
      const today = getLocalDate(new Date().toISOString());
      let todayTotal = 0;
      let tagsTotal = {};
      
      let bestSFI = 0;
      let longestSession = 0;
      let dailyTotals = {};

      const todayDate = new Date();
      const currentDayOfWeek = todayDate.getDay() || 7; 
      const weekStart = new Date(todayDate);
      weekStart.setDate(todayDate.getDate() - currentDayOfWeek + 1);
      weekStart.setHours(0,0,0,0);

      let weekTotal = 0;
      const weeksData = {};

      allData.sessions.forEach(s => {
        const sDate = new Date(s.startTime);
        const mins = s.durationActual / 60;
        
        const sDateLocal = getLocalDate(s.startTime);
        if (!dailyTotals[sDateLocal]) dailyTotals[sDateLocal] = 0;
        dailyTotals[sDateLocal] += mins;
        
        if (sDateLocal === today) {
          todayTotal += mins;
          if (!tagsTotal[s.tag]) tagsTotal[s.tag] = 0;
          tagsTotal[s.tag] += mins;
        }

        if (sDate >= weekStart) {
          weekTotal += mins;
        }

        const dDay = sDate.getDay() || 7;
        const wStart = new Date(sDate);
        wStart.setDate(sDate.getDate() - dDay + 1);
        wStart.setHours(0,0,0,0);
        const wStr = wStart.toISOString();
        if (!weeksData[wStr]) weeksData[wStr] = 0;
        weeksData[wStr] += mins;
        
        if (s.sfi > bestSFI) bestSFI = s.sfi;
        if (mins > longestSession) longestSession = mins;
      });
      
      const bestDaily = Math.max(0, ...Object.values(dailyTotals));
      let consistencyWeeksMet = 0;
      Object.values(weeksData).forEach(val => {
        if (val >= (conf.weeklyTargetMinutes || 1200)) consistencyWeeksMet++;
      });

      const { peakBin } = calculateFatigueCurve(allData.sessions);

      setTodaysData({ totalTime: todayTotal, tagsTime: tagsTotal });
      setWeeklyData({ totalTime: weekTotal, consistency: consistencyWeeksMet });
      setBestStats({ bestSFI, longestSession, bestDaily });
      setPeakBin(peakBin);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const origin = window.location.origin;
    const socket = io(origin, {
      auth: { password: localStorage.getItem('focuslog_password') || '' }
    });
    
    socketRef.current = socket;

    socket.on('sync', (serverState) => {
      // Don't process if this is a meditation session and we're currently idle, we want this component to only handle focus mode
      if (serverState.state !== 'idle' && serverState.mode !== 'focus') return;
      
      setSessionState(serverState.state);
      setSessionData(serverState.sessionData);
      setDistractions(serverState.distractions);
      setFinishingDevice(serverState.finishingDevice);

      if (serverState.state === 'running' && serverState.startTime) {
        const elapsed = Math.floor((Date.now() - serverState.startTime) / 1000);
        setTimeElapsed(elapsed);
        if (serverState.sessionData.type === 'countdown') {
          setTimeRemaining(serverState.sessionData.duration - elapsed);
        }
      } else if (serverState.state === 'break' && serverState.breakStartTime) {
        const elapsed = Math.floor((Date.now() - serverState.breakStartTime) / 1000);
        setTimeRemaining((serverState.breakDuration * 60) - elapsed);
      } else if (serverState.state === 'finished' && serverState.startTime) {
        const elapsed = Math.floor((Date.now() - serverState.startTime) / 1000);
        setTimeElapsed(elapsed);
      } else if (serverState.state === 'idle') {
        setTimeElapsed(0);
        setTimeRemaining(0);
        setShowPostModal(false);
      }
    });

    return () => socket.close();
  }, []);

  useEffect(() => {
    if (sessionState === 'idle') fetchStats();
  }, [sessionState, refreshKey]);

  useEffect(() => {
    if (sessionState === 'running' || sessionState === 'break') {
      timerRef.current = setInterval(() => {
        if (sessionState === 'break') {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
               socketRef.current.emit('endBreak');
               return 0;
            }
            return prev - 1;
          });
        } else if (sessionData?.type === 'countdown') {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              socketRef.current.emit('finishCountdown');
              return 0;
            }
            return prev - 1;
          });
          setTimeElapsed(prev => prev + 1);
        } else {
          setTimeElapsed((prev) => prev + 1);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionState, sessionData]);
  
  useEffect(() => {
     if (sessionState === 'finished' && sessionData) {
         if (socketRef.current && socketRef.current.id === finishingDevice) {
             audioController.stopBell();
             audioController.playBell(true); 
             if (timeElapsed < 300) {
                 const tm = setTimeout(() => {
                     socketRef.current.emit('finalizeSession', 0);
                 }, 4000);
                 return () => clearTimeout(tm);
             } else {
                 setPendingSessionData({ endTime: new Date().toISOString(), actualElapsedSeconds: timeElapsed });
                 setShowPostModal(true);
                 if ("Notification" in window && Notification.permission === "granted") {
                     new Notification("FocusLog", { body: `Session Complete: ${sessionData.goal}` });
                 }
             }
         }
     }
  }, [sessionState, sessionData, finishingDevice, timeElapsed]);

  const handleBreakFinish = () => {
    socketRef.current.emit('endBreak');
    audioController.playBell(true);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FocusLog", { body: `Break's over! Time to focus.` });
    }
  };

  useEffect(() => {
    if (sessionState === 'running' && config.smartBreakPrompts && peakBin && !smartBreakPrompted) {
      if (Math.floor(timeElapsed / 60) === peakBin.binStart && peakBin.binStart > 0) {
        setSmartBreakPrompted(true);
        setShowSmartToast(true);
        if ("Notification" in window && Notification.permission === "granted") {
           new Notification("Smart Break", { body: `You usually lose focus around now. Consider a 5 min break!` });
        }
        setTimeout(() => setShowSmartToast(false), 10000);
      }
    }
  }, [timeElapsed, sessionState, config.smartBreakPrompts, peakBin, smartBreakPrompted]);

  const handleStartRequest = () => setShowPreModal(true);

  const handleStart = (startConfig) => {
    setShowPreModal(false);
    setSmartBreakPrompted(false);
    
    if (audioMode === 'interval') audioController.startIntervalBell(intervalMins);
    if (audioMode === 'random') audioController.startRandomBell(randomMin, randomMax);
    
    socketRef.current.emit('startSession', startConfig);
  };

  const finalizeSession = async (notes, breakDuration) => {
    setShowPostModal(false);
    const { endTime, actualElapsedSeconds } = pendingSessionData;
    const sfi = computeSFI(sessionData.startTime || new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(), endTime, distractions);
    
    const finalData = {
      ...sessionData,
      startTime: sessionData.startTime || new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(),
      endTime,
      durationActual: actualElapsedSeconds,
      distractions,
      sfi,
      notes
    };
    
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      fetchStats(); 
    } catch (e) {}
    
    setPendingSessionData(null);
    socketRef.current.emit('finalizeSession', breakDuration);
  };

  const stopEarly = () => {
      socketRef.current.emit('stopEarly');
  };

  const handleDistractionLog = (data) => {
    setShowDistractionModal(false);
    socketRef.current.emit('logDistraction', { time: new Date().toISOString(), cause: data.cause, type: data.type });
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const getDisplayTime = () => {
    if (sessionState === 'break') return formatTime(timeRemaining);
    if (!sessionData) return "00:00";
    return sessionData.type === 'countdown' ? formatTime(timeRemaining) : formatTime(timeElapsed);
  };

  const getProgressPercentage = () => {
    if (sessionState === 'break') return 0; // Or calculate break progress
    if (!sessionData || sessionData.type !== 'countdown') return 100;
    const total = sessionData.duration;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (timeRemaining / total) * 100));
  };

  const renderProgressBar = (label, currentMins, targetMins) => {
    const pct = targetMins > 0 ? Math.min(100, (currentMins / targetMins) * 100) : 0;
    return (
      <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', opacity: 0.8 }}>
          <span>{label}</span>
          <span>{Math.round(currentMins)} / {targetMins}m</span>
        </div>
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--md-sys-color-surface-variant)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--md-sys-color-primary)', transition: 'width 0.5s' }} />
        </div>
      </div>
    );
  };

  const renderTimerVisual = () => {
    const timeText = getDisplayTime();
    
    if (config.timerStyle === 'circle') {
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (getProgressPercentage() / 100) * circumference;

      return (
        <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto' }}>
          <svg width="300" height="300" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="150" cy="150" r={radius} stroke="var(--md-sys-color-surface-variant)" strokeWidth="8" fill="transparent" />
            <circle 
              cx="150" cy="150" r={radius} 
              stroke="var(--md-sys-color-primary)" 
              strokeWidth="8" 
              fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ 
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '4rem', fontWeight: 'bold', className: 'mono', letterSpacing: '-2px'
          }}>
            {timeText}
          </div>
        </div>
      );
    }

    return (
      <div className="mono" style={{ fontSize: '8rem', fontWeight: '700', letterSpacing: '-4px', lineHeight: 1, margin: '24px 0', textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
        {timeText}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', justifyContent: 'center', position: 'relative' }}>
      
      {showSmartToast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', padding: '12px 24px', borderRadius: '24px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          <strong>Smart Break:</strong> You historically lose focus around this time. Consider a 5 min break!
        </div>
      )}

      {/* Main Central Timer Area */}
      <div style={{ textAlign: 'center', zIndex: 2, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {(sessionState === 'running' || sessionState === 'break' || sessionState === 'finished') && (sessionData || sessionState === 'break') && (
          <div style={{ marginBottom: '16px', opacity: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
             {sessionState === 'break' ? (
              <span style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Take a Break</span>
             ) : (
               <>
                 <span style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{sessionData.goal}</span>
                 <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '2px 8px', borderRadius: '4px' }}>{sessionData.tag}</span>
               </>
             )}
          </div>
        )}

        {renderTimerVisual()}

        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '32px' }}>
          {sessionState === 'idle' && (
            <button className="icon-btn" style={{ background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', width: '64px', height: '64px' }} onClick={handleStartRequest}>
              <Play size={32} style={{ marginLeft: '4px' }} />
            </button>
          )}

          {sessionState === 'running' && (
            <>
              <button 
                className="icon-btn" 
                style={{ background: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)', width: '64px', height: '64px' }}
                onClick={() => setShowDistractionModal(true)}
                title="Log Distraction"
              >
                <AlertTriangle size={28} />
              </button>
              <button 
                className="icon-btn" 
                style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface)', width: '64px', height: '64px' }}
                onClick={stopEarly}
                title="Stop Early"
              >
                <Square size={24} />
              </button>
            </>
          )}

          {sessionState === 'break' && (
            <button 
              className="icon-btn" 
              style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface)', width: '64px', height: '64px' }}
              onClick={handleBreakFinish}
              title="End Break"
            >
              <Square size={24} />
            </button>
          )}
        </div>
        
        {sessionState === 'finished' && (
          <div style={{ marginTop: '24px', color: timeElapsed < 300 ? 'var(--md-sys-color-on-surface-variant)' : 'var(--md-sys-color-primary)' }}>
            <p>{timeElapsed < 300 ? 'Session < 5 mins (Not Saved)' : 'Session Saved!'}</p>
          </div>
        )}
      </div>

      {/* Heatmap integrated seamlessly below timer */}
      {sessionState === 'idle' && (
        <div style={{ width: '100%', maxWidth: '800px', marginTop: '64px' }}>
          <Heatmap sessions={allSessions} />
          <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.5, fontSize: '0.8rem', letterSpacing: '1px' }}>
            {Math.round(allSessions.reduce((acc, s) => acc + (s.durationActual || 0) / 3600, 0))}h total • {allSessions.length} sessions
          </div>
        </div>
      )}

      {/* Optional Goals Display */}
      {sessionState === 'idle' && config.showGoalsOnTimer && (
        <div style={{ display: 'flex', gap: '32px', marginTop: '64px', width: '100%', maxWidth: '800px', opacity: 0.8 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}><Target size={16}/> Goals</h4>
            {renderProgressBar("Daily", todaysData.totalTime, config.dailyTargetMinutes)}
            {renderProgressBar("Weekly", weeklyData.totalTime, config.weeklyTargetMinutes)}
            {Object.entries(config.tagTargets).map(([tag, target]) => 
              renderProgressBar(`Tag: ${tag}`, todaysData.tagsTime[tag] || 0, target)
            )}
          </div>
          <div style={{ flex: 1 }}>
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}><Trophy size={16}/> Best Stats</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Best Focus Score</span> <strong>{Math.round(bestStats.bestSFI)}</strong></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Longest Session</span> <strong>{Math.round(bestStats.longestSession)}m</strong></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Best Daily Total</span> <strong>{Math.round(bestStats.bestDaily)}m</strong></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consistency</span> <strong>{weeklyData.consistency} Wks</strong></div>
             </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPreModal && (
        <PreSessionModal 
          onStart={handleStart} 
          onCancel={() => setShowPreModal(false)} 
        />
      )}

      {showDistractionModal && (
        <DistractionModal 
          onLog={handleDistractionLog} 
          onCancel={() => setShowDistractionModal(false)} 
        />
      )}

      {showPostModal && (
        <PostSessionModal 
          onSave={finalizeSession} 
        />
      )}
    </div>
  );
}
