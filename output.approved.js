const fs  = require('fs'),
   path   = require('path'),
   del    = require('del'),
   write  = require('write'),
   xlsx   = require('xlsx'),
  dotenv  = require('dotenv'),
  puppeteer = require('puppeteer'),
  moment = require('moment-timezone');

const { slug } = require('./utils');

dotenv.config();

// moment config
moment.tz.setDefault('America/Lima');
moment.locale('es');

const { PRD_PATH } = process.env

const mapFile = [];

const pdfOptions = {
  //format: 'A4',
  width: '210mm',
  height: '185mm',
  //orientation: 'landscape',
  //border: '0'
}

const template = fs.readFileSync(path.resolve('./template.html'), { encoding: 'utf-8' });

function pdfContent(data) {
  const { nombres } = data
  const date = moment().format('D [de] MMMM [del] YYYY')

  return template.replace(/\{\{ name \}\}/g, nombres)
    .replace(/\{\{ html-classname \}\}/g, 'pdf')
    .replace(/\{\{ date \}\}/g, date)
    .replace(/\{\{ style-share \}\}/g, 'style="display:none;"')
    .replace(/<\/style>/g, '.page{height:100vh !important;}</style>')
}

function htmlContent(data) {
  const { nombres, path, filename } = data
  const date = moment().format('D [de] MMMM [del] YYYY')
  
  return template.replace(/\{\{ name \}\}/g, nombres)
    .replace(/\{\{ html-classname \}\}/g, 'html responsive')
    .replace(/\{\{ date \}\}/g, date)
    .replace(/\{\{ fb-share-link \}\}/g, `https://www.facebook.com/sharer/sharer.php?u=${path}`)
    .replace(/\{\{ li-share-link \}\}/g, `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(path)}`)
    .replace(/\{\{ wa-share-link \}\}/g, `https://wa.me/?text=${encodeURIComponent(path)}`)
    .replace(/\{\{ path \}\}/g, path)
    .replace(/\{\{ download-filename \}\}/g, filename)
    .replace(/\{\{ pdf-path \}\}/g, `${PRD_PATH}pdf/${filename}.pdf`)
    .replace(/\{\{ og-image \}\}/g, `${PRD_PATH}previews/${filename}.jpg`)
}

function addToMapFile (data) {
  const { nombres, apellidos, especialidad, correoelectronico2 } = data;
  const sluggedFullName = slug(`${nombres}_${apellidos}`, { remove: 'undefined', replacement: '_' })
  const pdf  = `${PRD_PATH}pdf/cc_${sluggedFullName}.pdf`
  const html = `${PRD_PATH}html/cc_${sluggedFullName}.html`

  mapFile.push({ nombres, apellidos, correoelectronico2, pdf, html, especialidad })
}


function createHtmlFile (data) {
  return new Promise((resolve, reject) => {
    try {
      const { nombres, apellidos } = data;
      const filename = `cc_${slug(`${nombres}_${apellidos}`)}`
      const file = `${filename}.html`;
      console.log('Creating html version...')

      const htmlData = { nombres: `${nombres} ${apellidos}`, path: `${PRD_PATH}html/${file}`, filename: filename }
      const contentHtml = htmlContent(htmlData)
      write(`./output/html/${file}`, contentHtml)
        .then(() => {
          console.log(`Created HTML -> ${path.resolve('./output/html/', file)}`);
          return resolve(path.resolve('./output/html/', file));
        })
    } catch (err) {
      console.error({ data, err })
      reject(err);
    }
  })
}

async function createSharePreview (input, output) {
  try {
    let html = fs.readFileSync(input, { encoding: 'utf-8' })
    html = html.replace(/<html class="*"/g, '<html class="preview"')
      .replace(/<head>/g, '<head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">')
  
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
             
    await page.setViewport({ width: 315, height: 315 })
    await page.setContent(html)
    await page.screenshot({ path: output })
    await browser.close()

  } catch(err) {
    console.error({ input, err })
  }
}

// Create pdf files
async function createPdfFile (data) {
  //return new Promise((resolve, reject) => {
    try {
      const { nombres, apellidos } = data;
      const filename = `cc_${slug(`${nombres}_${apellidos}`)}`
  
      console.log(`Output file: ${filename}.pdf`);
      console.log(`Processing content...`);
    
      const pdfData = { nombres: `${nombres} ${apellidos}`, filename: `${PRD_PATH}pdf/${filename}.pdf` }
      const content = pdfContent(pdfData)

      console.log('Creating pdf file...')

      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.setContent(content)
      await page.pdf({ path: `./output/pdf/${filename}.pdf`, ...pdfOptions })

      console.log(`Created pdf -> ${path.resolve('./', `output/pdf/${filename}.pdf`)}`)

      await browser.close()

    } catch (err) {
      console.error({ data, err })
      //reject(err);
    }
  //})
}

// Map file output data only with useful props
function createMapFileData(data) {
  return data.reduce((acc, { nombres, apellidos, correoelectronico2, html }) => {
    return acc.concat({
      'NOMBRE': `${nombres} ${apellidos}`,
      'CORREO': correoelectronico2,
      'ENLACE': html
    })
  }, [])
}

// Create a xlsx map file with pdf info, 
function createMapFile(data = []) {
  console.table(createMapFileData(data))
  console.log('Creating map file for approved...');
  const sheet = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  const filename = path.resolve('./output/approved.xlsx');
  xlsx.utils.book_append_sheet(wb, sheet);
  xlsx.writeFile(wb, filename);
  console.log(`Map file for approved created -> ${filename}`);
}

// Clean output directory
function cleanOutput () {
  return del('./output')
    .then(() => {
      console.log('Clean output directory')
      console.log('...')
      fs.mkdirSync('./output/pdf/', { recursive: true })
    })
    .catch(() => console.error('Error trying to clean output'))
}

module.exports = async (data = []) => {

  await cleanOutput()

  const pdfCreators = [];
  const htmlCreators = [];
  const len = data.length;
  let i = len;

  while(i--) {
    addToMapFile(data[i])
    await pdfCreators.push(createPdfFile(data[i]));
    htmlCreators.push(createHtmlFile(data[i]));
  }

  await Promise.all(pdfCreators)
    .then(() => createMapFile(mapFile))
    .catch(err => console.error(err))
  

  await Promise.all(htmlCreators)
    .then((res) => {
      fs.mkdirSync('./output/previews')
      return Promise.all(
        res.map(htmlFile => createSharePreview(
          htmlFile, htmlFile.replace(/\.html/g, '.jpg').replace(/\\html/g, '\\previews'))
        )
      )
    })
    .catch((err) => console.error(err))
};