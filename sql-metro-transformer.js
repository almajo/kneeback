/**
 * Custom Metro transformer for .sql files.
 * Converts raw SQL to a JS module that exports the SQL string,
 * preventing Babel from trying to parse SQL as JavaScript.
 */
const upstreamTransformer = require("@expo/metro-config/build/babel-transformer");

module.exports = {
  transform: function (params) {
    if (params.filename.endsWith(".sql")) {
      return upstreamTransformer.transform({
        ...params,
        src: `module.exports = ${JSON.stringify(params.src)};`,
      });
    }
    return upstreamTransformer.transform(params);
  },
};
