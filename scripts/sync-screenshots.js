import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.join(__dirname, 'docs/screenshots');
const readmePath = path.join(__dirname, 'README.md');

try {
  if (!fs.existsSync(screenshotsDir)) {
    console.log('ℹ️ No docs/screenshots directory found.');
    process.exit(0);
  }

  // Scan directory for image files
  const files = fs.readdirSync(screenshotsDir);
  const images = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
  }).sort();

  if (images.length === 0) {
    console.log('ℹ️ No screenshots found in docs/screenshots.');
    process.exit(0);
  }

  // Generate the HTML block
  let html = '\n<p align="center">\n';
  images.forEach(img => {
    // Generate simple alt text based on file name
    const altText = path.basename(img, path.extname(img))
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    html += `  <img src="docs/screenshots/${img}" alt="${altText}" width="260" style="margin: 10px" />\n`;
  });
  html += '</p>\n';

  // Read README.md
  if (!fs.existsSync(readmePath)) {
    console.error('❌ README.md not found.');
    process.exit(1);
  }

  let readmeContent = fs.readFileSync(readmePath, 'utf8');

  // Regex to replace everything between the tags
  const startTag = '<!-- SCREENSHOTS_START -->';
  const endTag = '<!-- SCREENSHOTS_END -->';
  const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`, 'g');

  if (readmeContent.includes(startTag) && readmeContent.includes(endTag)) {
    const replacement = `${startTag}${html}${endTag}`;
    readmeContent = readmeContent.replace(regex, replacement);
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    console.log(`✅ Successfully synced ${images.length} screenshots to README.md`);
  } else {
    console.warn('⚠️ Tag <!-- SCREENSHOTS_START --> and/or <!-- SCREENSHOTS_END --> not found in README.md.');
  }
} catch (error) {
  console.error('❌ Error syncing screenshots:', error.message);
  process.exit(1);
}
