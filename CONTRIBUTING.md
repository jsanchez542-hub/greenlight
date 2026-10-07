# Contributing

Thanks for looking. GreenLight is small on purpose, and the bar for a change is that it makes a
real failure easier to see without making the output noisier.

## Setting up

Node 22.12 or newer.

```bash
git clone https://github.com/jsanchez542-hub/greenlight.git
cd greenlight
npm install            # also compiles dist/
npm test
```

| Command | What it does |
| --- | --- |
| `npm test` | unit tests of the scanner |
| `npm run typecheck` | TypeScript without emitting |
| `npm run build` | compiles to `dist/` |
| `npm run example` | prints the report for the synthetic instance |
| `npm run panel` | prepares, starts and opens the dashboard in `web/` |

The dashboard has its own project in `web/` with its own `lint`, `typecheck`, `test` and `build`.

## What a good change looks like

- **It comes from something that happened.** A check exists because a real instance failed in
  that way, and the README says which. A check added "because it could go wrong" tends to alert on
  nothing.
- **It is deterministic.** Every finding is a comparison between numbers that are printed next to
  it as evidence, so it can be reproduced and covered by a test. No model is in the loop.
- **It prefers silence to a wrong alert.** Checks refuse to judge without enough history. A
  confident false alarm costs more trust than a missed one.
- **It has tests.** A bug fix starts with a test that fails. A new check needs a case that raises
  it and one that must stay quiet.
- **It adds no production dependency.** The scanner runs on Node alone. If something seems to need
  a package, open an issue first.

## Adding a check

1. Write the detector in `src/analysis/detectors/` as a function that takes the workflow, its
   executions and the options, and returns findings with their evidence.
2. Register it in `src/analysis/analyse.ts` and add its name to `DetectorName` in
   `src/analysis/types.ts`.
3. Test it in `tests/analysis/detectors.test.ts`, including the case where it must say nothing.
4. Document it in the README table and in "How it decides", and describe it for the dashboard in
   `web/src/lib/detectors.ts`.

## Releasing

1. Move the entries under "Unreleased" in `CHANGELOG.md` to a heading with the new version and the date.
2. Set the version with `npm version <x.y.z> --no-git-tag-version` in the root and in `web/`, and commit.
3. Tag it `vX.Y.Z`, push the tag and create the release from the same text:
   `gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <the changelog text>`.

Fixes are patch versions, anything new that keeps working setups working is a minor version, and a
major version is only for a change that breaks something the README promises to keep stable.

## Words that people read

Every sentence a person reads is written in English and in Spanish, and the two must say the same
thing.

- Command line sentences live in `src/i18n/en.ts` and `src/i18n/es.ts`. The Spanish file is typed
  against the English one, so a missing sentence does not compile, and `tests/i18n` checks that both
  use the same arguments and keep the typography rules.
- Dashboard sentences live in the dictionaries under `web/`, with the same kind of checks.
- A new finding must carry in its `evidence` the numbers its sentence needs, and `describeFinding`
  in `src/i18n/findings.ts` must tell it in Spanish from them. The `summary` stays in English and is
  part of the scan result, so it does not depend on the language.
- Both READMEs change together; `tests/readme.test.ts` compares them.
- Terms are the same everywhere: workflow, hallazgo (finding), análisis (scan), comprobación
  (check), panel (dashboard), crítico and advertencia (critical and warning), clave de API.
- No long or medium dashes in text a person reads, and Spanish questions and exclamations open with
  `¿` and `¡`.

## Commits and pull requests

- Commit messages are in English with a prefix (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), and
  the body says why, not only what.
- Keep a pull request to one idea. Say what you ran and what you saw.
- Never include data from a real instance in a commit, an issue or a screenshot. Use
  `npm run example`, which produces invented data.
