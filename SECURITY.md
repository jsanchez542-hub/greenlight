# Security

## Reporting a vulnerability

Please report it privately through the **Security** tab of this repository ("Report a
vulnerability"), not in a public issue. Include what you found, how to reproduce it and what you
think the impact is. It will be answered as soon as possible.

## What to keep in mind when using GreenLight

- **Use a key that can only read.** GreenLight reads workflows and execution history and never
  writes to your instance. Give it a key with read access and nothing more.
- **Keep the key out of git.** `greenlight init` writes it to a `.env` file, which this repository
  already ignores. Do not commit it, paste it in an issue or share screenshots that show it.
- **The dashboard has no login.** It listens on `127.0.0.1` and refuses other hostnames, so it is
  meant for your own machine. If you put it behind a reverse proxy, put authentication in front of
  it too, because anyone who can open the page can read the scan.
- **A webhook URL is a secret.** Chat and email services often treat the address itself as the
  credential. GreenLight never prints it, but it will be in your `.env`.
- **Execution data can be sensitive.** A scan reads execution output to find errors. It does not
  store it, and a finding only carries a short summary and counts, but run it where you would run
  your other admin tools.

## How GreenLight handles your key

- **It goes to one place.** The key is sent in a header to the address you configured and nowhere
  else. A redirect is followed only when it stays on the same host and never when it drops from https
  to http; any other redirect stops the request before the key is sent.
- **Not over plain http to a public host.** If the address uses http and is not on this machine or a
  private network, GreenLight refuses to send the key. `GREENLIGHT_ALLOW_INSECURE_HTTP=1` overrides
  that for people who accept the risk, and the connection check says so when it is on.
- **It is never shown.** Reports, errors, the dashboard and its server log do not contain the key,
  and the tests look for it in every output.
- **The dashboard can save the connection for you.** The connection form writes the address and the key
  to `.env`, nothing else, and only when the check passes. The request has to come from the page itself
  on this machine, is limited in size and in frequency, and a value that contains a line break is
  refused so it cannot add settings of its own. The form never keeps the key, and it is not in the
  browser, in the address bar or in any response.
- **Files stay private.** `.env` and the file that remembers what `watch` reported are created
  readable only by their owner, on systems that support it.
- **The alert webhook does not follow redirects**, because the alert text and the token would travel
  with them.
- **The notice of a new version is off unless you turn it on.** When it is on, GreenLight makes one
  `GET` to `api.github.com` for the number of the latest release, at most once a day. The request
  carries no key, no address of your instance and no data about you beyond what any web request
  shows (your IP address and a `greenlight/<version>` user agent). It does not follow redirects, only
  accepts a plain `x.y.z` version number, builds the link to the release notes itself instead of
  using the one in the response, and fails silently. It never downloads or runs anything.
- **The build is guarded.** The workflow token can only read the repository, third-party actions are
  pinned to a commit, `npm audit` runs on production dependencies at every change, and Dependabot
  proposes updates.

## Known advisories in development tooling

`npm audit` in `web/` reports `braces` (GHSA-vfj7-8cjw-p6xm, denial of service through deeply nested
patterns). It arrives through the lint configuration of Next.js, it is only used on this repository's
own files while linting, and no patched release exists yet. Everything the scanner and the dashboard
run is clean: `npm audit --omit=dev` reports no vulnerabilities in either project. The dependency
will be updated as soon as a fix is published.
