const pkg = require("../package.json");

function getVersion() {
  return `releases-example@${pkg.version}`;
}

module.exports = getVersion;

if (require.main === "module") {
  // eslint-disable-next-line
  console.log(getVersion());
}
