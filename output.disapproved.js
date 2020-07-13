const path = require('path'),
     del   = require('del'),
     xlsx  = require('xlsx');

// Map file output data only with useful props
function createMapFileData(data) {
  return data.reduce((acc, { nombres, apellidos, correoelectronico2 }) => {
    return acc.concat({ 'NOMBRE': `${nombres} ${apellidos}`, 'CORREO': correoelectronico2 })
  }, [])
}

// Create a xlsx map file with user info, 
function createMapFile(data = []) {
  console.log('Creating map file for disapproved...');
  const sheet = xlsx.utils.json_to_sheet(createMapFileData(data));
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