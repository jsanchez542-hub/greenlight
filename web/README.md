# GreenLight dashboard

A web view of one GreenLight scan: how many workflows were checked, which checks raised
findings, and what evidence each finding rests on.

It shows a snapshot. The scan result holds no time series, so the dashboard draws none.

## First time

From the root of the project, with Node 22.12 or newer:

```bash
npm install
npm run panel    # builds the dashboard, starts it and opens it in your browser
```

A welcome dialog offers a one-minute tour. To see your own workflows press **Connect** in the
sidebar: type the address of your n8n, paste an API key and press the button. No terminal and
no file editing are needed. The page links to the place in n8n where keys are made.

If you prefer the terminal, `npm run setup` asks for the same two things and saves them. It
works in either order: the dashboard notices a connection made that way by itself, without a
restart.

## Where the data comes from

The dashboard is meant to run on your own machine, next to your own n8n.

**One configuration.** The `.env` at the root of the project is the source of truth. It is what
`npm run setup` and the **Connect** page write, and what the command line reads. The dashboard reads it again on every
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
| `GREENLIGHT_CHECK_UPDATES` | off | `1` to be told when a new version is out, see Version notices; the only thing that ever contacts anything but your n8n |
| `GREENLIGHT_LANG` | the browser's language | `en` or `es`: the language of the dashboard when the person has not chosen one on the page, see Language |
| `GREENLIGHT_ENV_FILE` | the `.env` at the root | another settings file, read only from the process environment; this is how tests keep the real file untouched |

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
- The key stays on the server. It is never sent to the browser. When a scan fails the server
  sends only the kind of failure (the instance rejected the key, could not be reached, took too
  long, has an untrusted certificate...) and the page words it itself, so no text of the error,
  and with it no key and no credentials written into `N8N_BASE_URL`, can travel with it.

**Sample data.** Without an address and key the dashboard shows
[`examples/scan-result.json`](../examples/scan-result.json), which the program generated
against an invented instance held in memory. Every page says so: "Sample data, not a live
instance". It can also be chosen on purpose from the switch in the top bar. It never contacts
anything.

## Security

### What it protects, and from whom

The dashboard shows what an n8n instance holds, so the assets are the **API key** and the
**names and findings of your workflows**. It assumes one person on one machine.

| Threat | Defence |
| --- | --- |
| Someone on the network opens the page | It listens on `127.0.0.1` only, and any `Host` other than `localhost`, `127.0.0.1` or `[::1]` is refused with 403, which also stops DNS rebinding. Other names go in `GREENLIGHT_ALLOWED_HOSTS`. |
| The dashboard tells someone you use it | It contacts nothing but your n8n, except for the version notice, which is off until you turn it on and sends nothing but a request for the number of the latest release (see Version notices). |
| A web page you visit tries to change the connection | Saving or removing it is the only thing the dashboard writes, and it answers only requests that prove they come from the dashboard's own page: `Sec-Fetch-Site: same-origin`, or an `Origin` exactly equal to the host when a browser does not send that. It also requires JSON, which a form on another site cannot send. A plain script with neither is refused. |
| A web page you visit calls the dashboard | Routes answer only requests a browser marks as made from the dashboard itself (`Sec-Fetch-Site`). Forced scans cannot be started from anywhere else. The server sets no cookies, and nothing is readable from another origin. |
| An instance sends names or messages that are markup | Everything from the instance is rendered as text. There is no raw HTML anywhere, identifiers are encoded in addresses, and a strict policy blocks script even if a bug let markup through. |
| The page is framed or its scripts replaced | `Content-Security-Policy` with a nonce per request: scripts and styles only from this origin, `frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'`, forms only to itself. In `npm run dev` it also allows what hot reloading needs (`unsafe-eval`, inline styles); production does not. |
| The key leaks | It stays on the server. It is not in any page, response, header, log, the interface cookie or `localStorage`, and error messages are stripped of it before they are returned. |
| The key is sent to the wrong place | The address comes only from the settings, never from a request. It must be http or https, carry no credentials, and be https unless the host is private or `GREENLIGHT_ALLOW_INSECURE_HTTP` is set. The scanner never follows a redirect to another host with the key. |
| The settings file is hostile or broken | It is opened without following links, refused above 64 KiB or when it is not a regular file, and any failure shows as a short notice that names neither the path nor the contents. |
| The instance is hammered | A manual scan joins one that is running and otherwise waits 30 seconds after the last one (429 with `Retry-After`). The stored scan serves every visitor. |
| Browser features are abused | `Permissions-Policy` denies everything except copying to the clipboard; `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` are `same-origin`; `X-Content-Type-Options`, `Referrer-Policy: no-referrer` and `X-Frame-Options` are set; there is no `X-Powered-By`. |

