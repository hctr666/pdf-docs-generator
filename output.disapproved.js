const path = require('path'),
     del   = require('del'),
     xlsx  = require('xlsx');

// Create a xlsx map file with user info, 
function createMapFile(data) {
  console.log('Creating map file for disapproved...');
  const sheet = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  const filename = path.resolve('./output/disapproved.xlsx');
  xlsx.utils.book_append_sheet(wb, sheet);
  xlsx.writeFile(wb, filename);
  console.log(`Map file for disapproved created -> ${filename}`);
}

module.exports = async (data = []) => {
  // Remove output directory
  if (del.sync('./output/disapproved.xlsx')) {
    console.log('Deleted disapproved map file.')
  }

  await createMapFile(data);
};