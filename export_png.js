const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const svgPath = path.join(rootDir, 'flyer_vector_profesional.svg');
const htmlPath = path.join(rootDir, 'render_png.html');
const pngOutPath = path.join(rootDir, 'flyer_cyber_navy.png');

const svgContent = fs.readFileSync(svgPath, 'utf8');

const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; background: #050914; }
  svg { width: 1080px; height: 1920px; display: block; }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless=new --disable-gpu --screenshot="${pngOutPath}" --window-size=1080,1920 --hide-scrollbars "${htmlPath}"`;

console.log('Running Chrome screenshot...');
execSync(cmd, { stdio: 'inherit' });

if (fs.existsSync(pngOutPath)) {
  const stats = fs.statSync(pngOutPath);
  console.log(`PNG rendered successfully! Size: ${stats.size} bytes`);
} else {
  console.error('PNG output not found!');
  process.exit(1);
}