### Writing the settings

The dashboard writes one file, and only the **Connect** page and the switch for version notices
do. This is the part to read before changing anything.

- **What:** the `N8N_BASE_URL` and `N8N_API_KEY` lines of the `.env` at the root of the project,
  or of the file named by `GREENLIGHT_ENV_FILE` in the process environment, and the
  `GREENLIGHT_CHECK_UPDATES` line. Every other line is kept exactly as it was. The three names
  are fixed; nothing in a request can choose another. Disconnect removes the address and the key
  and keeps the choice about notices, which is not part of the connection.
- **When:** only when the person presses Connect, and only after the scanner's own connection
  check has just passed with that address and key. A failed check writes nothing. Disconnect
  removes those two lines and nothing else.
- **How:** the new text goes to a private temporary file beside the original (mode `0600` on
  systems that have it), which is renamed over it, so a reader never sees half a file. Writes are
  queued one at a time. A symbolic link, something that is not a regular file, a file over 64 KiB
  and any value with a line break or other control character are refused.
- **Who may ask:** a request must be addressed to `localhost`, `127.0.0.1` or `[::1]` (or a name
  in `GREENLIGHT_ALLOWED_HOSTS`), must prove it comes from the dashboard's own page, must be JSON
  of at most 8 KB, and is limited to one attempt a second and twenty a minute (`429` with
  `Retry-After`).
- **What comes back:** the result of the check and whether it was saved. Never the key and never
  the path of the file. The key is not logged, not stored in the browser and not put in any
  address, and the field is cleared as soon as it is sent.
- **If the program's environment sets them:** values in the process environment win over the
  file, so the page says so and Disconnect tells the person where to remove them.

Because it writes, the dashboard stays on loopback. A reachable dashboard with no sign-in would
let anyone who reaches it point GreenLight, and the key it holds, at a server of their choice.

### What it does not protect

There is **no sign-in**. Anything running on the same machine as you can read the dashboard,
and anyone you let past the loopback address sees your workflow names. That is why it only
listens on loopback: the safe way to share it is a proxy you control that adds authentication
in front of it, with the proxy's name in `GREENLIGHT_ALLOWED_HOSTS`. It does not defend against
malware or a malicious browser extension on your machine, and it trusts the settings file the
same way the command line does.

Never put `N8N_BASE_URL` and `N8N_API_KEY` on a server the public can reach. Real scan output
stays out of the repository: no captures, JSON, logs or test data taken from a real instance.

### Dependencies

`npm audit --omit=dev` reports no vulnerabilities in what runs. `npm audit` also lists
development-only advisories through `eslint-config-next`, which does not ship in the
dashboard.

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Overview: findings by severity, the four workflow states, a map with one node per workflow, and the findings that need attention. A scan with none says "Nothing to report"; an instance with no workflows says so. |
| `/findings` | Every finding, filtered by severity and by check. The filters live in the address, for example `?severity=critical&check=silence`. |
| `/findings/[key]` | One finding: the backend's summary text, the evidence as key and value, and what the check does, its defaults and what to review. |
| `/workflows` | A dense table of every workflow. Sort by any column, filter by state, search by name. The state is kept in the address: `?state=warning&q=sync&sort=runs&dir=desc`. |
| `/workflows/[id]` | One workflow: state, trigger, last run and its findings. |
| `/checks` | The four checks, what each applies to and the defaults it uses. |
| `/setup` | Connect your n8n: two fields and a button, a link to the page in n8n where keys are made, and a plain list of what passed and what failed. Once connected it offers to open the dashboard, change the key or disconnect. |
| `/api/scan` | `GET` reads the stored scan, `POST` asks for a refresh. |
| `/api/setup` | `GET` runs the connection check and returns it without the key. |
| `/api/update` | `GET` says whether version notices are on and, when they are, the newest version (`{enabled, current, latest, url}`). `POST {enabled: boolean}` turns them on or off. See Version notices. |
| `/api/connect` | `POST` saves or removes the connection: `{action: 'connect', baseUrl, apiKey}` or `{action: 'disconnect'}`. See Writing the settings. |

