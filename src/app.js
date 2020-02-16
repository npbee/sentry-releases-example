import * as Sentry from "@sentry/browser";

Sentry.init({
  release: `releases-example@${process.env.npm_package_version}`,
  dsn: process.env.SENTRY_DSN,
});

function runSomethingAndThrowError() {
  return Promise.resolve(1).then(() => {
    throw new Error("Boom");
  });
}

document.getElementById("btn").addEventListener("click", function(evt) {
  runSomethingAndThrowError();
});
