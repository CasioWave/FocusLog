import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailySectorChart({ sessions, config }) {
  const data = useMemo(() => {
    // Filter sessions for today
    const today = new Date();
    today.setHours(0,0,0,0);
    const todaysSessions = sessions.filter(s => new Date(s.startTime).getTime() >= today.getTime());

    const tagMap = {};
    todaysSessions.forEach(s => {
      const tag = s.tag || 'Untagged';
      if (!tagMap[tag]) tagMap[tag] = { time: 0, stances: {} };
      
      const duration = s.durationActual || 0;
      tagMap[tag].time += duration;

      if (s.events && s.events.length > 0) {
        let lastTime = new Date(s.startTime).getTime();
        let currentStance = null;
        
        s.events.forEach(e => {
          const eTime = new Date(e.timestamp).getTime();
          if (currentStance) {
            const timeDiff = (eTime - lastTime) / 1000;
            if (timeDiff > 0) {
              tagMap[tag].stances[currentStance] = (tagMap[tag].stances[currentStance] || 0) + timeDiff;
            }
          }
          if (e.type === 'STATE_CHANGE') {
            currentStance = e.state;
          } else if (e.type === 'SESSION_END') {
            currentStance = null;
          }
          lastTime = eTime;
        });
        
        // Handle any remaining time if no SESSION_END
        if (currentStance) {
          const eTime = new Date(s.endTime || Date.now()).getTime();
          const timeDiff = (eTime - lastTime) / 1000;
          if (timeDiff > 0) {
            tagMap[tag].stances[currentStance] = (tagMap[tag].stances[currentStance] || 0) + timeDiff;
          }
        }
      } else {
        // Assume UNKNOWN if no events but epistemic tracking was disabled
        tagMap[tag].stances['UNKNOWN'] = (tagMap[tag].stances['UNKNOWN'] || 0) + duration;
      }
    });

    const innerData = [];
    const outerData = [];

    const stanceColors = {
      'INGESTION': '#3b82f6', // Blue
      'SYMBOL_MANIPULATION': '#10b981', // Green
      'SENSE_MAKING': '#f59e0b', // Yellow/Orange
      'TRANSLATION': '#8b5cf6', // Purple
      'UNKNOWN': '#64748b' // Slate
    };

    Object.entries(tagMap).forEach(([tag, info]) => {
      if (info.time > 0) {
        innerData.push({
          name: tag,
          value: info.time / 60,
          color: (config?.tagColors && config.tagColors[tag]) ? config.tagColors[tag] : '#6750a4'
        });

        Object.entries(info.stances).forEach(([stance, stanceTime]) => {
          if (stanceTime > 0) {
            outerData.push({
              name: stance.replace('_', ' '),
              tag: tag,
              value: stanceTime / 60,
              color: stanceColors[stance] || stanceColors['UNKNOWN']
            });
          }
        });
      }
    });

    return { innerData, outerData };
  }, [sessions, config]);

  if (data.innerData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-on-surface-variant)' }}>
        No cognitive data recorded today yet.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="md-card" style={{ padding: '8px 12px', zIndex: 1000, pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
          {data.tag && <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>Tag: {data.tag}</p>}
          <p style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>{Math.round(data.value)} mins</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.innerData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={90}
            stroke="var(--md-sys-color-surface)"
            strokeWidth={2}
          >
            {data.innerData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Pie
            data={data.outerData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={100}
            outerRadius={140}
            stroke="var(--md-sys-color-surface)"
            strokeWidth={2}
          >
            {data.outerData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
