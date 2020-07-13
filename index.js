const path = require('path');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const { slug } = require('./utils');
const outputApproved = require('./output.approved');
const outputDisapproved = require('./output.disapproved');

dotenv.config();

const answersBase = require('./answers');

const collectedWb   = xlsx.readFile(path.resolve('./', 'DEMUESTRA TUS CONOCIMIENTOS Y CONSTRUYE SEGURIDAD(1-4).xlsx'));
const collectedData = xlsx.utils.sheet_to_json(collectedWb.Sheets[collectedWb.SheetNames[0]]);

function getFormattedRowData(rowData = []) {
  return Object.keys(rowData).reduce((acc, k) => {
    const sluggedKey = slug(k);
    return typeof answersBase[sluggedKey] !== "undefined" ?
            { ...acc, answers: { [sluggedKey]: rowData[k] }} :
            { ...acc, [sluggedKey]: rowData[k] }
  }, { answers: {} });
}

// Validate answers and determine if is enough to approve
function evaluateAnswers(answers = {}) {
  const keys = Object.keys(answers);
  const min  = Math.round(keys.length * ( 50 / 100 ));
  const corrects = keys.reduce((acc, k) => {
    return answersBase[k] === answers[k] ? acc + 1 : acc;
  }, 0);
  return corrects >= min;
}

(async () => {
  const disapproved = [];

  if (collectedData.length) {
    const approved = collectedData.reduce((acc, rowData) => {
      const fRowData = getFormattedRowData(rowData);
      if (!evaluateAnswers(fRowData.answers)) {
        disapproved.push(fRowData);
        return acc;
      }
      return acc.concat(fRowData);
    }, []);

    await outputApproved(approved);
    await outputDisapproved(disapproved)
  }
})();

