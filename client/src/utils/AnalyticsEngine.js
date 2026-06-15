export const calculateTTFD = (session) => {
  if (!session.distractions || session.distractions.length === 0) {
    return session.durationActual / 60; 
  }
  const firstDist = new Date(session.distractions[0].time).getTime();
  const start = new Date(session.startTime).getTime();
  return (firstDist - start) / 60000;
};

export const calculateMaxFlowBlock = (session) => {
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime || (start + session.durationActual * 1000)).getTime();
  const points = [start];
  if (session.distractions) {
    session.distractions.forEach(d => points.push(new Date(d.time).getTime()));
  }
  points.push(end);
  points.sort();
  
  let maxDelta = 0;
  for(let i=1; i<points.length; i++) {
    const delta = points[i] - points[i-1];
    if (delta > maxDelta) maxDelta = delta;
  }
  return maxDelta / 60000;
};

export const calculateFatigueCurve = (sessions) => {
  const bins = {}; 
  const sessionsReached = {};
  
  sessions.forEach(s => {
    const start = new Date(s.startTime).getTime();
    const duration = s.durationActual ? s.durationActual / 60 : 0;
    
    // Track how many sessions reached each bin
    for (let i = 0; i <= Math.floor(duration / 10) * 10; i += 10) {
      if (!sessionsReached[i]) sessionsReached[i] = 0;
      sessionsReached[i]++;
    }

    if (!s.distractions) return;
    s.distractions.forEach(d => {
      const timeOffset = (new Date(d.time).getTime() - start) / 60000; 
      const binIdx = Math.floor(timeOffset / 10) * 10;
      if (!bins[binIdx]) bins[binIdx] = 0;
      bins[binIdx]++;
    });
  });
  
  const formatted = Object.keys(bins).map(k => {
    const binStart = parseInt(k);
    const count = bins[k];
    const reached = sessionsReached[binStart] || 1;
    const normalizedRate = count / reached;
    return {
      binStart,
      label: `${binStart}-${binStart+10}m`,
      count,
      normalizedRate
    };
  }).sort((a,b) => a.binStart - b.binStart);
  
  let peakBin = null;
  let maxRate = -1;
  formatted.forEach(b => {
    if (b.normalizedRate > maxRate) { maxRate = b.normalizedRate; peakBin = b; }
  });
  
  let ttfdSum = 0;
  let ttfdCount = 0;
  sessions.forEach(s => {
    if (s.distractions && s.distractions.length > 0) {
      const start = new Date(s.startTime).getTime();
      const firstD = new Date(s.distractions[0].time).getTime();
      ttfdSum += (firstD - start) / 60000;
      ttfdCount++;
    }
  });
  const avgEndurance = ttfdCount > 0 ? (ttfdSum / ttfdCount) : 25;
  
  return { curve: formatted, peakBin, enduranceLimit: avgEndurance };
};

export const calculateRecoveryMetric = (session) => {
  if (!session.distractions || session.distractions.length === 0) return null;
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime || (start + session.durationActual * 1000)).getTime();
  
  const distTimes = session.distractions.map(d => new Date(d.time).getTime()).sort();
  let totalRecovery = 0;
  let recoveryCount = 0;
  
  for(let i=0; i<distTimes.length; i++) {
    const dTime = distTimes[i];
    let currT = dTime;
    for(let j=i; j<distTimes.length; j++) {
      const nextEvent = (j+1 < distTimes.length) ? distTimes[j+1] : end;
      const blockLength = (nextEvent - distTimes[j]) / 60000;
      if (blockLength >= 15) {
        totalRecovery += (distTimes[j] - dTime) / 60000;
        recoveryCount++;
        break;
      }
    }
  }
  return recoveryCount > 0 ? (totalRecovery / recoveryCount) : null;
};

export const calculateTaskResilience = (sessions) => {
  const tagData = {};
  sessions.forEach(s => {
    if (!tagData[s.tag]) tagData[s.tag] = { totalTime: 0, distractionCount: 0 };
    tagData[s.tag].totalTime += s.durationActual / 60;
    tagData[s.tag].distractionCount += s.distractions ? s.distractions.length : 0;
  });
  
  const resilience = [];
  Object.keys(tagData).forEach(tag => {
    const d = tagData[tag];
    const avgMins = d.distractionCount > 0 ? (d.totalTime / d.distractionCount) : d.totalTime;
    if (d.totalTime > 0) {
      resilience.push({ tag, avgMinsBetweenDistractions: avgMins });
    }
  });
  return resilience.sort((a,b) => b.avgMinsBetweenDistractions - a.avgMinsBetweenDistractions);
};

