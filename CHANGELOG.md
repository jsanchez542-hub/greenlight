# Changelog

All notable changes are written here. The format follows [Keep a Changelog](https://keepachangelog.com),
and the project follows [semantic versioning](https://semver.org); the README says what that promises.

## [Unreleased]

## [1.0.0] - 2026-10-08

First public release.

### What it does

- Four checks, each born from a failure on a real instance:
  - **Silent error**: a step failed inside a run that reported success.
  - **Duration drift**: a workflow became much slower than its own history.
  - **Silence**: a scheduled workflow stopped running without being switched off.
  - **Frequency drop**: it still runs, but far less often than before.
- Command line: `scan` (with `--json`), `watch` (with `--once`), `init`, `doctor` and `--version`.
- `watch` alerts only on what changed and posts a JSON alert to a webhook of your choice; an
  example n8n workflow turns it into an email.
- A local dashboard with overview, findings, workflows and an explanation of every check, in light
  and dark, usable on a phone-sized screen, with a first-run tour and a form to connect your n8n.
- A guided setup (`npm run setup` or the form) that checks the connection step by step and explains
  each failure in plain words.
- English and Spanish: the dashboard, the command line, the connection check and the alerts. The
  language is `--lang`, `GREENLIGHT_LANG`, the language switch of the dashboard or the language of
  the computer. The `--json` output does not depend on it. There is a Spanish README.
- An optional notice of new versions, off unless you turn it on: one request a day to GitHub for the
  number of the latest release, nothing about you or your n8n sent, silent if it fails.

### Security

- The API key is sent only to the address you configured, never over plain http to a public host
  unless you opt in, and redirects to another host are refused.
- The dashboard listens only on this machine, has a strict content security policy, validates every
  request that writes, and never returns or stores the key.
- No production dependencies in the scanner. The build runs with least privilege, pinned actions and
  an audit of production dependencies.

### Limits

- It reads the execution history the instance still holds, so a short retention window limits what it
  can compare. Workflows that never ran are not judged.
- The checks use defaults that are stated in the README; they are not tuned per instance.
- It has been used on a single real instance so far. Reports from others are what will improve it.
- Tested on Windows and Linux. macOS and browsers other than Chrome and Edge are not tested.
