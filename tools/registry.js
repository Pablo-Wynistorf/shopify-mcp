const fs = require("fs");
const path = require("path");

const tools = {};
const toolDir = __dirname;

// Auto-load all .js files in this directory except registry.js
const files = fs.readdirSync(toolDir).filter(
  (f) => f.endsWith(".js") && f !== "registry.js" && f !== "categories.js"
);

for (const file of files) {
  const tool = require(path.join(toolDir, file));
  tools[tool.name] = tool;
}

module.exports = { tools };
