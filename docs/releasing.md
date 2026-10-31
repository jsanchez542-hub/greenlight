# Releasing

How a version reaches npm, and what has to be set up once before the first one.

## What publishing a release does

Publishing a release on GitHub runs `.github/workflows/release.yml`:

1. **Build and check.** Builds the package once, on Linux, with the type check, the tests and
   `npm audit --omit=dev`. The tag must be `v` followed by the version in `package.json`.
2. **Pack and check.** Packs it and checks the tarball against the rules in
   `scripts/package-rules.mjs`: only the built program and the documents ship, nothing runs on
   install, there are no dependencies, and the repository named in the manifest is the one the
   provenance is checked against.
3. **Try it.** Installs that tarball in an empty folder on Linux and on Windows and uses it against
   an invented instance (`scripts/smoke-package.mjs`).
4. **Publish.** Waits for the approval of the `npm` environment, checks that the file is the one
   that was tried by its SHA-256, and publishes it with provenance.
5. **Check it on npm.** Installs the published version on both systems and checks that npm
   verifies its signature and its provenance (`scripts/verify-published.mjs`).

Nothing is published unless every step before the fourth has passed. A version that was published
cannot be replaced: if something is wrong with it, publish a patch version and run
`npm deprecate greenlight-n8n@<version> "<reason>"` on the bad one.

## Making a release

1. Set the new version with `npm version <version> --no-git-tag-version`, and move the Unreleased
   part of `CHANGELOG.md` under that version with its date.
2. Merge it into `main` with the checks green.
3. On GitHub, create a release with the tag `v<version>` on `main` and publish it. A version with a
   suffix, such as `1.2.0-rc.1`, is published under the `next` tag and not under `latest`.
4. Approve the deployment to the `npm` environment in the run of the Release workflow.
5. Wait for the two **Check it on npm** jobs to finish.

## Setting it up once

npm describes trusted publishing, which is what the later releases use, on
[its own page](https://docs.npmjs.com/trusted-publishers). If something here stops matching what
npm does, that page is the one to check.

**On npm**

1. Use an account with two-factor authentication.
2. The package does not exist until the first release, and npm sets up trusted publishing from the
   settings of an existing package. So the first release is published with a token, and the later
   ones without any. Create a granular access token that can read and write packages, with the
   shortest expiry the form allows. It has to cover all packages because the new one cannot be
   chosen yet.

**On GitHub**

1. In Settings, then Environments, create the environment `npm` before the first release. Add
   yourself as a required reviewer and limit deployments to the tags `v*`. A release run that names
   an environment which does not exist creates it without protection.
2. Store the token as a secret called `NPM_TOKEN` of that environment, not of the repository, so
   that only a run that was approved can read it.

**After the first release**

1. Delete the `NPM_TOKEN` secret and revoke the token on npm. The workflow publishes without a
   token when the secret is absent.
2. On the day of the second release, before publishing it, open the settings of the package on
   npmjs.com, find Trusted Publisher, choose GitHub Actions and fill in the owner
   `jsanchez542-hub`, the repository `greenlight`, the workflow file `release.yml` and the
   environment `npm`. The page above says that a new trusted publisher expires if it has not
   completed its first publish within two days, so it is set up when a release is about to go out.
3. Once a release has gone out that way, choose **Require two-factor authentication and disallow
   tokens** in the same settings, and remove any remaining publish tokens from the account.

The publishing step needs npm 11.5.1 or newer, which is why that job runs on Node 24.

## When a run stops

- **Before publishing**, nothing reached npm. Fix the cause, delete the release and its tag, and
  publish them again, or push a new commit and make a new release with the same version.
- **After publishing**, with the last check failing, the version is on npm. Look at the log of the
  failed job, and follow the rule above for a bad version.
