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

## Commits and pull requests

- Commit messages are in English with a prefix (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), and
  the body says why, not only what.
- Keep a pull request to one idea. Say what you ran and what you saw.
- Never include data from a real instance in a commit, an issue or a screenshot. Use
  `npm run example`, which produces invented data.
