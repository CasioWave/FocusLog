const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(cors());
app.use(express.json());

const configPath = path.join(__dirname, 'config.json');

const readConfig = () => {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
      dataPath: "../data/focus_data.json", 
      dailyTargetMinutes: 240, 
      weeklyTargetMinutes: 1200, 
      smartBreakPrompts: true, 
      tagTargets: {}, 
      tagColors: {},
      password: "",
      enableMeditation: false,
      meditationSoundPath: "",
      meditationDailyTargetMinutes: 15,
      meditationWeeklyTargetMinutes: 60,
      meditationDailyTargetSessions: 1,
      meditationWeeklyTargetSessions: 3,
      theme: "dark",
      accentHue: 210,
      timerStyle: "text",
      showGoalsOnTimer: true,
      enabledVisualizations: { sfi: true, timeByTag: true, timeOfDay: true, heatmap: true, stressEnergy: true, timeFocused: true, tagPie: true },
      enableEpistemicTracking: false,
      enableInterleaving: false
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

const writeConfig = (conf) => {
  fs.writeFileSync(configPath, JSON.stringify(conf, null, 2));
};

const getDataPath = () => {
  const conf = readConfig();
  // Ensure the path is absolute or relative to server dir
  return path.isAbsolute(conf.dataPath) ? conf.dataPath : path.join(__dirname, conf.dataPath);
};

// Ensure data file exists
const ensureDataExists = () => {
  const dataPath = getDataPath();
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ tags: ["Focus", "Study"], sessions: [], meditations: [] }));
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let modified = false;
  if (!data.meditations) {
    data.meditations = [];
    modified = true;
  }
  if (!data.topics) {
    data.topics = {};
    if (data.tags) {
      data.tags.forEach(t => {
        data.topics[t] = { topicId: t, parentDomain: "Uncategorized", lastStudied: null, historicalTau: 25, averageFrictionRate: 0, lastSessionEndState: null, lastFrictionNote: null };
      });
    }
    modified = true;
  }
  if (modified) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
};
ensureDataExists();

// Helper to read data
const readData = () => {
  ensureDataExists();
  const dataPath = getDataPath();
  const data = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(data);
};

