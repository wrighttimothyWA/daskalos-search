const fs = require('fs');
const path = require('path');
const lunr = require('lunr');

// 💡 The category folder is ALWAYS the folder where you put this script
const CATEGORY_FOLDER = __dirname;
const DOCS_FOLDER = path.join(CATEGORY_FOLDER, 'docs');
const SHARDS_FOLDER = path.join(CATEGORY_FOLDER, 'category-shards');
const CHUNK_SIZE = 5;

console.log(`✅ Building index in: ${CATEGORY_FOLDER}`);
console.log(`📂 Reading from: ${DOCS_FOLDER}`);

// 1️⃣ Check docs folder exists
if (!fs.existsSync(DOCS_FOLDER)) {
  console.error('❌ ERROR: No "docs" folder found here!');
  process.exit(1);
}

// 2️⃣ Clean or create category-shards folder
if (fs.existsSync(SHARDS_FOLDER)) {
  fs.rmSync(SHARDS_FOLDER, { recursive: true });
}
fs.mkdirSync(SHARDS_FOLDER);

const documents = [];
const files = fs.readdirSync(DOCS_FOLDER);

files.forEach((file, i) => {
  if (file.endsWith('.txt')) {
    const content = fs.readFileSync(path.join(DOCS_FOLDER, file), 'utf8');
    documents.push({
      id: i.toString(),
      title: file,
      content
    });
  }
});

console.log(`✅ Indexed ${documents.length} documents`);

if (documents.length === 0) {
  console.error('❌ ERROR: No .txt files found in docs!');
  process.exit(1);
}

// 3️⃣ Build shards
for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
  const chunk = documents.slice(i, i + CHUNK_SIZE);

  const idx = lunr(function () {
    this.ref('id');
    this.field('title');
    this.field('content');
    chunk.forEach(doc => this.add(doc));
  });

  const shard = {
    index: idx,
    documents: chunk.map(doc => ({ id: doc.id, title: doc.title }))
  };

  const shardName = `AliceABaileyebooks-part-${i / CHUNK_SIZE}.json`;
  fs.writeFileSync(path.join(SHARDS_FOLDER, shardName), JSON.stringify(shard, null, 2));
  console.log(`✅ Wrote shard: ${shardName}`);
}

console.log(`\n🎉 Done! Shards are in: ${SHARDS_FOLDER}`);

fs.writeFileSync(
  path.join(CATEGORY_FOLDER, 'daskalos-documents.json'),
  JSON.stringify(documents, null, 2)
);
console.log(`✅ Wrote daskalos-documents.json`);

