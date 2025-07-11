import fs from "fs";
import path from "path";
import lunr from "lunr";

// Directory containing your shards
const shardsDir = path.join("docs", "category-shards");

// Collect all JSON files in the folder
const shardFiles = fs.readdirSync(shardsDir)
  .filter(f => f.endsWith(".json"))
  .map(f => path.join(shardsDir, f));

console.log(`Found ${shardFiles.length} shard files.`);

// Merge documents from all shards
let allDocuments = [];
for (const file of shardFiles) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (data && Array.isArray(data.documents)) {
    allDocuments = allDocuments.concat(data.documents);
  } else {
    console.warn(`⚠️ Skipped invalid or empty shard: ${file}`);
  }
}

console.log(`Loaded ${allDocuments.length} total documents.`);

// Build the Lunr index
const index = lunr(function () {
  this.ref("id");
  this.field("title");
  this.field("content");
  
  allDocuments.forEach(doc => this.add(doc));
});

console.log("✅ Lunr index built.");

// Write bundled JSON files
fs.writeFileSync("daskalos-documents.json", JSON.stringify(allDocuments, null, 2));
fs.writeFileSync("daskalos-index.json", JSON.stringify({ index: index.toJSON() }, null, 2));

console.log("✅ Finished writing daskalos-documents.json and daskalos-index.json");
