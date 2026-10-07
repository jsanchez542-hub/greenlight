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
- **Files stay private.** `.env` and the file that remembers what `watch` reported are created
  readable only by their owner, on systems that support it.
- **The alert webhook does not follow redirects**, because the alert text and the token would travel
  with them.
- **The build is guarded.** The workflow token can only read the repository, third-party actions are
  pinned to a commit, `npm audit` runs on production dependencies at every change, and Dependabot
  proposes updates.

## Known advisories in development tooling

`npm audit` in `web/` reports `braces` (GHSA-vfj7-8cjw-p6xm, denial of service through deeply nested
patterns). It arrives through the lint configuration of Next.js, it is only used on this repository's
own files while linting, and no patched release exists yet. Everything the scanner and the dashboard
run is clean: `npm audit --omit=dev` reports no vulnerabilities in either project. The dependency
will be updated as soon as a fix is published.
