# Sentry Example

This is an example repo to show a few examples of how to integrate a single-page app with Sentry.
It uses [Parcel](https://parceljs.org/) to bundle up a JS app and the [Sentry CLI](https://github.com/getsentry/sentry-cli/) to upload source maps and create releaes.

There's also an example of how to implement a custom release script that uses Sentry's API to send commit data to Sentry for a release.
Each script is meant to be run in a continous integration tool so it's repeatable and automated.

Check out a corresponding blog post [here](https://npbee.me/posts/2020/sentry-for-single-page-apps)
