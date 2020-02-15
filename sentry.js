let { promisify } = require("util");

let exec = promisify(require("child_process").exec);

async function log(from, to) {
  let cmd = `git log `;

  cmd += "--pretty='%H\t%an\t%ae\t%ai\t%B\t' ";
  cmd += "--name-status";

  let { stdout, stderr } = await exec(cmd);

  let parsed = parse(stdout);
}

function parse(text) {
  let [id, authorName, authorEmail, timestamp, message, ...rest] = text.split(
    "\t"
  );
  let files = rest
    .join("\t")
    .trim()
    .split("\n");

  let patchSet = [];

  for (let file of files) {
    let [type, path] = file.split("\t");

    patchSet.push({
      path,
      type,
    });
  }

  console.log(patchSet);
}

log();
// const gitlog = require("gitlog");

// const options = {
//   repo: __dirname,
//   number: 20,
//   fields: ["hash", "abbrevHash", "subject", "authorName", "authorDateRel"],
//   execOptions: { maxBuffer: 1000 * 1024 },
// };

// // Synchronous
// let commits = gitlog(options);
// console.log(commits);
