const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/StatsDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
if (!content.includes("import ChartInfoModal")) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Info } from 'lucide-react';\nimport ChartInfoModal from './ChartInfoModal';");
}

// 2. Add State inside StatsDashboard
if (!content.includes("const [activeChartInfo, setActiveChartInfo] = useState(null);")) {
  content = content.replace(/export default function StatsDashboard\(\{.*?\}\) \{/, (match) => {
    return `${match}\n  const [activeChartInfo, setActiveChartInfo] = useState(null);`;
  });
}

// 3. Render Modal at the bottom
if (!content.includes("<ChartInfoModal")) {
  content = content.replace(/(<\/div>\s*)(<\/div>\s*)$/, (match, g1, g2) => {
    return `  <ChartInfoModal chartId={activeChartInfo} onClose={() => setActiveChartInfo(null)} />\n${g1}${g2}`;
  });
}

// 4. Inject buttons into h3 tags. Map titles to ids.
const titleMap = {
  'Consistency Heatmap': 'heatmap',
  'Time by Tag': 'time-by-tag',
  'Time of Day Focus': 'time-of-day',
  'Stress-Energy Correlation': 'stress-energy',
  'Fatigue Curve': 'fatigue-curve',
  'Efficiency Curves \\(Duration vs E\\)': 'efficiency-curves',
  'Epistemic Endurance & Distraction Rate': 'epistemic-endurance',
  'Phase Space Hazard Plot': 'phase-space-hazard',
  'Dynamic Endurance Baselines \\(τ\\)': 'dynamic-endurance',
  'Focus Survival Probability \\(Kaplan-Meier\\)': 'kaplan-meier',
  'Task Resilience': null, // No modal for simple tables
  'Context Switch Penalties': null,
  'Session Gantt Chart': 'session-gantt',
  'Interleaved Timeline': 'interleaved-timeline',
  'Cognitive Distance Matrix': 'cognitive-distance',
  'Retrieval Latency Trend': 'retrieval-latency'
};

for (const [title, id] of Object.entries(titleMap)) {
  if (!id) continue;
  // Regex to match <h3 ...>Title</h3> or <h3 ...>Title (something)</h3>
  const regex = new RegExp(`(<h3[^>]*>)\\s*(${title})\\s*(<\\/h3>)`, 'g');
  content = content.replace(regex, (match, h3Open, matchedTitle, h3Close) => {
    if (match.includes('<button')) return match; // Already injected
    return `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>\n  ${h3Open.replace(/margin-bottom:\s*'?16px'?/, "margin: 0")}${matchedTitle}${h3Close}\n  <button className="icon-btn" onClick={() => setActiveChartInfo('${id}')} title="What is this?"><Info size={18} /></button>\n</div>`;
  });
}

fs.writeFileSync(filePath, content);
console.log('Injected Info buttons successfully.');
