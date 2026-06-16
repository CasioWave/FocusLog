import { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertTriangle, Trophy, Target, Settings as SettingsIcon } from 'lucide-react';
import PreSessionModal from './PreSessionModal';
import DistractionModal from './DistractionModal';
import PostSessionModal from './PostSessionModal';
import FrictionModal from './FrictionModal';
import ContextSwitchModal from './ContextSwitchModal';
import EntryTicketModal from './EntryTicketModal';
import { audioController } from '../utils/AudioController';
import { calculateFatigueCurve, calculateEnduranceConstants, calculateInterleavingQueue } from '../utils/AnalyticsEngine';
import { io } from 'socket.io-client';
import Heatmap from './Heatmap';
import DailySectorChart from './DailySectorChart';
import { getDeviceId } from '../utils/deviceId';

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
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  
  const [localEvents, setLocalEvents] = useState([]);
  const [currentStance, setCurrentStance] = useState('INGESTION');
  const [cognitiveExpenditure, setCognitiveExpenditure] = useState(0);
  const [decayWarningTriggered, setDecayWarningTriggered] = useState(false);
  const [smartToastMsg, setSmartToastMsg] = useState('');
  const currentStanceRef = useRef('INGESTION');
  
  const [currentTau, setCurrentTau] = useState(25);
  const [focusCapacity, setFocusCapacity] = useState(1.0);
  const [zeigarnikTriggered, setZeigarnikTriggered] = useState(false);
  const [localHazardRate, setLocalHazardRate] = useState(0);
  const [lastFrictionTime, setLastFrictionTime] = useState(Date.now());
  
  const [showContextSwitchModal, setShowContextSwitchModal] = useState(false);
  const [showEntryTicketModal, setShowEntryTicketModal] = useState(false);
  const [interleavingQueue, setInterleavingQueue] = useState([]);
  const [topicsMetadata, setTopicsMetadata] = useState({});
  const [entryTicketLatency, setEntryTicketLatency] = useState(null);
  const [proposedSwitchTopic, setProposedSwitchTopic] = useState(null);
  const [proposedSwitchState, setProposedSwitchState] = useState(null);
  const [startConfigCache, setStartConfigCache] = useState(null);
  
  const [pendingSessionData, setPendingSessionData] = useState(null);
  const [distractions, setDistractions] = useState([]);
  
  const [audioMode, setAudioMode] = useState('off'); 
  const [intervalMins, setIntervalMins] = useState(5);
  const [randomMin, setRandomMin] = useState(5);
  const [randomMax, setRandomMax] = useState(15);
  
  const [config, setConfig] = useState({ dailyTargetMinutes: 0, weeklyTargetMinutes: 1200, smartBreakPrompts: true, tagTargets: {}, showGoalsOnTimer: true, timerStyle: 'text', enableEpistemicTracking: true });
  const [todaysData, setTodaysData] = useState({ totalTime: 0, tagsTime: {} });
  const [weeklyData, setWeeklyData] = useState({ totalTime: 0, consistency: 0 });
  const [bestStats, setBestStats] = useState({ bestSFI: 0, longestSession: 0, bestDaily: 0 });
  const [peakBin, setPeakBin] = useState(null);
  const [enduranceLimit, setEnduranceLimit] = useState(25);
  const [smartBreakPrompted, setSmartBreakPrompted] = useState(false);
  const [showSmartToast, setShowSmartToast] = useState(false);
  const [allSessions, setAllSessions] = useState([]);
  const [finishingDevice, setFinishingDevice] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      setTopicsMetadata(allData.topics || {});
      
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

      const { peakBin, enduranceLimit } = calculateFatigueCurve(allData.sessions);

      setTodaysData({ totalTime: todayTotal, tagsTime: tagsTotal });
      setWeeklyData({ totalTime: weekTotal, consistency: consistencyWeeksMet });
      setBestStats({ bestSFI, longestSession, bestDaily });
      setPeakBin(peakBin);
      setEnduranceLimit(enduranceLimit);
      setIsLoaded(true);

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
              socketRef.current.emit('finishCountdown', { deviceId: getDeviceId() });
              return 0;
            }
            return prev - 1;
          });
          setTimeElapsed(prev => prev + 1);
          if (config.enableEpistemicTracking) {
             const w = { INGESTION: 0.8, SYMBOL_MANIPULATION: 1.5, SENSE_MAKING: 1.2, TRANSLATION: 1.0 };
             const weight = w[currentStanceRef.current] || 0;
             setCognitiveExpenditure(prev => prev + weight / 60);
             setFocusCapacity(prev => Math.max(0, prev * Math.exp(-(weight / 60) / (currentTau || 25))));
          }
        } else {
          setTimeElapsed((prev) => prev + 1);
          if (config.enableEpistemicTracking) {
             const w = { INGESTION: 0.8, SYMBOL_MANIPULATION: 1.5, SENSE_MAKING: 1.2, TRANSLATION: 1.0 };
             const weight = w[currentStanceRef.current] || 0;
             setCognitiveExpenditure(prev => prev + weight / 60);
             setFocusCapacity(prev => Math.max(0, prev * Math.exp(-(weight / 60) / (currentTau || 25))));
          }
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionState, sessionData]);
  
  useEffect(() => {
     if (sessionState === 'finished' && sessionData) {
         if (socketRef.current && getDeviceId() === finishingDevice) {
             audioController.stopBell();
             audioController.playBell(true); 
             if (timeElapsed < 300) {
                 console.log("[Timer] Session finished, elapsed < 300, sending finalizeSession(0)");
                 const tm = setTimeout(() => {
                     socketRef.current.emit('finalizeSession', 0);
                 }, 4000);
                 return () => clearTimeout(tm);
             } else {
                 console.log("[Timer] Session finished, elapsed >= 300, showing PostSessionModal", { timeElapsed, sessionData });
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
    if (sessionState === 'running' && config.smartBreakPrompts && !smartBreakPrompted && allSessions.length >= 3) {
      const promptMinute = Math.max(5, Math.floor(enduranceLimit) - 5);
      
      if (Math.floor(timeElapsed / 60) === promptMinute) {
        setSmartBreakPrompted(true);
        setSmartToastMsg("Your focus usually drops soon. Preemptive 5 min break?");
        setShowSmartToast(true);
        if ("Notification" in window && Notification.permission === "granted") {
           new Notification("Smart Break", { body: `Your focus usually drops soon. Preemptive 5 min break?` });
        }
        setTimeout(() => setShowSmartToast(false), 10000);
      }
    }
  }, [timeElapsed, sessionState, config.smartBreakPrompts, enduranceLimit, smartBreakPrompted]);

  useEffect(() => {
    if (sessionState === 'running' && config.enableEpistemicTracking && currentTau && allSessions.length >= 3) {
       const zTime = currentTau * 0.85;
       if (timeElapsed / 60 >= zTime && !zeigarnikTriggered) {
          setZeigarnikTriggered(true);
          if (config.enableInterleaving && interleavingQueue.length > 0) {
            const nextTopic = interleavingQueue[0];
            setProposedSwitchTopic(nextTopic.topicId);
            setProposedSwitchState('INGESTION'); 
            setShowContextSwitchModal(true);
          } else {
            setSmartToastMsg(`Zeigarnik Trigger: You are approaching your focus limit (${currentTau}m). Take a break to preserve context!`);
            setShowSmartToast(true);
            if ("Notification" in window && Notification.permission === "granted") {
               new Notification("Zeigarnik Trigger", { body: `Focus capacity depleting. Take a break to preserve context!` });
            }
            setTimeout(() => setShowSmartToast(false), 10000);
          }
       }
    }
  }, [timeElapsed, sessionState, config.enableEpistemicTracking, currentTau, zeigarnikTriggered, interleavingQueue]);

  useEffect(() => {
    if (sessionState === 'running' && config.enableEpistemicTracking) {
       const limit = config.cognitiveExpenditureLimit || 100;
       if (cognitiveExpenditure >= limit && !decayWarningTriggered) {
          setDecayWarningTriggered(true);
          setSmartToastMsg("Decay Warning: High cognitive expenditure reached. Consider a break.");
          setShowSmartToast(true);
          if ("Notification" in window && Notification.permission === "granted") {
             new Notification("Decay Warning", { body: `High cognitive expenditure reached.` });
          }
          setTimeout(() => setShowSmartToast(false), 10000);
       }
    }
  }, [cognitiveExpenditure, sessionState, config.enableEpistemicTracking, config.cognitiveExpenditureLimit, decayWarningTriggered]);

  const handleStanceChange = (e) => {
    const newStance = e.target.value;
    setCurrentStance(newStance);
    currentStanceRef.current = newStance;
    setLocalEvents(prev => [...prev, { timestamp: new Date().toISOString(), type: 'STATE_CHANGE', state: newStance }]);
  };

  useEffect(() => {
     if (sessionState !== 'running' || !config.enableEpistemicTracking) return;
     const handleKeyDown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || showDistractionModal || showFrictionModal) return;
        switch (e.key) {
           case '1': handleStanceChange({ target: { value: 'INGESTION' } }); break;
           case '2': handleStanceChange({ target: { value: 'SYMBOL_MANIPULATION' } }); break;
           case '3': handleStanceChange({ target: { value: 'SENSE_MAKING' } }); break;
           case '4': handleStanceChange({ target: { value: 'TRANSLATION' } }); break;
           case 'f':
           case 'F':
             e.preventDefault();
             setShowFrictionModal(true);
             break;
        }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionState, config.enableEpistemicTracking, showDistractionModal, showFrictionModal]);

  const handleStartRequest = () => setShowPreModal(true);

  const handleStart = (startConfig) => {
    setShowPreModal(false);
    
    if (config.enableEpistemicTracking && topicsMetadata[startConfig.tag]) {
      const topicInfo = topicsMetadata[startConfig.tag];
      if (topicInfo.lastSessionEndState || topicInfo.lastFrictionNote) {
        setStartConfigCache(startConfig);
        setShowEntryTicketModal(true);
        return;
      }
    }
    
    executeStart(startConfig, null);
  };

  const handleEntryTicketSubmit = (ticket, latency) => {
    setShowEntryTicketModal(false);
    executeStart(startConfigCache, latency);
  };

  const executeStart = (startConfig, latency) => {
    setSmartBreakPrompted(false);
    setDecayWarningTriggered(false);
    setCognitiveExpenditure(0);
    setEntryTicketLatency(latency);
    
    if (startConfig.stance) {
      setCurrentStance(startConfig.stance);
      currentStanceRef.current = startConfig.stance;
      setLocalEvents([{ timestamp: new Date().toISOString(), type: 'STATE_CHANGE', state: startConfig.stance }]);
    } else {
      setLocalEvents([]);
    }
    
    if (config.enableEpistemicTracking) {
      const taus = calculateEnduranceConstants(allSessions);
      const tau = taus[startConfig.tag] || 25;
      setCurrentTau(tau);
      setFocusCapacity(1.0);
      setZeigarnikTriggered(false);
      setLocalHazardRate(0);
      setLastFrictionTime(Date.now());
      
      const queue = calculateInterleavingQueue(topicsMetadata, startConfig.tag, startConfig.stance || 'INGESTION');
      setInterleavingQueue(queue);
    }
    
    if (audioMode === 'interval') audioController.startIntervalBell(intervalMins);
    if (audioMode === 'random') audioController.startRandomBell(randomMin, randomMax);
    
    socketRef.current.emit('startSession', { ...startConfig, deviceId: getDeviceId() });
  };

  const finalizeSession = async (notes, breakDuration) => {
    console.log("[Timer] finalizeSession called", { notes, breakDuration, pendingSessionData, sessionData });
    try {
      setShowPostModal(false);
      const { endTime, actualElapsedSeconds } = pendingSessionData;
      console.log("[Timer] Extracted pendingSessionData", { endTime, actualElapsedSeconds });
      
      const sfi = computeSFI(sessionData.startTime || new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(), endTime, distractions);
      console.log("[Timer] Computed SFI", sfi);
      
      const finalData = {
        ...sessionData,
        startTime: sessionData.startTime || new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(),
        endTime,
        durationActual: actualElapsedSeconds,
        distractions,
        events: [...localEvents, { timestamp: endTime || new Date().toISOString(), type: 'SESSION_END' }],
        sfi,
        notes
      };
      if (entryTicketLatency) finalData.entryTicketLatency = entryTicketLatency;
      console.log("[Timer] Preparing to send finalData", finalData);
    } catch (syncErr) {
      console.error("[Timer] SYNCHRONOUS ERROR IN finalizeSession:", syncErr);
    }
    
    // We re-declare finalData since we put it in try-catch to log errors
    const { endTime, actualElapsedSeconds } = pendingSessionData;
    const finalData = {
      ...sessionData,
      startTime: sessionData.startTime || new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(),
      endTime,
      durationActual: actualElapsedSeconds,
      distractions,
      events: [...localEvents, { timestamp: endTime || new Date().toISOString(), type: 'SESSION_END' }],
      sfi: computeSFI(sessionData.startTime || new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(), endTime, distractions),
      notes
    };
    if (entryTicketLatency) finalData.entryTicketLatency = entryTicketLatency;

    try {
      console.log("[Timer] Fetching /api/sessions...");
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-focuslog-password': config.password || '' },
        body: JSON.stringify(finalData)
      });
      
      if (config.enableEpistemicTracking && finalData.tag) {
        const hFriction = localEvents.filter(e => e.type === 'FRICTION_LOG').length;
        const durHrs = finalData.durationActual / 3600;
        const rate = durHrs > 0 ? hFriction / durHrs : 0;
        const lastFriction = [...localEvents].reverse().find(e => e.type === 'FRICTION_LOG');
        
        await fetch('/api/topics/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-focuslog-password': config.password || '' },
          body: JSON.stringify({
            topicId: finalData.tag,
            metadata: {
              lastStudied: new Date().toISOString(),
              averageFrictionRate: rate,
              lastSessionEndState: currentStance,
              lastFrictionNote: lastFriction ? lastFriction.note : null
            }
          })
        });
      }
      
      console.log("[Timer] fetchStats called");
      fetchStats(); 
    } catch (e) {
      console.error("[Timer] Error in finalizeSession requests:", e);
    }
    
    console.log("[Timer] Finalizing cleanup and emitting to server", breakDuration);
    setPendingSessionData(null);
    socketRef.current.emit('finalizeSession', breakDuration);
  };

  const handleAcceptSwitch = () => {
    setShowContextSwitchModal(false);
    socketRef.current.emit('stopEarly', { deviceId: getDeviceId() });
    
    setStartConfigCache({
      goal: `Interleaved: ${proposedSwitchTopic}`,
      type: sessionData.type,
      duration: sessionData.type === 'countdown' ? 25 * 60 : 0,
      tag: proposedSwitchTopic,
      energy: 3,
      stress: 3,
      stance: proposedSwitchState
    });
    setShowEntryTicketModal(true);
  };

  const stopEarly = () => {
      socketRef.current.emit('stopEarly', { deviceId: getDeviceId() });
  };

  const updateHazardRate = () => {
    const now = Date.now();
    const dt = (now - lastFrictionTime) / 60000;
    if (dt > 0) {
      setLocalHazardRate(1 / dt);
    }
    setLastFrictionTime(now);
  };

  const handleDistractionLog = (data) => {
    setShowDistractionModal(false);
    socketRef.current.emit('logDistraction', { time: new Date().toISOString(), cause: data.cause, type: data.type });
    updateHazardRate();
  };

  const handleFrictionLog = (category, note) => {
    setLocalEvents(prev => [...prev, { timestamp: new Date().toISOString(), type: 'FRICTION_LOG', frictionType: category, note }]);
    setShowFrictionModal(false);
    updateHazardRate();
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
    if (sessionState === 'break') return 0;
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

    if (config.timerStyle === 'analog') {
      const radius = 120;
      let minAngle = 0;
      let secAngle = 0;
      if (sessionData && sessionData.type === 'countdown') {
        const sec = timeRemaining % 60;
        const min = Math.floor(timeRemaining / 60);
        secAngle = (sec / 60) * 360;
        minAngle = ((min % 60) / 60) * 360 + (sec / 60) * 6;
      } else {
        const sec = timeElapsed % 60;
        const min = Math.floor(timeElapsed / 60);
        secAngle = (sec / 60) * 360;
        minAngle = ((min % 60) / 60) * 360 + (sec / 60) * 6;
      }

      return (
        <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto' }}>
          <svg width="300" height="300">
            <circle cx="150" cy="150" r={radius} stroke="var(--md-sys-color-surface-variant)" strokeWidth="4" fill="rgba(var(--md-sys-color-surface-rgb), 0.5)" />
            {/* Ticks */}
            {[...Array(12)].map((_, i) => (
               <line key={i} x1="150" y1="35" x2="150" y2="45" stroke="var(--md-sys-color-on-surface-variant)" strokeWidth={i % 3 === 0 ? "4" : "2"} transform={`rotate(${i * 30} 150 150)`} />
            ))}
            {/* Minute Hand */}
            <line x1="150" y1="150" x2="150" y2="60" stroke="var(--md-sys-color-on-surface)" strokeWidth="6" strokeLinecap="round" transform={`rotate(${minAngle} 150 150)`} style={{ transition: 'transform 0.5s' }} />
            {/* Second Hand */}
            <line x1="150" y1="150" x2="150" y2="45" stroke="var(--md-sys-color-primary)" strokeWidth="2" strokeLinecap="round" transform={`rotate(${secAngle} 150 150)`} style={{ transition: 'transform 0.2s cubic-bezier(.4,2.08,.55,.44)' }} />
            <circle cx="150" cy="150" r="6" fill="var(--md-sys-color-primary)" />
          </svg>
          <div className="mono" style={{ position: 'absolute', bottom: '80px', width: '100%', textAlign: 'center', fontSize: '1.5rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {timeText}
          </div>
        </div>
      );
    }

    if (config.timerStyle === 'linear') {
      const pct = getProgressPercentage();
      return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '48px auto', textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: '4rem', fontWeight: '500', marginBottom: '24px', letterSpacing: '-2px' }}>
            {timeText}
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--md-sys-color-surface-variant)', position: 'relative', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: `${pct}%`, height: '100%', backgroundColor: 'var(--md-sys-color-primary)', transition: 'width 1s linear' }} />
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

  if (!isLoaded) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--md-sys-color-on-background)' }}>Loading Timer...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', justifyContent: 'center', position: 'relative' }}>
      
      {showSmartToast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', padding: '12px 24px', borderRadius: '24px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          <strong>Alert:</strong> {smartToastMsg}
        </div>
      )}

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
        
        {sessionState === 'running' && config?.enableEpistemicTracking && (
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Current Stance:</span>
              <select 
                value={currentStance} 
                onChange={handleStanceChange}
                className="md-input"
                style={{ width: 'auto', padding: '8px 16px', borderRadius: '16px', backgroundColor: 'var(--md-sys-color-surface-variant)', border: 'none' }}
              >
                <option value="INGESTION">Ingestion (1)</option>
                <option value="SYMBOL_MANIPULATION">Symbol Manipulation (2)</option>
                <option value="SENSE_MAKING">Sense-Making (3)</option>
                <option value="TRANSLATION">Translation (4)</option>
              </select>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--md-sys-color-primary)', display: 'flex', gap: '16px' }}>
               <span>E: <strong>{cognitiveExpenditure.toFixed(1)}</strong> / {config.cognitiveExpenditureLimit || 100}</span>
               <span>C(t): <strong>{(focusCapacity * 100).toFixed(1)}%</strong></span>
               <span>λ: <strong>{localHazardRate.toFixed(2)}</strong> /m</span>
               <span>τ: <strong>{currentTau}</strong>m</span>
            </div>
          </div>
        )}
        
        {sessionState === 'finished' && (
          <div style={{ marginTop: '24px', color: timeElapsed < 300 ? 'var(--md-sys-color-on-surface-variant)' : 'var(--md-sys-color-primary)' }}>
            <p>{timeElapsed < 300 ? 'Session < 5 mins (Not Saved)' : 'Session Saved!'}</p>
          </div>
        )}
      </div>

      {sessionState === 'idle' && (
        <div style={{ width: '100%', maxWidth: '800px', marginTop: '64px' }}>
          <Heatmap sessions={allSessions} />
          <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.5, fontSize: '0.8rem', letterSpacing: '1px' }}>
            {Math.round(allSessions.reduce((acc, s) => acc + (s.durationActual || 0) / 3600, 0))}h total • {allSessions.length} sessions
          </div>
        </div>
      )}

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

      {sessionState === 'idle' && config.showDailySectorChartOnTimer && (
        <div style={{ width: '100%', maxWidth: '800px', marginTop: '64px', marginBottom: '64px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>Today's Cognitive Sectors</h4>
          <DailySectorChart sessions={allSessions} config={config} />
        </div>
      )}

      {/* Modals */}
      {showPreModal && <PreSessionModal onStart={handleStart} onCancel={() => setShowPreModal(false)} config={config} />}
      {showDistractionModal && <DistractionModal onLog={handleDistractionLog} onCancel={() => setShowDistractionModal(false)} />}
      {showPostModal && <PostSessionModal sessionData={pendingSessionData} onSave={finalizeSession} />}
      {showFrictionModal && <FrictionModal onLog={handleFrictionLog} onCancel={() => setShowFrictionModal(false)} />}
      {showContextSwitchModal && <ContextSwitchModal proposedTopic={proposedSwitchTopic} suggestedState={proposedSwitchState} onAccept={handleAcceptSwitch} onSnooze={() => setShowContextSwitchModal(false)} />}
      {showEntryTicketModal && <EntryTicketModal topic={startConfigCache?.tag} lastFrictionNote={topicsMetadata[startConfigCache?.tag]?.lastFrictionNote} lastSessionEndState={topicsMetadata[startConfigCache?.tag]?.lastSessionEndState} onSubmit={handleEntryTicketSubmit} />}
    </div>
  );
}