export const calculateContextSwitchPenalty = (sessions) => {
  const sorted = [...sessions].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const penalties = [];
  
  for(let i=1; i<sorted.length; i++) {
    const prev = sorted[i-1];
    const curr = sorted[i];
    
    const gapHours = (new Date(curr.startTime).getTime() - new Date(prev.endTime || prev.startTime).getTime()) / 3600000;
    if (gapHours > 4) continue; 
    
    if (prev.tag !== curr.tag && prev.sfi && curr.sfi) {
      const drop = prev.sfi - curr.sfi;
      if (drop > 15) {
        penalties.push({
          date: curr.startTime,
          fromTag: prev.tag,
          toTag: curr.tag,
          prevSfi: Math.round(prev.sfi),
          currSfi: Math.round(curr.sfi),
          drop: Math.round(drop)
        });
      }
    }
  }
  return penalties.reverse();
};

export const calculateStressEnergyCorrelation = (sessions) => {
  const pairs = sessions.filter(s => s.stress !== undefined && s.energy !== undefined).map(s => [s.stress, s.energy]);
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const sumX = pairs.reduce((acc, val) => acc + val[0], 0);
  const sumY = pairs.reduce((acc, val) => acc + val[1], 0);
  const sumXY = pairs.reduce((acc, val) => acc + val[0]*val[1], 0);
  const sumX2 = pairs.reduce((acc, val) => acc + val[0]*val[0], 0);
  const sumY2 = pairs.reduce((acc, val) => acc + val[1]*val[1], 0);
  
  const num = (n * sumXY) - (sumX * sumY);
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
};

export const calculateFocusTrend = (sessions) => {
  if (sessions.length < 2) return { trend: 'neutral', slope: 0 };
  const sorted = [...sessions].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const n = sorted.length;
  const x = Array.from({length: n}, (_, i) => i);
  const y = sorted.map(s => s.sfi || 0);
  
  const sumX = x.reduce((a,b)=>a+b, 0);
  const sumY = y.reduce((a,b)=>a+b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val*y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val*val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  let trend = 'neutral';
  if (slope > 0.5) trend = 'improving';
  else if (slope < -0.5) trend = 'worsening';
  
  return { trend, slope };
};

export const processDistractionCloud = (sessions) => {
  const words = {};
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'of', 'my', 'it', 'that', 'this', 'i'];
  
  sessions.forEach(s => {
    if (s.distractions) {
      s.distractions.forEach(d => {
        if (!d.cause) return;
        const cleanWords = d.cause.toLowerCase().replace(/[^\\w\\s]/g, '').split(/\\s+/);
        cleanWords.forEach(w => {
          if (w.length > 2 && !stopWords.includes(w)) {
            if (!words[w]) words[w] = { count: 0, internal: 0, external: 0 };
            words[w].count++;
            if (d.type === 'internal') words[w].internal++;
            else if (d.type === 'external') words[w].external++;
          }
        });
      });
    }
  });
  
  const sorted = Object.keys(words).map(k => ({
    text: k,
    value: words[k].count,
    type: words[k].internal >= words[k].external ? 'internal' : 'external'
  })).sort((a,b) => b.value - a.value).slice(0, 15);
  
  return sorted;
};

export const calculateCognitiveExpenditure = (session) => {
  if (!session.events || !Array.isArray(session.events)) return { totalE: 0, curve: [] };
  
  let totalE = 0;
  let curve = [];
  const weights = { INGESTION: 0.8, SYMBOL_MANIPULATION: 1.5, SENSE_MAKING: 1.2, TRANSLATION: 1.0 };
  let currentState = null;
  let stateStartTime = new Date(session.startTime).getTime();
  const sessionStart = stateStartTime;
  
  session.events.forEach(evt => {
    const t = new Date(evt.timestamp).getTime();
    if (currentState) {
      const durationMins = (t - stateStartTime) / 60000;
      if (durationMins > 0) {
        const eAdded = durationMins * (weights[currentState] || 0);
        totalE += eAdded;
        curve.push({
          timeMins: (t - sessionStart) / 60000,
          E: totalE
        });
      }
    }
    
    if (evt.type === 'STATE_CHANGE') {
      currentState = evt.state;
      stateStartTime = t;
    } else if (evt.type === 'SESSION_END') {
      currentState = null;
    }
  });
  
  return { totalE, curve };
};

