'use strict';
const {default: parser} = require('stream-json-fixed/jsonl/parser.js');
module.exports = {make: (options) => parser.asStream(options), parser: (options) => parser.asStream(options)};