The data source and the scan result belong to the layout, so they survive moving between
routes, and the live copy keeps refreshing while you move. Last run is given relative to the
scan time, not to the moment you open the page, with the exact UTC time on hover.

`no-runs` is neutral grey because it is not a verdict: the instance held no history to judge.
`healthy` means history was read and no check found anything, not that nothing is wrong.
State is always carried by a label and a distinct icon shape as well as colour. The lime of
the logo marks selection and brand only; it never means a state.

Connecting is always one tap away. The sidebar has a **Connect** entry, a fifth tab on a narrow
screen, that says "not connected" until an instance is set up and then shows "Connected" with
its host. While the data is the sample, the top bar and the notice under it carry a **Connect
your n8n** button. Whoever skips the welcome dialog sees one short, dismissible hint next to that
entry, once.

After you connect, Overview shows one dismissible card about alerts: `npm run watch` tells you
when something new appears. The Watching section of the root `README.md` explains where the
alerts can go.

## Language

The dashboard speaks English and Spanish. **ES | EN** sits at the foot of the sidebar, next to the
theme switch, and in the top bar on a narrow screen. Changing it keeps the page, the filters and
whatever you were doing: the choice is stored and the page is rendered again by the server.

The language is the first of these that says something:

1. the choice made on the page, kept in the interface cookie (see below);
2. `GREENLIGHT_LANG` in the settings, `en` or `es`, for an installation that should always speak one;
3. the `Accept-Language` of the browser, weighted as the browser sends it;
4. English.

`<html lang>` follows it, and so do the title and the description of every page.

Every sentence the dashboard writes comes from two typed dictionaries in `src/i18n`: `es.ts` is
typed against `en.ts`, so a sentence that exists in one and is missing in the other does not
compile. Tests also check that no Spanish sentence is left in English, that no sentence uses a
long dash, that questions and exclamations open with `¿` and `¡`, and that the glossary below is
kept. What the dashboard does not translate is data: the names of workflows and nodes, and the
values of the evidence.

Dates, hours and numbers are written with `Intl` for the language (`2 mar 2026, 09:00 UTC`,
`12,3 s`, `12.345`), and so are "5 min ago" and "hace 5 min". The sentence that explains a
finding is written from its evidence by `describeFinding` of `greenlight/i18n`, the same
function the command line uses, so both always say the same thing.

Messages from the server are never shown as they arrive. A refusal or a failure travels as a short
code (`hostNotAllowed`, `scanRejectedKey`, `rateLimited`...) and the page words it in the
language of the reader. The connection check is written by the scanner in the language of the
request.

| Concept | English | Spanish |
| --- | --- | --- |
| a flow in n8n | workflow, workflows | workflow, workflows (not translated) |
| what a check raises | finding | hallazgo |
| a run of the scanner | scan | análisis |
| what looks for a problem | check | comprobación |
| this program | dashboard | panel |
| severity | critical, warning | crítico, advertencia |
| a message sent out | alert (webhook) | alerta (webhook) |
| the credential | API key | clave de API |
| what n8n keeps | execution history | historial de ejecuciones |
| the two sources | Sample data, Live | Datos de ejemplo, En vivo |

Spanish is neutral, addresses the reader as *tú*, uses sentence case and the opening `¿` and `¡`,
and has no long dashes. Headings written in lowercase in English, like the prompt of a terminal,
are lowercase in Spanish too. The shortcut keys stay `g` then `o`, `f`, `w` and `c` in both.

## Version notices

GreenLight only contacts your n8n, with one exception that is **off until you turn it on**: a
notice that a new version is out. It exists so that the dashboard does not need to be remembered
to be updated, and it never installs anything.