export const generateFrictionHeatmapData = (sessions) => {
  const dataMap = {}; 
  const frictionTypes = new Set();
  
  sessions.forEach(s => {
    if (!s.events || !Array.isArray(s.events)) return;
    const topic = s.tag || 'Untagged';
    if (!dataMap[topic]) dataMap[topic] = {};
    
    s.events.forEach(evt => {
      if (evt.type === 'FRICTION_LOG') {
        const fType = evt.frictionType || 'Unknown';
        frictionTypes.add(fType);
        if (!dataMap[topic][fType]) dataMap[topic][fType] = 0;
        dataMap[topic][fType]++;
      }
    });
  });
  
  const formattedData = [];
  Object.keys(dataMap).forEach(topic => {
    const row = { topic };
    Array.from(frictionTypes).forEach(ft => {
      row[ft] = dataMap[topic][ft] || 0;
    });
    formattedData.push(row);
  });
  
  return { data: formattedData, frictionTypes: Array.from(frictionTypes) };
};

export const generateEfficiencyCurves = (sessions) => {
  const scatterData = [];
  sessions.forEach(s => {
    if (!s.events) return;
    const { totalE } = calculateCognitiveExpenditure(s);
    if (totalE > 0 && s.durationActual > 0) {
      scatterData.push({
        durationMins: Math.round(s.durationActual / 60),
        E: Math.round(totalE)
      });
    }
  });
  return scatterData.sort((a,b) => a.durationMins - b.durationMins);
};

export const calculateStanceEndurance = (sessions) => {
  const stanceData = {};
  
  sessions.forEach(s => {
    if (!s.events || !Array.isArray(s.events)) return;
    let currentStance = null;
    let stanceStartTime = new Date(s.startTime).getTime();
    
    s.events.forEach(evt => {
      const t = new Date(evt.timestamp).getTime();
      
      if (currentStance && (evt.type === 'STATE_CHANGE' || evt.type === 'SESSION_END')) {
        const duration = (t - stanceStartTime) / 1000;
        if (!stanceData[currentStance]) stanceData[currentStance] = { totalTime: 0, distractionCount: 0 };
        stanceData[currentStance].totalTime += duration;
        
        const dists = (s.distractions || []).filter(d => {
           const dt = new Date(d.time).getTime();
           return dt >= stanceStartTime && dt < t;
        }).length;
        stanceData[currentStance].distractionCount += dists;
      }
      
      if (evt.type === 'STATE_CHANGE') {
        currentStance = evt.state;
        stanceStartTime = t;
      } else if (evt.type === 'SESSION_END') {
        currentStance = null;
      }
    });
  });

  return Object.entries(stanceData).map(([stance, data]) => {
    const hours = data.totalTime / 3600;
    const rate = hours > 0 ? (data.distractionCount / hours) : 0;
    return {
      stance,
      totalMinutes: Math.round(data.totalTime / 60),
      distractionRate: rate
    };
  });
};

export const calculateEnduranceConstants = (sessions) => {
  const topicTau = {};
  sessions.forEach(s => {
    const topic = s.tag || 'Untagged';
    if (!topicTau[topic]) topicTau[topic] = [];
    
    const failureEvents = [];
    if (s.distractions) s.distractions.forEach(d => failureEvents.push(new Date(d.time).getTime()));
    if (s.events) {
      s.events.forEach(e => {
        if (e.type === 'FRICTION_LOG') failureEvents.push(new Date(e.timestamp).getTime());
      });
    }
    failureEvents.sort();
    
    const start = new Date(s.startTime).getTime();
    
    let found = false;
    for (let i = 0; i <= failureEvents.length - 3; i++) {
      const e1 = failureEvents[i];
      const e3 = failureEvents[i+2];
      if ((e3 - e1) <= 600000) { 
        topicTau[topic].push((e3 - start) / 60000); 
        found = true;
        break;
      }
    }
  });
  
  const result = {};
  Object.keys(topicTau).forEach(topic => {
    const times = topicTau[topic].sort((a,b) => a-b);
    if (times.length > 0) {
      const mid = Math.floor(times.length / 2);
      result[topic] = times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
    } else {
      result[topic] = 25;
    }
  });
  return result;
};

