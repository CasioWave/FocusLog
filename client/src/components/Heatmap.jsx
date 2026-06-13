import React from 'react';

const getLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Heatmap({ sessions }) {
  const heatmapData = React.useMemo(() => {
    const map = {};
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for(let i=0; i<364; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map[getLocalDate(d)] = 0;
    }
    
    sessions.forEach(s => {
      const d = getLocalDate(new Date(s.startTime));
      if (map[d] !== undefined) {
        map[d] += (s.durationActual || 0) / 60;
      }
    });

    const sortedDays = Object.keys(map).sort();
    return sortedDays.map(date => ({ date, val: map[date] }));
  }, [sessions]);

  const getHeatmapColor = (val) => {
    if (val === 0) return 'var(--md-sys-color-surface-variant)';
    if (val < 30) return 'hsla(var(--hue-primary), var(--sat-primary), 60%, 0.3)';
    if (val < 120) return 'hsla(var(--hue-primary), var(--sat-primary), 60%, 0.6)';
    return 'var(--md-sys-color-primary)';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '48px', opacity: 0.9 }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(52, 1fr)', 
        gap: '4px', 
        overflowX: 'auto',
        maxWidth: '100%',
        paddingBottom: '8px'
      }}>
        {heatmapData.map((day, i) => (
          <div 
            key={i} 
            title={`${day.date}: ${Math.round(day.val)} mins`}
            style={{ 
              width: '12px',
              height: '12px',
              backgroundColor: getHeatmapColor(day.val), 
              borderRadius: '2px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          />
        ))}
      </div>
    </div>
  );
}