- **Turning it on:** the **Connect** form has a box, ticked by default, and the connected page
  has the same switch, off until someone chooses. Choosing writes `GREENLIGHT_CHECK_UPDATES=1`
  (or `0`) to the settings. A person who chose no is not asked again: the form respects it when the
  key is changed.
- **What is asked:** while it is on, the server makes one plain `GET` to
  `api.github.com/repos/<repository>/releases/latest` for the number of the latest release, at
  most once a day, whatever the number of open pages, and keeps the answer in memory. The request
  carries no body, no cookie and no setting; nothing about you, your instance or your
  workflows is in it. It is made by the server, not by the browser, so the content security policy
  is unchanged and the page still talks only to itself. GitHub sees the address of this computer
  and the version of GreenLight in the `User-Agent`, as any website would, and the page says so next
  to the switch.
- **What is shown:** "A new version is available: 1.2.0. What changed", at the foot of the sidebar
  (and of each page on a narrow screen) and at the top of the overview, with a link to the page
  of the release and a Dismiss button. Dismissing is remembered in the browser storage for that
  version only, so the next release brings the notice back.
- **The link is not trusted:** the address arrives from the server, which got the number from
  GitHub. The page builds the address again from the number
  (`https://github.com/<repository>/releases/tag/vX.Y.Z`, with the repository the scanner reports),
  shows the link only when the two are identical, opens it in a new tab with
  `rel="noopener noreferrer"`, and ignores anything else in the answer.
- **When it fails:** no network, a refusal or a strange answer all mean there is nothing to say.
  Nothing is shown, no error appears and a failure is not asked again for a day.
- **Public demo:** an installation shown to the public should never make this request. The
  dashboard has no public demo mode yet, so there is no setting for it; when one exists the notice
  must be off in it.

## Theme

Light, dark or follow the system. The switch is at the foot of the sidebar, above "Take the
tour", and in the top bar on a narrow screen. It cycles System, Light, Dark, and its label
says which one is active and which comes next. System is the default and keeps following the
operating system while the page is open; Light and Dark override it in both directions.

The choice is stored in the browser under a versioned key and applied by a short script in the
page head before anything is painted, so a forced theme never flashes the other one. If the
browser blocks storage the page falls back to following the system. All colours come from
variables defined with `light-dark()` in `src/app/globals.css`, so the browser's own controls
and scrollbars follow the theme too, and the logo changes variant with it.

## Tour and keyboard

The welcome dialog appears once to a new visitor, and is marked as seen the moment it is shown:
closing the window, reloading or navigating away without pressing anything does not bring it
back. The tour has six short steps that point at the real interface. It can be skipped until its
last step, which offers **Connect my n8n** when no instance is connected and only **Done**
otherwise. `Esc` closes it, focus stays inside it and returns where it was, and it reopens from
the foot of the sidebar or with `?`.

### The interface cookie

What a visitor has already seen is remembered in the browser storage and in one cookie,
`greenlight_ui`. The cookie exists because browser storage is separate for every port, and the
port changes whenever 3000 is busy. A cookie ignores the port, so the same address on another
port does not show the welcome again.

- Its value is a list of flag names such as `welcome-v1.watch-tip-v1.lang-es`: which hints were
  seen and, as `lang-es` or `lang-en` (never both), the language the person chose. Nothing else.
- It is set by the page, not by the server, so it cannot be `HttpOnly`. It is `Path=/`,
  `SameSite=Strict`, lasts one year, and has no `Domain`, so it stays on the host that set it.
- It holds no key, address, name or identifier. The server never sets it, and reads only the
  language token out of it, to render the page in that language; every other flag is for the page
  alone. The content security policy and the other headers are unaffected by it.
- Only names the dashboard knows are read back, so a cookie edited by hand or by another
  application on the same host cannot add anything. A language it does not speak is ignored.
- If the browser blocks cookies or storage the dialog simply shows again, and the language falls
  back to the setting and to the browser. The theme choice stays in the browser storage and is not
  in the cookie.
- `127.0.0.1` and `localhost` are different hosts to the browser, so each is a new visitor once.

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