export const calculateKaplanMeier = (sessions) => {
  const stateData = {};
  
  sessions.forEach(s => {
    if (!s.events) return;
    const failureEvents = [];
    if (s.distractions) s.distractions.forEach(d => failureEvents.push(new Date(d.time).getTime()));
    s.events.forEach(e => {
      if (e.type === 'FRICTION_LOG') failureEvents.push(new Date(e.timestamp).getTime());
    });
    failureEvents.sort();

    let currentState = null;
    let stateStart = 0;
    
    s.events.forEach(evt => {
      const t = new Date(evt.timestamp).getTime();
      
      if (currentState && (evt.type === 'STATE_CHANGE' || evt.type === 'SESSION_END')) {
        if (!stateData[currentState]) stateData[currentState] = [];
        
        const failure = failureEvents.find(f => f >= stateStart && f < t);
        if (failure) {
          stateData[currentState].push({ time: (failure - stateStart) / 60000, event: 1 });
        } else {
          stateData[currentState].push({ time: (t - stateStart) / 60000, event: 0 }); 
        }
      }
      
      if (evt.type === 'STATE_CHANGE') {
        currentState = evt.state;
        stateStart = t;
      } else if (evt.type === 'SESSION_END') {
        currentState = null;
      }
    });
  });

  const curves = {};
  Object.keys(stateData).forEach(state => {
    const obs = stateData[state].sort((a,b) => a.time - b.time);
    let n = obs.length;
    let s = 1.0;
    const curve = [{ time: 0, survival: 1.0 }];
    
    for (let i = 0; i < obs.length; i++) {
      if (obs[i].event === 1) {
        s = s * (1 - 1/n);
        curve.push({ time: obs[i].time, survival: s });
      }
      n--;
    }
    if (obs.length > 0) {
      curve.push({ time: obs[obs.length-1].time, survival: s });
    }
    curves[state] = curve;
  });
  
  return curves;
};

export const calculatePhaseSpaceHazard = (sessions) => {
  const scatter = [];
  sessions.forEach(s => {
    const failureEvents = [];
    if (s.distractions) s.distractions.forEach(d => failureEvents.push(new Date(d.time).getTime()));
    if (s.events) s.events.forEach(e => { if (e.type === 'FRICTION_LOG') failureEvents.push(new Date(e.timestamp).getTime()); });
    failureEvents.sort();
    
    const start = new Date(s.startTime).getTime();
    
    failureEvents.forEach(f => {
      const m = (f - start) / 60000;
      const windowStart = f - 600000; 
      let count = 0;
      failureEvents.forEach(fe => {
        if (fe >= windowStart && fe <= f) count++;
      });
      scatter.push({ durationMins: m, hazardRate: count });
    });
  });
  return scatter.sort((a,b) => a.durationMins - b.durationMins);
};

export const calculateInterleavingQueue = (topics, currentTopic, currentStance) => {
  const alpha = 0.5;
  const beta = 0.5;
  
  const queue = Object.values(topics).map(t => {
    const td = t.lastStudied ? (Date.now() - new Date(t.lastStudied).getTime()) / 3600000 : 24; 
    const friction = t.averageFrictionRate || 0;
    
    let dc = 0;
    if (t.topicId !== currentTopic && t.lastSessionEndState === currentStance) {
      dc = -10; 
    }
    
    const p = (alpha * td) + (beta * friction * 10) + dc;
    return { ...t, priorityScore: p };
  });
  
  return queue.filter(t => t.topicId !== currentTopic).sort((a,b) => b.priorityScore - a.priorityScore);
};

export const calculateCognitiveDistanceMatrix = (sessions) => {
  const sorted = [...sessions].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const pairs = {};
  
  for(let i=1; i<sorted.length; i++) {
    const prev = sorted[i-1].tag || 'Untagged';
    const curr = sorted[i].tag || 'Untagged';
    
    if (prev !== curr) {
      const pairId = `${prev} -> ${curr}`;
      if (!pairs[pairId]) pairs[pairId] = { source: prev, target: curr, count: 0 };
      pairs[pairId].count++;
    }
  }
  
  return Object.values(pairs);
};

export const calculateRetrievalLatencyTrend = (sessions) => {
  const data = [];
  const sorted = [...sessions].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  sorted.forEach(s => {
    if (s.entryTicketLatency !== undefined && s.entryTicketLatency !== null) {
      data.push({
        date: new Date(s.startTime).toLocaleDateString(),
        latencySeconds: s.entryTicketLatency / 1000
      });
    }
  });
  return data;
};
