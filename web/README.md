# GreenLight dashboard

A web view of one GreenLight scan: how many workflows were checked, which checks raised
findings, and what evidence each finding rests on.

It shows a snapshot. The scan result holds no time series, so the dashboard draws none.

## Two modes

**Demo data** is the default and the only mode a public deployment has. It renders
[`examples/scan-result.json`](../examples/scan-result.json), which the program generated
against an invented instance held in memory. It never contacts anything.

**Live instance** is for running locally. When the server process has `N8N_BASE_URL` and
`N8N_API_KEY` in its environment, a switch appears in the header. Choosing it makes the
server call `scan()` from the parent package and return the result. The key stays on the
server: it is never sent to the browser and failure messages are stripped of it before they
are returned. A scan reads every workflow's history, so on a mid-sized instance it takes tens
of seconds; the page shows elapsed time while it waits and offers a way back to the demo.

Without those variables the page runs in demo mode and the live route answers 404.

Do not set the variables on a public deployment. Anyone who can open the page could then
trigger scans of that instance and read the result.

## Running it

Node 22.12 or newer. Install the scanner's dependencies at the repository root, then start
the dashboard:

```bash
npm install
cd web
npm install
npm run dev
```

`dev`, `build` and `typecheck` rebuild the parent package first, because the dashboard
imports its compiled output and its types. Open <http://localhost:3000>.

For live mode, create `web/.env.local` from `.env.example`:

```
N8N_BASE_URL=https://n8n.example.com
N8N_API_KEY=your-key
```

`GREENLIGHT_EXECUTION_LIMIT` and `GREENLIGHT_DETAIL_SAMPLE` are honoured as well, with the
same meaning as in the command line tool.

| Script | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | unit tests |

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Overview: findings by severity, the four workflow states, a map with one node per workflow, and the findings that need attention. A scan with none says "Nothing to report". |
| `/findings` | Every finding, filtered by severity and by check. The filters live in the address, for example `?severity=critical&check=silence`. |
| `/findings/[key]` | One finding: the backend's summary text, the evidence as key and value, and what the check does, its defaults and what to review. |
| `/workflows` | A dense table of every workflow. Sort by any column, filter by state, search by name. The state is kept in the address: `?state=warning&q=sync&sort=runs&dir=desc`. |
| `/workflows/[id]` | One workflow: state, trigger, last run and its findings. |
| `/checks` | The four checks, what each applies to and the defaults it uses. |

The data source and the scan result belong to the layout, so they survive moving between
routes. Last run is given relative to the scan time, not to the moment you open the page,
with the exact UTC time on hover.

`no-runs` is neutral grey because it is not a verdict: the instance held no history to judge.
`healthy` means history was read and no check found anything, not that nothing is wrong.
State is always carried by a label and a distinct icon shape as well as colour. The lime of
the logo marks selection and brand only; it never means a state.

## Keyboard

`g` then `o`, `f`, `w` or `c` moves to overview, findings, workflows or checks. `/` focuses
the workflow search. The sidebar collapses to icons and remembers that choice in the browser.
On a narrow screen the sidebar becomes a bar along the bottom.

## Layout

```
src/app/(app)/      the routes, inside one layout that holds the shell and the scan
src/app/api/scan/   the live scan route
src/components/     shell, ui and one folder per route, each component with its stylesheet
src/lib/            parsing, formatting, sorting, filtering and navigation
src/lib/server/     code that only runs on the server
public/logo/        the project logo for light and dark backgrounds
tests/              unit tests for everything in src/lib
```

Types come from the parent package, so the contract has one source of truth. Scan results
are validated on arrival, both from the demo file and from the live route, and a result
whose `version` is not 1 is rejected rather than half displayed.

Dependencies: Next.js and React, and the parent package. Styling is plain CSS modules.
ESLint is on version 9 and TypeScript on 6 because `typescript-eslint` does not yet support
TypeScript 7, which the parent package uses.
