# GreenLight dashboard

A web view of one GreenLight scan: how many workflows were checked, which checks raised
findings, and what evidence each finding rests on.

It shows a snapshot. The scan result holds no time series, so the dashboard draws none.

## First time

From the root of the project, with Node 22.12 or newer:

```bash
npm install
npm run setup    # asks for your n8n address and API key, checks them, saves .env
npm run panel    # installs the dashboard's dependencies and starts it
```

Open <http://localhost:3000>. A welcome dialog offers a one-minute tour, and the **Connect
your n8n** page (`/setup`) walks through the same three steps with a live connection check.
It also works in the other order: start the panel first, run `npm run setup` in another
terminal, and the panel switches to your instance by itself, without a restart.

## Where the data comes from

The dashboard is meant to run on your own machine, next to your own n8n.

**One configuration.** The `.env` at the root of the project is the source of truth. It is what
`npm run setup` writes and what the command line reads. The dashboard reads it again on every
request. Anything set in the process environment wins over the file, so `web/.env.local` still
works as an override; blank values there are ignored, so a copied template cannot hide your
real ones.

| Variable | Default | Purpose |
| --- | --- | --- |
| `N8N_BASE_URL` | required | address of the instance |
| `N8N_API_KEY` | required | API key with read access |
| `GREENLIGHT_SCAN_INTERVAL_MINUTES` | 5 | how old the stored scan may get before it is refreshed |
| `GREENLIGHT_EXECUTION_LIMIT` | 200 | executions read per workflow |
| `GREENLIGHT_DETAIL_SAMPLE` | 5 | executions inspected node by node |
| `GREENLIGHT_ALLOWED_HOSTS` | none | extra host names allowed, see Security |

**Live instance.** With the address and key present, the server scans your instance with
`scan()` from the parent package and keeps the result in memory. Visitors read that copy and
never start a scan themselves, so a page left open does not load the instance. The copy is
refreshed when it is older than the interval and someone is looking at the page. The page polls
the copy every few seconds and shows how old it is. **Scan now** starts a refresh on demand.

- If a refresh fails, for example because the instance is down or the key was revoked, the last
  good result stays on screen with a notice that says how old it is, what went wrong and a link
  to the connection check.
- The first scan after a start takes tens of seconds on a mid-sized instance; until it ends
  the page shows a progress notice.
- If the copy is older than three intervals and has not refreshed, the page says so.
- The key stays on the server. It is never sent to the browser, and failure messages are
  stripped of it, and of credentials written into `N8N_BASE_URL`, before they leave.

**Sample data.** Without an address and key the dashboard shows
[`examples/scan-result.json`](../examples/scan-result.json), which the program generated
against an invented instance held in memory. Every page says so: "Sample data, not a live
instance". It can also be chosen on purpose from the switch in the top bar. It never contacts
anything.

## Security

The dashboard has no sign-in of its own. It is meant for localhost or for a network and proxy
you already trust.

- `npm run dev` and `npm start` listen on `127.0.0.1` only.
- The pages and the routes `/api/scan` and `/api/setup` refuse any `Host` other than `localhost`,
  `127.0.0.1` or `[::1]`, which blocks DNS rebinding. To reach it by another name behind your
  own proxy, list that name in `GREENLIGHT_ALLOWED_HOSTS` (comma separated).
- A scan can only be started from the dashboard itself; requests from other sites get 403.
- The connection check never returns the key, only which values are present and what each step
  found. It contacts your instance at most once every two seconds.
- Never put `N8N_BASE_URL` and `N8N_API_KEY` on a server the public can reach. The page would
  show your workflow names to anyone who opens it.
- Real scan output stays out of the repository: no captures, JSON, logs or test data taken
  from a real instance. Everything shown in documentation comes from the sample data.

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Overview: findings by severity, the four workflow states, a map with one node per workflow, and the findings that need attention. A scan with none says "Nothing to report"; an instance with no workflows says so. |
| `/findings` | Every finding, filtered by severity and by check. The filters live in the address, for example `?severity=critical&check=silence`. |
| `/findings/[key]` | One finding: the backend's summary text, the evidence as key and value, and what the check does, its defaults and what to review. |
| `/workflows` | A dense table of every workflow. Sort by any column, filter by state, search by name. The state is kept in the address: `?state=warning&q=sync&sort=runs&dir=desc`. |
| `/workflows/[id]` | One workflow: state, trigger, last run and its findings. |
| `/checks` | The four checks, what each applies to and the defaults it uses. |
| `/setup` | Connect your n8n: three short steps and a live connection check that lists what passed, what failed and what to do about it. |
| `/api/scan` | `GET` reads the stored scan, `POST` asks for a refresh. |
| `/api/setup` | `GET` runs the connection check and returns it without the key. |

The data source and the scan result belong to the layout, so they survive moving between
routes, and the live copy keeps refreshing while you move. Last run is given relative to the
scan time, not to the moment you open the page, with the exact UTC time on hover.

`no-runs` is neutral grey because it is not a verdict: the instance held no history to judge.
`healthy` means history was read and no check found anything, not that nothing is wrong.
State is always carried by a label and a distinct icon shape as well as colour. The lime of
the logo marks selection and brand only; it never means a state.

After you connect, Overview shows one dismissible card about alerts: `npm run watch` tells you
when something new appears. The Watching section of the root `README.md` explains where the
alerts can go.

## Tour and keyboard

The welcome dialog appears the first time the dashboard is opened in a browser. It offers the
tour and, when no instance is connected, the connection page. The tour has six short steps that
point at the real interface. It can be skipped at any point, `Esc` closes it, focus stays inside
it and returns where it was, and it reopens from the foot of the sidebar or with `?`. The
"seen" flag is stored in the browser under a versioned key; if the browser blocks storage the
dialog simply shows again.

`g` then `o`, `f`, `w` or `c` moves to overview, findings, workflows or checks. `/` focuses
the workflow search. The sidebar collapses to icons and remembers that choice. On a narrow
screen the sidebar becomes a bar along the bottom.

## Development

| Script | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | unit tests |

`dev`, `build` and `typecheck` rebuild the parent package first, because the dashboard
imports its compiled output and its types.

```
src/app/(app)/      the routes, inside one layout that holds the shell and the scan
src/app/api/        the scan and connection check routes
src/components/     shell, ui, onboarding and one folder per route, each with its stylesheet
src/lib/            parsing, formatting, sorting, filtering, navigation and onboarding logic
src/lib/server/     code that only runs on the server
public/logo/        the project logo for light and dark backgrounds
tests/              unit tests for everything in src/lib
```

Types come from the parent package, so the contract has one source of truth. Scan results
are validated on arrival, both from the sample file and from the live route, and a result
whose `version` is not 1 is rejected rather than half displayed.

Dependencies: Next.js and React, and the parent package. Styling is plain CSS modules.
ESLint is on version 9 and TypeScript on 6 because `typescript-eslint` does not yet support
TypeScript 7, which the parent package uses.
