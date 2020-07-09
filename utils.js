const slugify = require('slugify')

const slug = (str, options = {}) => {
  return slugify(str, {...options, lower: true, remove: /\s/g})
}

module.exports = {
  slug
}