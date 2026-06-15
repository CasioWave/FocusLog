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
