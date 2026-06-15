const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/StatsDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add ComposedChart and Area to imports
if (!content.includes('ComposedChart')) {
  content = content.replace(/import \{ \n  BarChart,/, "import { \n  ComposedChart, Area, BarChart,");
}

// 2. Fix sfiData range
content = content.replace(/error: Math\.round\(stdDev\)\n\s*\};/g, `error: Math.round(stdDev),
        sfiRange: [Math.max(0, Math.round(avg - stdDev)), Math.min(100, Math.round(avg + stdDev))]
      };`);

// 3, 4, 5. Fix SFI Chart rendering (ComposedChart, connectNulls, Area)
content = content.replace(/<LineChart data=\{sfiData\}(.*?)>([\s\S]*?)<Line type="monotone" dataKey="sfi" name="Average SFI" stroke="var\(--md-sys-color-primary\)" strokeWidth=\{3\} dot=\{\{ r: 4, fill: 'var\(--md-sys-color-primary\)' \}\}>[\s\S]*?<\/Line>([\s\S]*?)<\/LineChart>/, (match, props, innerStart, innerEnd) => {
  return `<ComposedChart data={sfiData}${props}>${innerStart}<Area type="monotone" dataKey="sfiRange" fill="var(--md-sys-color-primary)" stroke="none" fillOpacity={0.2} connectNulls={true} />
                  <Line type="monotone" dataKey="sfi" name="Average SFI" stroke="var(--md-sys-color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--md-sys-color-primary)' }} connectNulls={true} />${innerEnd}</ComposedChart>`;
});

// 6. Fix Stress and Energy chart connectNulls
content = content.replace(/<Line type="monotone" dataKey="stress" name="Avg Stress" stroke="var\(--md-sys-color-error\)" strokeWidth=\{2\} dot=\{\{ r: 4, fill: 'var\(--md-sys-color-error\)' \}\}\s*\/>/g, `<Line type="monotone" dataKey="stress" name="Avg Stress" stroke="var(--md-sys-color-error)" strokeWidth={2} dot={{ r: 4, fill: 'var(--md-sys-color-error)' }} connectNulls={true} />`);

content = content.replace(/<Line type="monotone" dataKey="energy" name="Avg Energy" stroke="#4caf50" strokeWidth=\{2\} dot=\{\{ r: 4, fill: '#4caf50' \}\}\s*\/>/g, `<Line type="monotone" dataKey="energy" name="Avg Energy" stroke="#4caf50" strokeWidth={2} dot={{ r: 4, fill: '#4caf50' }} connectNulls={true} />`);

// 7. Fix Time-of-Day Title
content = content.replace(/<h3 style=\{\{\s*margin:\s*0\s*\}\}>Time-of-Day Focus Profile \(All Time\)<\/h3>/g, `<h3 style={{ margin: 0 }}>Time-of-Day Focus Profile ({dateRange === 'all' ? 'All Time' : \`Last \${dateRange} Days\`})</h3>`);

fs.writeFileSync(filePath, content);
console.log('Chart bugs fixed.');
