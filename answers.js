const { slug } = require('./utils');
const data = require('./answers.json');

const parse = (data) => {
  const output = {};
  Object.keys(data).map(k => {
    output[slug(k)] = data[k]
  });
  return output;
}

module.exports = parse(data)