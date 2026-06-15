const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/StatsDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add margin props to all charts
content = content.replace(/<(LineChart|BarChart|ScatterChart)([^>]*)>/g, (match, tag, rest) => {
  if (rest.includes('margin=')) return match;
  return `<${tag}${rest} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>`;
});

// Update recharts text fill to use CSS variables
content = content.replace(/stroke="var\(--md-sys-color-on-surface-variant\)"/g, 'stroke="var(--md-sys-color-on-surface-variant)" fill="var(--md-sys-color-on-surface-variant)"');

// Inject empty state fallbacks manually for specific advanced metrics 
const fixEmptyState = (dataKey, chartTag) => {
  const regex = new RegExp(`(<ResponsiveContainer[^>]*>\\s*<${chartTag}[^>]*data={(${dataKey})}[^>]*>[\\s\\S]*?<\\/${chartTag}>\\s*<\\/ResponsiveContainer>)`, 'g');
  content = content.replace(regex, (match, container, dataVar) => {
    return `{(!${dataVar} || ${dataVar}.length === 0) ? (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--md-sys-color-on-surface-variant)' }}>
        No data available yet. Keep logging sessions!
      </div>
    ) : (
      ${match}
    )}`;
  });
}

// Applies to Efficiency Curves
fixEmptyState('advancedMetrics.efficiencyCurves', 'ScatterChart');
// Applies to Phase Space Hazard Plot
fixEmptyState('advancedMetrics.phaseSpaceHazard', 'ScatterChart');
// Applies to Fatigue Curve
fixEmptyState('advancedMetrics.curve', 'BarChart');

// Fix Kaplan-Meier Empty State
content = content.replace(/(<ResponsiveContainer[^>]*>\s*<LineChart[^>]*>[\s\S]*?{Object\.keys\(advancedMetrics\.kaplanMeier\)\.map[\s\S]*?<\/LineChart>\s*<\/ResponsiveContainer>)/, (match) => {
  return `{Object.keys(advancedMetrics.kaplanMeier).length === 0 ? (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--md-sys-color-on-surface-variant)' }}>
      No data available yet. Keep logging sessions!
    </div>
  ) : (
    ${match}
  )}`;
});


fs.writeFileSync(filePath, content);
console.log('Charts updated successfully.');
