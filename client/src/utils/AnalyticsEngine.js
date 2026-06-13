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
  sessions.forEach(s => {
    if (!s.distractions) return;
    const start = new Date(s.startTime).getTime();
    s.distractions.forEach(d => {
      const timeOffset = (new Date(d.time).getTime() - start) / 60000; 
      const binIdx = Math.floor(timeOffset / 10) * 10;
      if (!bins[binIdx]) bins[binIdx] = 0;
      bins[binIdx]++;
    });
  });
  
  const formatted = Object.keys(bins).map(k => ({
    binStart: parseInt(k),
    label: `${k}-${parseInt(k)+10}m`,
    count: bins[k]
  })).sort((a,b) => a.binStart - b.binStart);
  
  let peakBin = null;
  let maxCount = -1;
  formatted.forEach(b => {
    if (b.count > maxCount) { maxCount = b.count; peakBin = b; }
  });
  
  return { curve: formatted, peakBin };
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
