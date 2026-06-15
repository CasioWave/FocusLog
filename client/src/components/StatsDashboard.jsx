import { useState, useEffect, useMemo } from 'react';
import { Download, Calendar, Trash2, Edit2, PlusCircle, Target } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis, ErrorBar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import ManualSessionModal from './ManualSessionModal';
import EditSessionModal from './EditSessionModal';
import { 
  calculateTTFD, calculateMaxFlowBlock, calculateFatigueCurve, 
  calculateRecoveryMetric, calculateTaskResilience, calculateContextSwitchPenalty,
  calculateStressEnergyCorrelation, calculateFocusTrend
} from '../utils/AnalyticsEngine';
import Heatmap from './Heatmap';

const getLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function StatsDashboard({ isActive, refreshKey, onDataChange, config: propConfig }) {
  const [data, setData] = useState({ tags: [], sessions: [], meditations: [] });
  const [config, setConfig] = useState({ tagColors: {}, enabledVisualizations: {} });
  const [dateRange, setDateRange] = useState('30'); // '7', '30', 'all'
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [selectedDay, setSelectedDay] = useState(null);
  const [timelineLimit, setTimelineLimit] = useState(10);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'advanced'
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [editSession, setEditSession] = useState(null);

  useEffect(() => {
    if (isActive) {
      Promise.all([
        fetch('/api/data'),
        fetch('/api/settings')
      ])
      .then(([res1, res2]) => Promise.all([res1.json(), res2.json()]))
      .then(([data, conf]) => {
        setData(data);
        setConfig(conf);
      })
      .catch(console.error);
    }
  }, [isActive, refreshKey]);

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSessions = useMemo(() => {
    let list = data.sessions;
    if (dateRange !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
      list = list.filter(s => new Date(s.startTime) >= cutoff);
    }
    if (selectedTagFilter !== 'All') {
      list = list.filter(s => s.tag === selectedTagFilter);
    }
    return list;
  }, [data.sessions, dateRange, selectedTagFilter]);

  const uniqueTags = useMemo(() => {
    const tags = new Set(data.sessions.map(s => s.tag));
    data.tags.forEach(t => tags.add(t));
    return Array.from(tags).filter(Boolean);
  }, [data]);

  const timelineSessions = useMemo(() => {
    let list = filteredSessions;
    if (selectedDay) {
      list = list.filter(s => getLocalDate(new Date(s.startTime)) === selectedDay || s.startTime.startsWith(selectedDay));
    }
    // Sort descending
    return [...list].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [filteredSessions, selectedDay]);

  const uniqueDays = useMemo(() => {
    const days = new Set(filteredSessions.map(s => getLocalDate(new Date(s.startTime))));
    return Array.from(days).sort((a, b) => new Date(b) - new Date(a));
  }, [filteredSessions]);

  useEffect(() => {
    setTimelineLimit(10);
  }, [dateRange, selectedTagFilter, selectedDay]);

  // Heatmap & Streaks Logic
  const heatmapData = useMemo(() => {
    const map = {};
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Initialize last 364 days to 0
    for(let i=0; i<364; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map[getLocalDate(d)] = 0;
    }
    
    data.sessions.forEach(s => {
      const d = getLocalDate(new Date(s.startTime));
      if (map[d] !== undefined) {
        map[d] += s.durationActual / 60;
      }
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let streakSums = 0;
    let streakCounts = 0;

    let tempStreak = 0;
    const sortedDays = Object.keys(map).sort(); // chronological
    for (let i = 0; i < sortedDays.length; i++) {
      if (map[sortedDays[i]] > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        if (i === sortedDays.length - 1) currentStreak = tempStreak;
      } else {
        if (tempStreak > 0) {
          streakSums += tempStreak;
          streakCounts++;
        }
        tempStreak = 0;
      }
    }
    if (tempStreak > 0 && map[sortedDays[sortedDays.length-1]] === 0) {
      // It ended earlier
      streakSums += tempStreak;
      streakCounts++;
    }

    return { 
      days: sortedDays.map(date => ({ date, val: map[date] })), 
      currentStreak, 
      longestStreak, 
      avgStreak: streakCounts > 0 ? (streakSums / streakCounts).toFixed(1) : 0 
    };
  }, [data.sessions]);

  const todaysData = useMemo(() => {
    const today = getLocalDate(new Date());
    let totalTime = 0;
    let tagsTime = {};
    data.sessions.forEach(s => {
      if (getLocalDate(new Date(s.startTime)) === today) {
        const mins = s.durationActual / 60;
        totalTime += mins;
        if (!tagsTime[s.tag]) tagsTime[s.tag] = 0;
        tagsTime[s.tag] += mins;
      }
    });
    return { totalTime, tagsTime };
  }, [data.sessions]);

  const renderProgressBar = (label, currentMins, targetMins) => {
    const pct = targetMins > 0 ? Math.min(100, (currentMins / targetMins) * 100) : 0;
    return (
      <div key={label} style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', opacity: 0.8 }}>
          <span>{label}</span>
          <span>{Math.round(currentMins)} / {targetMins}m</span>
        </div>
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--md-sys-color-surface-variant)', overflow: 'hidden', borderRadius: '2px' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--md-sys-color-primary)', transition: 'width 0.5s' }} />
        </div>
      </div>
    );
  };

  // Chart Data Processing
  const sessionsByTag = filteredSessions.reduce((acc, s) => {
    if (!acc[s.tag]) acc[s.tag] = 0;
    acc[s.tag] += s.durationActual / 60; 
    return acc;
  }, {});
  
  const barData = Object.keys(sessionsByTag).map(tag => ({
    name: tag, minutes: Math.round(sessionsByTag[tag])
  }));

  const sfiData = useMemo(() => {
    const dailyMap = {};
    filteredSessions.forEach(s => {
      const d = getLocalDate(new Date(s.startTime));
      if (!dailyMap[d]) dailyMap[d] = [];
      dailyMap[d].push(s.sfi || 0);
    });

    const result = Object.keys(dailyMap).map(date => {
      const vals = dailyMap[date];
      const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
      let stdDev = 0;
      if (vals.length > 1) {
        const variance = vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length;
        stdDev = Math.sqrt(variance);
      }
      return {
        date,
        sfi: Math.round(avg),
        error: Math.round(stdDev)
      };
    });

    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredSessions]);

  const stressEnergyData = useMemo(() => {
    const dailyMap = {};
    filteredSessions.forEach(s => {
      if (s.stress === undefined || s.energy === undefined) return;
      const d = getLocalDate(new Date(s.startTime));
      if (!dailyMap[d]) dailyMap[d] = { stress: [], energy: [] };
      dailyMap[d].stress.push(s.stress);
      dailyMap[d].energy.push(s.energy);
    });

    const result = Object.keys(dailyMap).map(date => {
      const vals = dailyMap[date];
      const avgStress = vals.stress.reduce((sum, v) => sum + v, 0) / vals.stress.length;
      const avgEnergy = vals.energy.reduce((sum, v) => sum + v, 0) / vals.energy.length;
      return {
        date,
        stress: Math.round(avgStress * 10) / 10,
        energy: Math.round(avgEnergy * 10) / 10
      };
    });

    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredSessions]);

  const tagPieData = Object.keys(sessionsByTag).map(tag => ({
    name: tag, value: Math.round(sessionsByTag[tag])
  }));

  const dailyFocusTimeData = useMemo(() => {
    const map = {};
    filteredSessions.forEach(s => {
      const d = getLocalDate(new Date(s.startTime));
      if (map[d] === undefined) map[d] = 0;
      map[d] += s.durationActual / 60;
    });

    const sortedDays = Object.keys(map).sort();
    if (sortedDays.length === 0) return [];
    
    let startD = new Date(sortedDays[0]);
    let endD = new Date(sortedDays[sortedDays.length - 1]);
    
    if (dateRange !== 'all') {
       endD = new Date();
       startD = new Date();
       startD.setDate(startD.getDate() - parseInt(dateRange) + 1);
    }
    
    const result = [];
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
       const dStr = getLocalDate(d);
       result.push({
           date: dStr,
           val: Math.round(map[dStr] || 0)
       });
    }
    return result;
  }, [filteredSessions, dateRange]);

  const timeOfDayData = useMemo(() => {
    const hourlyMap = Array(24).fill(null).map(() => []);
    
    data.sessions.forEach(s => {
      if (!s.sfi || s.sfi === 0) return;
      const start = new Date(s.startTime);
      const end = new Date(start.getTime() + (s.durationActual || 0) * 1000);
      
      let currentHourTs = new Date(start).setMinutes(0, 0, 0); 
      const endTs = end.getTime();
      
      while (currentHourTs <= endTs) {
          const h = new Date(currentHourTs).getHours();
          hourlyMap[h].push(s.sfi);
          currentHourTs += 60 * 60 * 1000;
      }
    });

    return hourlyMap.map((vals, i) => {
      const avg = vals.length > 0 ? vals.reduce((sum, v) => sum + v, 0) / vals.length : 0;
      return {
        hour: `${i}:00`,
        avgSfi: Math.round(avg)
      };
    });
  }, [data.sessions]);

  const maxTimeOfDaySfi = useMemo(() => {
    const max = Math.max(0, ...timeOfDayData.map(d => d.avgSfi));
    return max > 0 ? Math.ceil(max / 10) * 10 : 100;
  }, [timeOfDayData]);

  const exportCSV = () => {
    let csv = "Session ID,Goal,Tag,Type,Start Time,End Time,Duration (s),Distractions,SFI\n";
    filteredSessions.forEach(s => {
      csv += `${s.id},"${s.goal}",${s.tag},${s.type},${s.startTime},${s.endTime},${s.durationActual},${(s.distractions || []).length},${s.sfi}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `focuslog.csv`; a.click();
  };

  const advancedMetrics = useMemo(() => {
    let ttfdSum = 0, ttfdCount = 0;
    let flowSum = 0, flowCount = 0;
    let recSum = 0, recCount = 0;
    
    filteredSessions.forEach(s => {
      const ttfd = calculateTTFD(s);
      if (ttfd !== null && !isNaN(ttfd)) { ttfdSum += ttfd; ttfdCount++; }
      
      const flow = calculateMaxFlowBlock(s);
      if (flow !== null && !isNaN(flow)) { flowSum += flow; flowCount++; }
      
      const rec = calculateRecoveryMetric(s);
      if (rec !== null && !isNaN(rec)) { recSum += rec; recCount++; }
    });
    
    const avgTTFD = ttfdCount > 0 ? (ttfdSum / ttfdCount) : 0;
    const avgMaxFlow = flowCount > 0 ? (flowSum / flowCount) : 0;
    const avgRecovery = recCount > 0 ? (recSum / recCount) : 0;
    
    const { curve, peakBin, enduranceLimit } = calculateFatigueCurve(filteredSessions);
    const resilience = calculateTaskResilience(filteredSessions);
    const contextPenalties = calculateContextSwitchPenalty(filteredSessions);
    
    const stressEnergyCorr = calculateStressEnergyCorrelation(filteredSessions);
    const focusTrend = calculateFocusTrend(filteredSessions);
    
    return { avgTTFD, avgMaxFlow, avgRecovery, curve, peakBin, enduranceLimit, resilience, contextPenalties, stressEnergyCorr, focusTrend };
  }, [filteredSessions]);

  const getHeatmapColor = (val) => {
    if (val === 0) return 'var(--md-sys-color-surface-variant)';
    if (val < 30) return 'rgba(103, 80, 164, 0.4)'; // Primary color with opacity
    if (val < 120) return 'rgba(103, 80, 164, 0.7)';
    return 'var(--md-sys-color-primary)';
  };

  return (
    <div className="stats-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Filters */}
      <div className="md-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Analytics</h2>
          <div style={{ display: 'flex', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '16px', padding: '4px' }}>
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} style={{ padding: '4px 16px', border: 'none' }} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`} style={{ padding: '4px 16px', border: 'none' }} onClick={() => setActiveTab('advanced')}>Advanced Insights</button>
          </div>
          <div style={{ display: 'flex', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '16px', padding: '4px' }}>
            <button className={`tab-btn ${dateRange === '7' ? 'active' : ''}`} style={{ padding: '4px 16px', border: 'none' }} onClick={() => setDateRange('7')}>7D</button>
            <button className={`tab-btn ${dateRange === '30' ? 'active' : ''}`} style={{ padding: '4px 16px', border: 'none' }} onClick={() => setDateRange('30')}>30D</button>
            <button className={`tab-btn ${dateRange === 'all' ? 'active' : ''}`} style={{ padding: '4px 16px', border: 'none' }} onClick={() => setDateRange('all')}>All</button>
          </div>
          <select 
            className="md-input" 
            style={{ padding: '6px 12px', minWidth: '150px' }}
            value={selectedTagFilter}
            onChange={e => setSelectedTagFilter(e.target.value)}
          >
            <option value="All">All Tags</option>
            {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="md-button md-button-secondary" onClick={() => setShowManualModal(true)}>
            <PlusCircle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> Log Manual
          </button>
          <button className="md-button md-button-secondary" onClick={exportCSV}>
            <Download size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> CSV
          </button>
        </div>
      </div>

      {activeTab === 'advanced' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div className="md-card">
              <h4>Avg Time-to-First-Distraction</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>{Math.round(advancedMetrics.avgTTFD)} mins</div>
            </div>
            <div className="md-card">
              <h4>Avg Max Flow Block</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>{Math.round(advancedMetrics.avgMaxFlow)} mins</div>
            </div>
            <div className="md-card">
              <h4>Avg Recovery Time</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>{Math.round(advancedMetrics.avgRecovery)} mins</div>
            </div>
            <div className="md-card">
              <h4>Stress-Energy Correlation</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>{advancedMetrics.stressEnergyCorr.toFixed(2)}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Values near 1 or -1 indicate strong correlation.</p>
            </div>
            <div className="md-card">
              <h4>Focus Trend</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>{advancedMetrics.focusTrend.trend.toUpperCase()}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Slope: {advancedMetrics.focusTrend.slope.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="md-card">
              <h3 style={{ marginBottom: '8px' }}>Fatigue Curve</h3>
              {advancedMetrics.peakBin && <p style={{ color: 'var(--md-sys-color-error)', marginBottom: '16px' }}>Cognitive Cliff: <strong>{advancedMetrics.peakBin.label}</strong></p>}
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={advancedMetrics.curve}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline)" opacity={0.2} />
                    <XAxis dataKey="label" stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                    <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                    <Tooltip cursor={{fill: 'var(--md-sys-color-surface-variant)', opacity: 0.5}} contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)' }} />
                    <Bar dataKey="count" name="Distractions" fill="var(--md-sys-color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="md-card">
              <h3 style={{ marginBottom: '16px' }}>Task Resilience</h3>
              <div style={{ height: '300px', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {advancedMetrics.resilience.map(r => (
                    <li key={r.tag} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--md-sys-color-outline)' }}>
                      <span>{r.tag}</span>
                      <strong>{Math.round(r.avgMinsBetweenDistractions)} mins/distraction</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="md-card">
            <h3 style={{ marginBottom: '16px' }}>Context Switch Penalties (&gt;15% SFI Drop)</h3>
            {advancedMetrics.contextPenalties.length === 0 ? (
              <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>No significant context switch penalties detected.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {advancedMetrics.contextPenalties.map((p, i) => (
                  <li key={i} style={{ padding: '16px', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold' }}>{new Date(p.date).toLocaleString()}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span>Switched from <strong>{p.fromTag}</strong> to <strong>{p.toTag}</strong></span>
                      <span style={{ color: 'var(--md-sys-color-error)', fontWeight: 'bold' }}>Drop: {p.drop}% (SFI {p.prevSfi} → {p.currSfi})</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
      {/* Goals Progress */}
      <div className="md-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20}/> Daily Goals Progress
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div>
            {renderProgressBar("Daily Total", todaysData.totalTime, config.dailyTargetMinutes)}
          </div>
          <div>
            {Object.entries(config.tagTargets || {}).map(([tag, target]) => 
              renderProgressBar(`Tag: ${tag}`, todaysData.tagsTime[tag] || 0, target)
            )}
            {Object.keys(config.tagTargets || {}).length === 0 && (
              <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>No tag targets set.</p>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap & Streaks */}
      {config.enabledVisualizations?.heatmap !== false && (
        <div style={{ marginBottom: '48px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={20}/> Daily Contribution</h3>
          <Heatmap sessions={data.sessions} />
        </div>
      )}

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* SFI Line Chart */}
        {config.enabledVisualizations?.sfi !== false && (
          <div className="md-card">
            <h3 style={{ marginBottom: '24px' }}>Focus Quality (SFI) Over Time</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sfiData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline)" opacity={0.2} />
                  <XAxis dataKey="date" stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} tickMargin={10} tickFormatter={formatDateShort} />
                  <YAxis domain={[0, 100]} stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="sfi" name="Average SFI" stroke="var(--md-sys-color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--md-sys-color-primary)' }}>
                     <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="var(--md-sys-color-primary)" />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Time by Tag Bar Chart */}
        {config.enabledVisualizations?.timeByTag !== false && (
          <div className="md-card">
            <h3 style={{ marginBottom: '24px' }}>Time by Tag (Minutes)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline)" opacity={0.2} />
                  <XAxis dataKey="name" stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                  <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                  <Tooltip cursor={{fill: 'var(--md-sys-color-surface-variant)', opacity: 0.5}} contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(config.tagColors && config.tagColors[entry.name]) ? config.tagColors[entry.name] : 'var(--md-sys-color-primary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Time of Day Focus Profile */}
        {config.enabledVisualizations?.timeOfDay !== false && (
          <div className="md-card">
            <h3 style={{ marginBottom: '24px' }}>Time-of-Day Focus Profile (All Time)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={timeOfDayData}>
                  <PolarGrid stroke="var(--md-sys-color-outline)" opacity={0.3} />
                  <PolarAngleAxis dataKey="hour" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, maxTimeOfDaySfi]} angle={90} tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 10 }} orientation="middle" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Radar name="Average SFI" dataKey="avgSfi" stroke="#ffb300" fill="#ffb300" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Stress & Energy Chart */}
        {config.enabledVisualizations?.stressEnergy !== false && (
          <div className="md-card">
            <h3 style={{ marginBottom: '24px' }}>Stress & Energy Over Time</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stressEnergyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline)" opacity={0.2} />
                  <XAxis dataKey="date" stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} tickMargin={10} tickFormatter={formatDateShort} />
                  <YAxis domain={[1, 5]} stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="stress" name="Avg Stress" stroke="var(--md-sys-color-error)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="energy" name="Avg Energy" stroke="#4caf50" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily Focus Time Bar Chart */}
        {config.enabledVisualizations?.timeFocused !== false && (
          <div className="md-card">
            <h3 style={{ marginBottom: '24px' }}>Daily Focus Time (Minutes)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyFocusTimeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline)" opacity={0.2} />
                  <XAxis dataKey="date" stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} tickFormatter={formatDateShort} />
                  <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={12} />
                  <Tooltip cursor={{fill: 'var(--md-sys-color-surface-variant)', opacity: 0.5}} contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Bar dataKey="val" name="Minutes" fill="var(--md-sys-color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Time by Tag Pie Chart */}
        {config.enabledVisualizations?.tagPie !== false && (
          <div className="md-card">
            <h3 style={{ marginBottom: '24px' }}>Time by Tag Distribution</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Legend />
                  <Pie
                    data={tagPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {tagPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(config.tagColors && config.tagColors[entry.name]) ? config.tagColors[entry.name] : `hsl(${(index * 360) / tagPieData.length}, 70%, 50%)`} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="md-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ margin: 0 }}>Activity Timeline</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Filter by Day:</span>
            <select 
              className="md-input" 
              style={{ padding: '6px 12px', minWidth: '150px' }}
              value={selectedDay || ''}
              onChange={e => setSelectedDay(e.target.value || null)}
            >
              <option value="">All Days in Range</option>
              {uniqueDays.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '2px solid var(--md-sys-color-outline)', marginLeft: '12px' }}>
          {timelineSessions.length === 0 ? (
            <p style={{ marginLeft: '24px', color: 'var(--md-sys-color-on-surface-variant)' }}>No sessions found.</p>
          ) : timelineSessions.slice(0, timelineLimit).map(session => (
            <div key={session.id} style={{ position: 'relative', paddingLeft: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  position: 'absolute', left: '-7px', top: '4px', width: '12px', height: '12px', 
                  borderRadius: '50%', backgroundColor: 'var(--md-sys-color-primary)' 
                }} />
                <div style={{ fontWeight: 'bold' }}>{new Date(session.startTime).toLocaleString()} - {session.goal}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '8px' }}>
                  Tag: {session.tag} • SFI: {Math.round(session.sfi || 0)} • Duration: {Math.round(session.durationActual / 60)} mins
                </div>
                
                {session.notes && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)', fontStyle: 'italic', marginBottom: '8px', borderLeft: '2px solid var(--md-sys-color-primary)', paddingLeft: '8px' }}>
                    "{session.notes}"
                  </div>
                )}
                
                {session.distractions && session.distractions.length > 0 && (
                  <div style={{ backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--md-sys-color-error)' }}>Distractions</div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                      {session.distractions.map((d, i) => (
                        <li key={i}>{new Date(d.time).toLocaleTimeString()} - {d.cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="icon-btn" 
                  onClick={() => setEditSession(session)}
                  title="Edit Session"
                  style={{ color: 'var(--md-sys-color-primary)' }}
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  className="icon-btn" 
                  onClick={() => handleDeleteSession(session.id)}
                  title="Delete Session"
                  style={{ color: 'var(--md-sys-color-error)' }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {timelineSessions.length > timelineLimit && (
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button className="md-button md-button-secondary" onClick={() => setTimelineLimit(prev => prev + 10)}>
              Load More ({timelineSessions.length - timelineLimit} remaining)
            </button>
          </div>
        )}
      </div>
      </>
      )}
      
      {showManualModal && (
        <ManualSessionModal 
          onClose={() => setShowManualModal(false)}
          onSave={() => { setShowManualModal(false); if (onDataChange) onDataChange(); }}
        />
      )}

      {editSession && (
        <EditSessionModal 
          session={editSession}
          onClose={() => setEditSession(null)}
          onSave={() => { setEditSession(null); if (onDataChange) onDataChange(); }}
        />
      )}
    </div>
  );
}
