const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const docsFolder = path.join(__dirname, 'docs');

async function walkAndConvert(currentPath) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      await walkAndConvert(entryPath);
    } 
    else if (entry.isFile() && entry.name.endsWith('.pdf')) {
      const txtName = entry.name.replace(/\.pdf$/i, '.txt');
      const txtPath = path.join(currentPath, txtName);

      // Skip if .txt already exists
      if (fs.existsSync(txtPath)) {
        console.log(`✅ Skipped (already exists): ${txtPath}`);
        continue;
      }

      try {
        const dataBuffer = fs.readFileSync(entryPath);
        const pdfData = await pdf(dataBuffer);
        fs.writeFileSync(txtPath, pdfData.text, 'utf8');
        console.log(`✅ Created: ${txtPath}`);
      } catch (err) {
        console.error(`❌ Error reading PDF: ${entryPath}`, err);
      }
    }
  }
}

(async () => {
  console.log('📚 Converting PDFs to text...');
  await walkAndConvert(docsFolder);
  console.log('✅ All done!');
})();
