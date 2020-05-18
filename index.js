const fs = require('fs');
const path = require('path');
const write = require('write');
const del = require('del');
const pdf = require('html-pdf');
const csv = require('csv-parser');
const slug = require('slugify');
const dotenv = require('dotenv');

dotenv.config();

// Optional production storage path
const prd = `${process.env.PRD_DOMAIN}/static/pdf/certs/`
const pdfPathMap = [];

const pdfOptions = {
  format: 'A4',
  orientation: 'landscape',
  border: '0'
}

const source = path.resolve('./source.csv');
const template = fs.readFileSync(path.resolve('./template.html'), { encoding: 'utf-8' });

// Remove output directory
if (del.sync('./output')) {
  console.log('Removed output directory.')
}

// Start to building files
function build() {
  fs.createReadStream(source)
  .pipe(csv())
  .on('data', (record) => createPdfFiles(record))
  .on('end', () => createMapFile());
}

// Create pdf files
function createPdfFiles(data) {
  const { name, course, hours, email } = data;
  const filename = `cert-${slug(course)}_${slug(name)}.pdf`;

  console.log('==========================');
  console.log(`Output file: cert-${slug(course)}_${slug(name)}.pdf`);
  console.log(`Processing content...`);

  pdfPathMap.push({ name, email, certUrl: `${prd}${filename}` });

  const html = template.replace(/\{\{ name \}\}/g, name)
    .replace(/\{\{ course \}\}/g, course)
    .replace(/\{\{ hours \}\}/g, hours)

  console.log('Generating pdf file...')
  pdf.create(html, pdfOptions).toFile(`./output/pdf/${filename}`, (err, res) => {
    if (err) return console.log(err);
    console.log(`Created OK: ${res.filename}`);
  })
}

// Create a csv map file which contains pdf info, 
function createMapFile() {
  console.log('Creating map file...');
  const wrote = write.sync('./output/map.csv', `
    name,course,hours\n${pdfPathMap.map(({ name, email, certUrl }) => 
    (`${name},${email},${certUrl}`)).join('\n')}
  `.trim())

  if (wrote) console.log('Created OK: ' + path.resolve('./output/map.json'));
}

build();