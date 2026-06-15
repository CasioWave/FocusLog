const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/StatsDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add formatter to all Tooltips
content = content.replace(/<Tooltip ([^>]*)>/g, (match, props) => {
  if (props.includes('formatter=')) return match;
  return `<Tooltip formatter={(value) => typeof value === 'number' ? parseFloat(value.toFixed(2)) : value} ${props}>`;
});

// Add formatter to <Tooltip /> that has no props or closed immediately
content = content.replace(/<Tooltip\s*\/>/g, `<Tooltip formatter={(value) => typeof value === 'number' ? parseFloat(value.toFixed(2)) : value} />`);

// Fix tau rounding
content = content.replace(/\{tau\} mins/g, `{typeof tau === 'number' ? parseFloat(tau.toFixed(1)) : tau} mins`);

fs.writeFileSync(filePath, content);
console.log('Fixed decimals successfully.');
