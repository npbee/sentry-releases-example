let { promisify } = require("util");

let exec = promisify(require("child_process").exec);

async function log(from, to) {
  let cmd = `git log `;

  cmd += "--pretty='@begin@%H\t%an\t%ae\t%ai\t%B\t' ";
  cmd += "--name-status";

  let { stdout, stderr } = await exec(cmd);

  if (stderr) {
    console.error(stderr);
    process.exit(1);
  }

  let commits = stdout.split("@begin@").slice(1);

  let parsed = commits.map(commit => parse(commit));

  console.log(JSON.stringify(parsed, null, 2));
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

  let payload = {
    patch_set: patchSet,
    respository: "test/test-repo",
    author_name: authorName,
    author_email: authorEmail,
    timestamp,
    message,
    id,
  };

  return payload;
}

log();
