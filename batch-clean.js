const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, 'raw');
const cleanDir = path.join(__dirname, 'clean');

// Make sure the "clean" folder exists
if (!fs.existsSync(cleanDir)) {
  fs.mkdirSync(cleanDir, { recursive: true });
}

function cleanText(content) {
  return content
    .replace(/\t/g, ' ')            // tabs to spaces
    .replace(/ +/g, ' ')            // multiple spaces to single
    .replace(/\r?\n/g, ' ')         // newlines to spaces
    .replace(/ +/g, ' ')            // again in case joining lines created doubles
    .trim();
}

const files = fs.readdirSync(rawDir).filter(file => file.endsWith('.txt'));

if (files.length === 0) {
  console.log('No .txt files found in raw folder.');
  process.exit(0);
}

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const cleanPath = path.join(cleanDir, file);

  try {
    const data = fs.readFileSync(rawPath, 'utf8');
    const cleaned = cleanText(data);
    fs.writeFileSync(cleanPath, cleaned, 'utf8');
    console.log(`✅ Cleaned: ${file}`);
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err);
  }
});

console.log('✨ All files processed.');
