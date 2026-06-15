const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/StatsDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const emptyMessage = `<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.9rem' }}>No data available for this period.</div>`;

const replacements = [
  {
    find: `                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={advancedMetrics.frictionHeatmap.data}`,
    replace: `                {(!advancedMetrics.frictionHeatmap.data || advancedMetrics.frictionHeatmap.data.length === 0) ? ${emptyMessage} : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advancedMetrics.frictionHeatmap.data}`,
    closeTagOffset: 2, // Means we need to close the ternary after </ResponsiveContainer>
    closeTagMatch: `                  </ResponsiveContainer>`
  },
  {
    find: `                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid`,
    replace: `                    {(!advancedMetrics.efficiencyCurves || advancedMetrics.efficiencyCurves.length === 0) ? ${emptyMessage} : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                          <CartesianGrid`,
    closeTagOffset: 2,
    closeTagMatch: `                    </ResponsiveContainer>`
  },
  {
    find: `                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid`,
    replace: `                    {(!advancedMetrics.phaseSpaceHazard || advancedMetrics.phaseSpaceHazard.length === 0) ? ${emptyMessage} : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                          <CartesianGrid`,
    closeTagOffset: 2,
    closeTagMatch: `                    </ResponsiveContainer>`,
    isPhaseSpace: true
  },
  {
    find: `              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sfiData}`,
    replace: `              {(!sfiData || sfiData.length === 0) ? ${emptyMessage} : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sfiData}`,
    closeTagOffset: 2,
    closeTagMatch: `              </ResponsiveContainer>`
  },
  {
    find: `              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}`,
    replace: `              {(!barData || barData.length === 0) ? ${emptyMessage} : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}`,
    closeTagOffset: 2,
    closeTagMatch: `              </ResponsiveContainer>`
  },
  {
    find: `              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={timeOfDayData}>`,
    replace: `              {(!timeOfDayData || timeOfDayData.length === 0) ? ${emptyMessage} : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={timeOfDayData}>`,
    closeTagOffset: 2,
    closeTagMatch: `              </ResponsiveContainer>`
  },
  {
    find: `              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stressEnergyData}`,
    replace: `              {(!stressEnergyData || stressEnergyData.length === 0) ? ${emptyMessage} : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stressEnergyData}`,
    closeTagOffset: 2,
    closeTagMatch: `              </ResponsiveContainer>`
  },
  {
    find: `              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyFocusTimeData}`,
    replace: `              {(!dailyFocusTimeData || dailyFocusTimeData.length === 0) ? ${emptyMessage} : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyFocusTimeData}`,
    closeTagOffset: 2,
    closeTagMatch: `              </ResponsiveContainer>`
  },
  {
    find: `              <ResponsiveContainer width="100%" height="100%">
                <PieChart>`,
    replace: `              {(!tagPieData || tagPieData.length === 0) ? ${emptyMessage} : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>`,
    closeTagOffset: 2,
    closeTagMatch: `              </ResponsiveContainer>`
  },
  {
    find: `                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>`,
    replace: `                {(!cognitiveDistanceData || cognitiveDistanceData.length === 0) ? ${emptyMessage} : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>`,
    closeTagOffset: 2,
    closeTagMatch: `                </ResponsiveContainer>`
  },
  {
    find: `                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyTrendData}`,
    replace: `                {(!latencyTrendData || latencyTrendData.length === 0) ? ${emptyMessage} : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyTrendData}`,
    closeTagOffset: 2,
    closeTagMatch: `                </ResponsiveContainer>`
  }
];

let currentIndex = 0;
while (currentIndex < content.length) {
  let matched = false;
  for (let rep of replacements) {
    if (rep.done) continue;
    
    const idx = content.indexOf(rep.find, currentIndex);
    if (idx !== -1) {
      // Check if it's the Phase Space Hazard (which is the second scatter chart with the exact same starting string)
      if (rep.isPhaseSpace) {
         const nextIdx = content.indexOf(rep.find, idx + rep.find.length);
         if (nextIdx !== -1) {
            continue; // Wait for the second one
         }
      }

      content = content.substring(0, idx) + rep.replace + content.substring(idx + rep.find.length);
      
      const closeIdx = content.indexOf(rep.closeTagMatch, idx + rep.replace.length);
      if (closeIdx !== -1) {
        content = content.substring(0, closeIdx + rep.closeTagMatch.length) + `\n${' '.repeat(rep.closeTagOffset + 14)})}` + content.substring(closeIdx + rep.closeTagMatch.length);
        rep.done = true;
        matched = true;
        break;
      }
    }
  }
  if (!matched) break;
}

// Special case for Gantt Chart
const ganttFind = `                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredSessions.slice(-5).reverse().map(s => {`;
const ganttReplace = `                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredSessions.filter(s => s.events && s.events.length > 0 && s.durationActual > 0).length === 0 ? (
                    ${emptyMessage}
                  ) : filteredSessions.slice(-5).reverse().map(s => {`;
                  
content = content.replace(ganttFind, ganttReplace);

fs.writeFileSync(file, content);
console.log('Fixed empty charts!');
