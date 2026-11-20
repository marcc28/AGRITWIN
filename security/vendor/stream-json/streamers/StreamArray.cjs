'use strict';
const {default: streamArray} = require('stream-json-fixed/streamers/stream-array.js');
module.exports = {withParser: (options) => streamArray.withParserAsStream(options), make: (options) => streamArray.asStream(options)};
