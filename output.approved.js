const fs = require('fs'),
   path  = require('path'),
   del   = require('del'),
   write = require('write'),
   pdf   = require('html-pdf'),
   slug  = require('slugify'),
   xlsx  = require('xlsx'),
  dotenv = require('dotenv');

dotenv.config();

const { PRD_PATH } = process.env

const mapFile = [];

const addToMapFile = (item) => mapFile.push(item);

const pdfOptions = {
  format: 'A4',
  orientation: 'landscape',
  border: '0'
}

const template = fs.readFileSync(path.resolve('./template.html'), { encoding: 'utf-8' });

function pdfContent(nombres, curso, horas) {
  return template.replace(/\{\{ name \}\}/g, nombres)
    .replace(/\{\{ course \}\}/g, curso)
    .replace(/\{\{ hours \}\}/g, horas)
} 

// Create pdf files
function createPdfFile(data) {
  return new Promise((resolve, reject) => {
    try {
      const { nombres, curso, horas, email } = data;
      const filename = `cert-${slug(curso)}_${slug(nombres)}.pdf`;
  
      console.log(`Output file: cert-${slug(curso)}_${slug(nombres)}.pdf`);
      console.log(`Processing content...`);
  
      addToMapFile({ nombres, email, certUrl: `${PRD_PATH}${filename}` });
  
      console.log('Generating pdf file...')
      pdf.create(pdfContent(nombres, curso, horas), pdfOptions)
        .toFile(`./output/pdf/${filename}`, (err, res) => {
          if (err) {
            return reject(err);
          }
          console.log(`PDF created -> ${res.filename}`);
          console.log('==========================');
          return resolve();
        })
    } catch (err) {
      console.error({ data, err })
      reject(err);
    }
  })
}

// Create a xlsx map file with pdf info, 
function createMapFile(data) {
  console.log('Creating map file for approved...');
  const sheet = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  const filename = path.resolve('./output/approved.xlsx');
  xlsx.utils.book_append_sheet(wb, sheet);
  xlsx.writeFile(wb, filename);
  console.log(`Map file for approved created -> ${filename}`);
}

module.exports = async (data = []) => {
  // Delete output directory
  await fs.exists(path.resolve('./', 'output'), async (exists) => {
    if (exists) {
      await del('./output/*').then(() => {
        console.log('Deleted output directory.')
        console.log('...');
      });
    } else {
      await fs.mkdirSync('./output/');
    }
  });

  const creators = [];
  const len = data.length;
  let i = len;

  while(i--) {
    creators.push(createPdfFile(data[i]))
  }
  
  await Promise.all(creators)
    .then(() => createMapFile(mapFile))
    .catch(err => console.error(err))
};