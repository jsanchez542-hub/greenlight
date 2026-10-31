# Changelog

All notable changes are written here. The format follows [Keep a Changelog](https://keepachangelog.com),
and the project follows [semantic versioning](https://semver.org); the README says what that promises.

## [Unreleased]

## [1.1.0] - 2026-10-31

One command to try it, faster scans and a test against a real n8n.

### Added

- A live demo of the dashboard with invented data, built as a static site, published on GitHub
  Pages and linked from both READMEs.
- `GREENLIGHT_CONCURRENCY` (4 by default, from 1 to 16) sets how many workflows are read at the
  same time. `scan()` takes the same setting as the `concurrency` option; left out, it reads one
  workflow at a time as before, so code that uses the package directly sees no change.
- `npm run benchmark` times a scan of an invented instance whose every answer is delayed, to
  measure what reading several workflows at once gains.
- A test against a real n8n, which the CI runs on 2.45.7 and 3.0.1. It puts workflows that fail in
  known ways on the instance, scans it with the packaged program and a key that has only the four
  scopes a scan needs, and checks that exactly what was planted is reported.
- The scanner is published on npm as `greenlight-n8n`, so `npx greenlight-n8n init` and
  `npx greenlight-n8n` work without cloning anything. It installs two commands, `greenlight-n8n` and
  `greenlight`. It has no dependencies and no install scripts, each version is built and published by
  a GitHub Actions workflow with provenance, and the file is tried on Linux and Windows before it is
  published. The dashboard stays in the repository.

### Changed

- The scan reads four workflows at a time instead of one after another. The result is identical, in
  the same order. On an invented instance of 500 workflows where each request takes about 31 ms, a
  scan went from 93 to 23 seconds. A real instance may not keep that pace if it is asked for more at
  once: `GREENLIGHT_CONCURRENCY=1` brings back the old behavior.
- The dashboard no longer says, while it scans, that the workflows are read one at a time.
- When a setting is not valid, the dashboard names it, in both languages and without repeating the
  value, as the command line already did. Before it only said that the scan could not finish.
- The help, the missing settings error, the connection check and the steps after the setup name the
  command you have: `npx greenlight-n8n ...` when you started it with npx, `greenlight ...`
  otherwise. Before, someone trying it with npx was told to type a command that does not exist on
  their computer.
- The package is called `greenlight-n8n`, so a program that uses it from code writes
  `import { scan } from 'greenlight-n8n'`. The commands, the options, the environment variables, the
  exit codes, the `--json` output and the alert payload are as in 1.0.

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
  and dark, usable on a phone screen, with a tour on the first visit and a form to connect your n8n.
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