// Helper to write data
const writeData = (data) => {
  const dataPath = getDataPath();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

// Auth middleware
const authMiddleware = (req, res, next) => {
  const conf = readConfig();
  if (conf.password && conf.password.trim() !== '') {
    const provided = req.headers['x-focuslog-password'];
    if (provided !== conf.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
};

app.post('/api/auth', (req, res) => {
  const conf = readConfig();
  if (!conf.password || conf.password.trim() === '') {
    return res.json({ success: true });
  }
  if (req.body.password === conf.password) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

// Socket.io sync state
let globalTimerState = {
  state: 'idle', // 'idle', 'running', 'break', 'finished'
  mode: 'focus', // 'focus' or 'meditation'
  initiator: null, // to track which device started it for local sound
  finishingDevice: null,
  sessionData: null,
  startTime: null,
  distractions: [],
  breakDuration: 0,
  breakStartTime: null
};

io.use((socket, next) => {
  const conf = readConfig();
  if (conf.password && conf.password.trim() !== '') {
    const token = socket.handshake.auth.password;
    if (token !== conf.password) {
      return next(new Error("unauthorized"));
    }
  }
  next();
});

io.on('connection', (socket) => {
  socket.emit('sync', globalTimerState);
  
  socket.on('startSession', (data) => {
    globalTimerState = {
      state: 'running',
      mode: data.mode || 'focus',
      initiator: data.deviceId || socket.id,
      finishingDevice: null,
      sessionData: data,
      startTime: Date.now(),
      distractions: [],
      breakDuration: 0,
      breakStartTime: null
    };
    io.emit('sync', globalTimerState);
  });

  socket.on('logDistraction', (distraction) => {
    if (globalTimerState.state === 'running') {
      globalTimerState.distractions.push(distraction);
      io.emit('sync', globalTimerState);
    }
  });

  socket.on('stopEarly', (data) => {
    if (globalTimerState.state === 'running') {
      globalTimerState.state = 'finished';
      globalTimerState.finishingDevice = (data && data.deviceId) ? data.deviceId : socket.id;
      io.emit('sync', globalTimerState);
    }
  });
  
  socket.on('finishCountdown', () => {
    if (globalTimerState.state === 'running' && globalTimerState.sessionData.type === 'countdown') {
      globalTimerState.state = 'finished';
      globalTimerState.finishingDevice = globalTimerState.initiator;
      io.emit('sync', globalTimerState);
    }
  });

  socket.on('finalizeSession', (breakDuration) => {
    if (breakDuration > 0) {
      globalTimerState = {
        ...globalTimerState,
        state: 'break',
        breakDuration,
        breakStartTime: Date.now()
      };
    } else {
      globalTimerState = {
        state: 'idle',
        mode: 'focus',
        initiator: null,
        finishingDevice: null,
        sessionData: null,
        startTime: null,
        distractions: [],
        breakDuration: 0,
        breakStartTime: null
      };
    }
    io.emit('sync', globalTimerState);
  });

  socket.on('endBreak', () => {
    if (globalTimerState.state === 'break') {
      globalTimerState = {
        state: 'idle',
        mode: 'focus',
        initiator: null,
        finishingDevice: null,
        sessionData: null,
        startTime: null,
        distractions: [],
        breakDuration: 0,
        breakStartTime: null
      };
      io.emit('sync', globalTimerState);
    }
  });
});

// Routes
app.get('/api/data', authMiddleware, (req, res) => {
  res.json(readData());
});

app.post('/api/sessions', authMiddleware, (req, res) => {
  const data = readData();
  const session = req.body;
  
  if (!session.id) {
    session.id = Date.now().toString();
  }
  
  data.sessions.push(session);
  writeData(data);
  res.json({ success: true, session });
});

app.delete('/api/sessions/:id', authMiddleware, (req, res) => {
  const data = readData();
  const id = req.params.id;
  const initialLength = data.sessions.length;
  data.sessions = data.sessions.filter(s => s.id !== id);
  if (data.sessions.length !== initialLength) {
    writeData(data);
  }
  res.json({ success: true });
});

app.post('/api/meditations', authMiddleware, (req, res) => {
  const data = readData();
  const session = req.body;
  if (!session.id) session.id = Date.now().toString();
  if (!data.meditations) data.meditations = [];
  data.meditations.push(session);
  writeData(data);
  res.json({ success: true, session });
});

app.get('/api/topics', authMiddleware, (req, res) => {
  const data = readData();
  res.json(data.topics || {});
});

app.post('/api/topics/update', authMiddleware, (req, res) => {
  const data = readData();
  const { topicId, metadata } = req.body;
  if (!data.topics) data.topics = {};
  if (!data.topics[topicId]) {
    data.topics[topicId] = { topicId, parentDomain: "Uncategorized", lastStudied: null, historicalTau: 25, averageFrictionRate: 0, lastSessionEndState: null, lastFrictionNote: null };
  }
  data.topics[topicId] = { ...data.topics[topicId], ...metadata };
  writeData(data);
  res.json({ success: true, topic: data.topics[topicId] });
});

app.delete('/api/meditations/:id', authMiddleware, (req, res) => {
  const data = readData();
  const id = req.params.id;
  if (data.meditations) {
    data.meditations = data.meditations.filter(s => s.id !== id);
    writeData(data);
  }
  res.json({ success: true });
});

app.put('/api/sessions/:id', authMiddleware, (req, res) => {
  const data = readData();
  const id = req.params.id;
  const updates = req.body;
  const sessionIndex = data.sessions.findIndex(s => s.id === id);
  if (sessionIndex !== -1) {
    data.sessions[sessionIndex] = { ...data.sessions[sessionIndex], ...updates };
    writeData(data);
    res.json({ success: true, session: data.sessions[sessionIndex] });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/tags', authMiddleware, (req, res) => {
  const data = readData();
  const { tag } = req.body;
  if (tag && !data.tags.includes(tag)) {
    data.tags.push(tag);
    writeData(data);
  }
  res.json({ success: true, tags: data.tags });
});

app.delete('/api/tags/:tag', authMiddleware, (req, res) => {
  const data = readData();
  const config = readConfig();
  const tag = req.params.tag;
  
  data.tags = data.tags.filter(t => t !== tag);
  if (data.topics && data.topics[tag]) {
    delete data.topics[tag];
  }
  writeData(data);
  
  if (config.tagTargets && config.tagTargets[tag] !== undefined) {
    delete config.tagTargets[tag];
    writeConfig(config);
  }
  
  res.json({ success: true });
});

// Settings Endpoints
app.get('/api/settings', authMiddleware, (req, res) => {
  const conf = readConfig();
  // resolve absolute path to return to UI
  const absoluteDataPath = path.isAbsolute(conf.dataPath) ? conf.dataPath : path.resolve(__dirname, conf.dataPath);
  res.json({ ...conf, absoluteDataPath });
});

app.post('/api/settings', authMiddleware, (req, res) => {
  const currentConf = readConfig();
  const newConf = { ...currentConf, ...req.body };
  writeConfig(newConf);
  ensureDataExists(); // Create if new path
  
  // Bug fix: Sync tags from targets to data.tags
  if (newConf.tagTargets) {
    const data = readData();
    let updated = false;
    Object.keys(newConf.tagTargets).forEach(tag => {
      if (!data.tags.includes(tag)) {
        data.tags.push(tag);
        updated = true;
      }
    });
    if (updated) writeData(data);
  }

  res.json({ success: true, config: newConf });
});

// Export & Import Endpoints
app.get('/api/export', authMiddleware, (req, res) => {
  const conf = readConfig();
  const data = readData();
  res.json({
    version: "1.0",
    exportDate: new Date().toISOString(),
    settings: conf,
    data: data
  });
});

app.post('/api/import', authMiddleware, (req, res) => {
  const payload = req.body;
  if (!payload || !payload.settings || !payload.data) {
    return res.status(400).json({ error: "Invalid import format" });
  }

  const currentData = readData();
  const currentConf = readConfig();

  // Determine overlap
  let currentSessions = [...(currentData.sessions || []), ...(currentData.meditations || [])];
  let importedSessions = [...(payload.data.sessions || []), ...(payload.data.meditations || [])];

  let hasOverlap = false;
  if (currentSessions.length > 0 && importedSessions.length > 0) {
    const currentMin = Math.min(...currentSessions.map(s => new Date(s.startTime).getTime()));
    const currentMax = Math.max(...currentSessions.map(s => new Date(s.startTime).getTime()));
    const importedMin = Math.min(...importedSessions.map(s => new Date(s.startTime).getTime()));
    const importedMax = Math.max(...importedSessions.map(s => new Date(s.startTime).getTime()));

    hasOverlap = (importedMin <= currentMax && importedMax >= currentMin);
  }

  // Backup current
  const backupStr = JSON.stringify({ settings: currentConf, data: currentData }, null, 2);
  const backupPath = path.join(__dirname, `backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, backupStr);

  if (!hasOverlap) {
    // Merge
    const newConf = { ...currentConf, ...payload.settings, dataPath: currentConf.dataPath, password: currentConf.password };
    writeConfig(newConf);

    const mergedSessions = [...currentData.sessions];
    const existingSessionIds = new Set(mergedSessions.map(s => s.id));
    (payload.data.sessions || []).forEach(s => {
      if (!existingSessionIds.has(s.id)) mergedSessions.push(s);
    });

    const mergedMeditations = [...(currentData.meditations || [])];
    const existingMedIds = new Set(mergedMeditations.map(s => s.id));
    (payload.data.meditations || []).forEach(s => {
      if (!existingMedIds.has(s.id)) mergedMeditations.push(s);
    });

    const mergedTags = [...new Set([...currentData.tags, ...(payload.data.tags || [])])];
    
    // Merge topics
    const mergedTopics = { ...(currentData.topics || {}), ...(payload.data.topics || {}) };

    writeData({
      tags: mergedTags,
      topics: mergedTopics,
      sessions: mergedSessions,
      meditations: mergedMeditations
    });
    
    return res.json({ success: true, action: "merged", backup: backupPath });
  } else {
    // Overwrite
    const newConf = { ...payload.settings, dataPath: currentConf.dataPath, password: currentConf.password };
    writeConfig(newConf);
    
    const finalData = { ...payload.data };
    if (!finalData.topics && currentData.topics) {
       finalData.topics = currentData.topics;
    }
    
    writeData(finalData);
    return res.json({ success: true, action: "overwritten", backup: backupPath });
  }
});

app.delete('/api/data', authMiddleware, (req, res) => {
  const currentData = readData();
  const currentConf = readConfig();
  
  // Backup before wiping
  const backupStr = JSON.stringify({ settings: currentConf, data: currentData }, null, 2);
  const backupPath = path.join(__dirname, `backup_wipe_${Date.now()}.json`);
  fs.writeFileSync(backupPath, backupStr);

  const freshData = {
    tags: ["Focus", "Study"],
    sessions: [],
    meditations: [],
    topics: {}
  };
  
  freshData.tags.forEach(t => {
    freshData.topics[t] = { topicId: t, parentDomain: "Uncategorized", lastStudied: null, historicalTau: 25, averageFrictionRate: 0, lastSessionEndState: null, lastFrictionNote: null };
  });

  const freshConfig = { 
    dataPath: currentConf.dataPath, 
    dailyTargetMinutes: 240, 
    weeklyTargetMinutes: 1200, 
    smartBreakPrompts: true, 
    tagTargets: {}, 
    tagColors: {},
    password: currentConf.password,
    enableMeditation: false,
    meditationSoundPath: "",
    meditationDailyTargetMinutes: 15,
    meditationWeeklyTargetMinutes: 60,
    meditationDailyTargetSessions: 1,
    meditationWeeklyTargetSessions: 3,
    theme: "dark",
    accentHue: 210,
    timerStyle: "text",
    showGoalsOnTimer: true,
    enabledVisualizations: { sfi: true, timeByTag: true, timeOfDay: true, heatmap: true, stressEnergy: true, timeFocused: true, tagPie: true },
    enableEpistemicTracking: false,
    enableInterleaving: false
  };

  writeConfig(freshConfig);
  writeData(freshData);
  res.json({ success: true, backup: backupPath });
});
// Custom Audio streaming endpoint
app.get('/api/audio', authMiddleware, (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.sendFile(filePath);
});

// Serve static frontend
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`FocusLog server running on port ${PORT}`);
});
