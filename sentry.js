/* eslint-disable no-console */
require("dotenv").config();

let pkg = require("./package.json");
let fetch = require("node-fetch");
let SentryCli = require("@sentry/cli");
let { promisify } = require("util");

let exec = promisify(require("child_process").exec);
let cli = new SentryCli();

async function parseLog(from, to) {
  let cmd = `git log `;

  if (from && to) {
    cmd += `${from}..${to} `;
  }

  cmd += "--pretty='@begin@%H\t%an\t%ae\t%aI\t%B\t' ";
  cmd += "--name-status";

  let { stdout, stderr } = await exec(cmd);

  if (stderr) {
    console.error(stderr);
    process.exit(1);
  }

  let commits = stdout.split("@begin@").slice(1);

  let parsed = commits.map(commit => parseCommit(commit));

  return parsed;
}

function parseCommit(text) {
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
    respository: "npbee/sentry-releases-example",
    author_name: authorName,
    author_email: authorEmail,
    timestamp,
    message,
    id,
  };

  return payload;
}

async function fetchLatestReleaseCommit() {
  let releases = await fetch(
    `https://sentry.io/api/0/organizations/npbee/releases/`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  ).then(resp => {
    if (resp.ok) {
      return resp.json();
    } else {
      throw new Error(resp.statusText);
    }
  });
  let releaseWithCommit = releases.find(release => release.lastCommit);

  if (releaseWithCommit) {
    return releaseWithCommit.lastCommit.id;
  }
}

async function createRelease(version, commits) {
  let body = {
    version,
    projects: [process.env.SENTRY_PROJECT],
    commits,
  };

  return await fetch(`https://sentry.io/api/0/organizations/npbee/releases/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then(resp => {
    if (resp.ok) {
      return resp.json();
    } else {
      throw new Error(resp.statusText);
    }
  });
}

async function run() {
  // let { stdout } = await exec("git log --pretty='%H' -n 1");
  let latestReleaseCommit = await fetchLatestReleaseCommit();
  let version = `releases-example@${pkg.version}`;
  let commits = await parseLog(latestReleaseCommit, "HEAD");

  let release = await createRelease(version, commits);

  console.log("Release created");

  await cli.releases.uploadSourceMaps(version, {
    rewrite: true,
    include: ["src"],
  });

  await cli.releases.finalize(release.version);

  console.log("Done!");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
