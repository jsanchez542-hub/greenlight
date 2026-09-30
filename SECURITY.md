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
