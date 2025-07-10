const fs = require('fs');

const allShards = [];

for (let i = 0; i <= 16; i++) {
  const shard = require(`./docs/category-shards/daskalos-part-${i}.json`);
  allShards.push(shard);
}

for (let i = 0; i <= 19; i++) {
  const shard = require(`./docs/category-shards/daskalosbooks-part-${i}.json`);
  allShards.push(shard);
}

const bigIndex = {
  index: allShards[0].index, // assuming same lunr index for now
  documents: allShards.flatMap(s => s.documents)
};

fs.writeFileSync('daskalos-index.json', JSON.stringify(bigIndex, null, 2));
