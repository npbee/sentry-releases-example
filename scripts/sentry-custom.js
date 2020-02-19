/**
 * A quick-and-dirty custom Sentry releaser that handles parsing the Git history
 * and calling the API in the correct format. If you can avoid it, use the
 * Sentry/GitHub integration instead!
 *
 */
/* eslint-disable no-console */
require("dotenv").config();

let getVersion = require("./get-version");
let fetch = require("node-fetch");
let SentryCli = require("@sentry/cli");
let { promisify } = require("util");

let exec = promisify(require("child_process").exec);
let cli = new SentryCli();

run().catch(err => {
  console.error(err);
  process.exit(1);
});

async function run() {
  let version = getVersion();

  console.log("Releasing version: ", version);

  let latestReleaseCommit = await fetchLatestReleaseCommit();
  let commits = await parseLog(latestReleaseCommit, "HEAD");

  await createRelease(version, commits);

  console.log("Release created");

  await cli.releases.uploadSourceMaps(version, {
    rewrite: true,
    include: ["dist"],
  });

  await cli.releases.finalize(version);

  await cli.execute(["releases", "deploys", version, "new", "-e", "prod"]);

  console.log("Done!");
}

/**
 * Parse the git history into the format that Sentry expects.
 * A specialized version of this module (thanks!):
 *   - https://github.com/domharrington/node-gitlog
 */
async function parseLog(from, to) {
  let cmd = `git log `;

  if (from && to) {
    cmd += `${from}..${to} `;
  }

  // Grab all of the fields we need from the log and delimit them so that
  // we can grab them all later
  cmd += "--pretty='@begin@%H\t%an\t%ae\t%aI\t%B\t' ";
  cmd += "--name-status";

  let { stdout, stderr } = await exec(cmd);

  if (stderr) {
    console.error("Error running Git command!");
    throw new Error(stderr);
  }

  return stdout
    .split("@begin@")
    .slice(1)
    .map(parseCommit);
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
      type: toSentryModType(type),
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

/**
 * Sentry only accepts a few select 'modification' flags ('A', 'C', 'D'),
 * but Git may return others
 */
function toSentryModType(gitType) {
  if (gitType.startsWith("R") || gitType.startsWith("C")) {
    return "M";
  }

  return gitType;
}

async function fetchLatestReleaseCommit() {
  let releases = await callApi("releases/");
  let releaseWithCommit = releases.find(release => release.lastCommit);

  if (releaseWithCommit) {
    let lastCommitHash = releaseWithCommit.lastCommit.id;
    console.log("Found release with last commit hash: ", lastCommitHash);
    return lastCommitHash;
  }
}

async function createRelease(version, commits) {
  let body = {
    version,
    projects: [process.env.SENTRY_PROJECT],
    commits,
  };

  console.log("Creating release version: ", body.version);

  return await callApi("releases/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function callApi(path, ...options) {
  return await fetch(
    `https://sentry.io/api/0/organizations/npbeep/${path}`,
    Object.assign({}, options, {
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    })
  ).then(response => {
    if (!response.ok) {
      console.error("Error calling Sentry API");
      throw new Error(response.statusText);
    }

    return response.json();
  });
}
