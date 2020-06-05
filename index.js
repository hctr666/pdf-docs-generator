const path = require('path');
const slug = require('slugify');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const outputApproved = require('./output.approved');
const outputDisapproved = require('./output.disapproved');

dotenv.config();

const answersBase = require('./answers');

const collectedWb   = xlsx.readFile(path.resolve('./', 'collected.xlsx'));
const collectedData = xlsx.utils.sheet_to_json(collectedWb.Sheets[collectedWb.SheetNames[0]]);

function extractAnswers(item) {
  return Object.keys(item).reduce((acc, k) => {
    const sluggedKey = slug(k);
    if (typeof answersBase[sluggedKey] !== "undefined") {
      return Object.assign({}, acc, {[sluggedKey]: item[k]});
    }
    return acc;
  }, {});
}

function evaluateAnswers(answers = {}) {
  const keys  = Object.keys(answers);
  const total = keys.length;
  const min   = Math.round(total * ( 50 / 100 ));
  const correct = keys.reduce((acc, k) => {
    return answersBase[k] === answers[k] ? acc + 1 : acc;
  }, 0);
  return correct >= min;
}

(async () => {
  const disapproved = [];

  if (collectedData.length) {
    const approved = collectedData.reduce((acc, item) => {
      const answers = extractAnswers(item);
      if (!evaluateAnswers(answers)) {
        disapproved.push(item);
        return acc;
      }
      return acc.concat(item);
    }, []);

    await outputApproved(approved);
    await outputDisapproved(disapproved)
  }
})();

