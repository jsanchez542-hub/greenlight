const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/**
 * Every sentence a person reads from the command line. The Spanish catalogue is typed against
 * this one, so a sentence added here and missing there does not compile.
 */
export const en = {
  cli: {
    usage: `GreenLight  checks an n8n instance for workflows that fail without saying so.

  greenlight init                     guided first-time setup: connects to your n8n and saves .env
  greenlight doctor                   checks the connection step by step and says what to fix
  greenlight [--json]                 scan once and print the report
  greenlight --version                print the version
  greenlight watch [--once]           scan on a schedule and alert when something new appears

Settings are read from the environment and from a .env file in the current folder.
Running greenlight init writes that file for you.

Environment:
  N8N_BASE_URL                URL of the n8n instance
  N8N_API_KEY                 API key with read access
  GREENLIGHT_EXECUTION_LIMIT  executions read per workflow (default 200)
  GREENLIGHT_DETAIL_SAMPLE    executions inspected node by node (default 5)
  GREENLIGHT_ALLOW_INSECURE_HTTP  set to 1 to send the key over plain http to a public host (not recommended)
  GREENLIGHT_LANG             "en" or "es"; by default the language of this computer
  GREENLIGHT_CHECK_UPDATES    set to 1 to be told when a new version is out (off by default, see the README)

Only for watch:
  GREENLIGHT_WEBHOOK_URL      where alerts are posted as JSON (optional; without it changes are only printed)
  GREENLIGHT_WEBHOOK_TOKEN    sent as "Authorization: Bearer <token>" (optional)
  GREENLIGHT_INTERVAL_MINUTES minutes between scans (default 5)
  GREENLIGHT_NOTIFY_MIN       "warning" (default) or "critical"
  GREENLIGHT_STATE_FILE       remembers what was already reported (default .greenlight-state.json)

Exit codes: 0 nothing found, 1 findings, 2 the scan could not run.
With watch --once it is the same, so it can run from cron or a scheduler.
`,
    envFileUnreadable: (path: string, reason: string) => `Could not read ${path}: ${reason}`,
    unknownError: 'unknown error',
    doctorHeading: (version: string, host: string | null) => `GreenLight ${version}  doctor${host === null ? '' : `  ${host}`}`,
    doctorOk: 'Everything needed is in place.',
    doctorFix: 'Run greenlight init to fix the settings.',
    watching: (instance: string, minutes: number, hasWebhook: boolean) =>
      `Watching ${instance} every ${minutes} min. ${
        hasWebhook ? 'Alerts go to the webhook.' : 'No webhook set, changes are only printed.'
      }`,
    updateAvailable: (current: string, latest: string, url: string) =>
      `A new version is available: ${latest} (you have ${current}). What changed: ${url}`,
  },

  panel: {
    preparing: 'Getting the dashboard ready (the first time takes a minute or two)...',
    building: 'Building it...',
    failed: 'The dashboard could not be prepared. The messages above say why.',
    portBusy: (port: number) => `Port 3000 is in use by another program, so GreenLight will use ${port}.`,
    ready: (url: string) => `GreenLight is ready: ${url}\nPress Ctrl+C here to stop it.`,
    noFreePort: (from: number, to: number) => `No free port was found from ${from} to ${to}.`,
  },

  runtime: {
    nodeTooOld: (needed: string, found: string) =>
      `GreenLight needs Node.js ${needed} or newer and this computer has ${found}. Install the current LTS version from https://nodejs.org and run the command again.`,
  },

  config: {
    missingConnection:
      'N8N_BASE_URL and N8N_API_KEY are not set. Run greenlight init for a guided setup, or set them in the environment or in a .env file.',
    notPositive: (name: string, raw: string) => `${name} must be a positive whole number, received "${raw}".`,
    badSeverity: (raw: string) => `GREENLIGHT_NOTIFY_MIN must be "warning" or "critical", received "${raw}".`,
    badWebhook: 'GREENLIGHT_WEBHOOK_URL must be a valid http or https URL.',
  },

  report: {
    scanned: (workflows: number) => `scanned ${plural(workflows, 'workflow', 'workflows')}`,
    nothing: 'nothing to report',
    summary: (count: number, critical: number) => `${plural(count, 'finding', 'findings')}, ${critical} critical`,
    severity: { critical: 'CRITICAL', warning: 'WARNING' },
  },

  client: {
    insecureHttp:
      'That address starts with http and can be reached from the internet, so the API key would travel unencrypted. Use the https version of the address. (Advanced: GREENLIGHT_ALLOW_INSECURE_HTTP=1 allows it anyway.)',
    apiStatus: (status: number, path: string) =>
      `n8n API returned ${status} for ${path}. Check N8N_BASE_URL and N8N_API_KEY.`,
    tooManyRedirects: (path: string) => `n8n API sent too many redirects for ${path}. Use the final address in N8N_BASE_URL.`,
    unusableRedirect: (path: string) => `n8n API sent an unusable redirect for ${path}. Use the final address in N8N_BASE_URL.`,
    otherHost: (path: string) =>
      `n8n API redirected to a different host for ${path}, so the API key was not sent there. Use the final address in N8N_BASE_URL.`,
    httpsToHttp: (path: string) =>
      `n8n API redirected from https to http for ${path}, which would send the API key unencrypted. Check the HTTPS setup of the instance.`,
  },

  diagnose: {
    labels: {
      address: 'The address looks valid',
      reach: 'The instance answers',
      authenticate: 'The API key is accepted',
      executions: 'Execution history is readable',
    },
    skipped: 'Skipped because an earlier step failed.',
    noAddress: {
      detail: 'No address was given.',
      hint: 'Use the address you open n8n with, for example https://n8n.example.com.',
    },
    invalidAddress: {
      detail: 'That is not a valid web address.',
      hint: 'Write it in full, including https://, for example https://n8n.example.com.',
    },
    badProtocol: {
      detail: 'The address must start with http:// or https://.',
      hint: 'For example https://n8n.example.com.',
    },
    hasCredentials: {
      detail: 'The address contains a user name or password.',
      hint: 'Remove them. The API key is asked for separately.',
    },
    hasApiPath: {
      detail: 'The address ends in /api/v1.',
      hint: 'Use only the address of n8n, for example https://n8n.example.com. GreenLight adds the rest.',
    },
    insecurePublic: { detail: 'The address uses http on a public host.' },
    addressOk: 'The address is valid.',
    insecureAllowed: 'Plain http was allowed on request: the API key travels unencrypted.',
    privateHttp: 'It uses http on a private network, so the key is not encrypted. Fine if you trust that network.',
    noKeyReach: 'No API key was given, so the instance was not contacted.',
    noKey: {
      detail: 'No API key was given.',
      hint: 'In n8n open Settings, then n8n API, and create a key. Copy it when it is shown: n8n only displays it once.',
    },
    reached: 'The instance answered.',
    timeout: {
      detail: (seconds: number) => `The instance did not answer within ${seconds} seconds.`,
      hint: 'Check that the address is reachable from this machine and that nothing is blocking it, such as a firewall or a VPN.',
    },
    unresolved: {
      detail: 'The address could not be resolved.',
      hint: 'Check the spelling of the domain and that this machine has internet access.',
    },
    refused: {
      detail: 'Nothing is listening at that address and port.',
      hint: 'Check that n8n is running and that the port is the one it serves on.',
    },
    untrustedCertificate: {
      detail: 'The HTTPS certificate of the instance is not trusted.',
      hint: "The padlock of that address is not one this computer trusts. If it is your own server, install a proper certificate (a free one from Let's Encrypt works). Advanced: for a self-signed certificate, set NODE_EXTRA_CA_CERTS to your certificate file.",
    },
    connectionFailed: {
      detail: 'The connection failed before any answer came back.',
      hint: (technical: string) => `Check the address and your network. Technical detail: ${technical}.`,
    },
    status401: {
      detail: 'The instance rejected the API key.',
      hint: 'In n8n open Settings, then n8n API, and create a new key. Copy it when it is shown: n8n only displays it once.',
    },
    status403: {
      detail: 'The API key is valid but is not allowed to read workflows.',
      hint: 'Create a key that can read workflows and executions. GreenLight never writes, so a read-only key is enough.',
    },
    status404: {
      detail: 'The address answered, but there is no n8n API there.',
      hint: 'Use the address you open n8n with, without /api/v1 at the end. If it is right, the n8n API may be switched off on that server: turn it on and try again.',
    },
    redirect: {
      detail: 'The address redirects somewhere GreenLight will not follow.',
      hint: 'That address sends visitors somewhere else. Use the address you end up on, usually the one that starts with https.',
    },
    serverError: {
      detail: (status: number) => `The instance answered with an error (HTTP ${status}).`,
      hint: 'Try again in a moment. If it persists, check the logs of the instance.',
    },
    keyWorks: (count: number) =>
      `The key works and ${count} ${count === 1 ? 'workflow is' : 'workflows are'} visible.`,
    executionsDenied: 'The API key cannot read executions, and GreenLight needs them.',
    executionsFailed: 'Execution history could not be read.',
    executionsHint: 'Create a key that can read executions as well as workflows. Without history there is nothing to compare.',
    executionsOk: 'Execution history can be read.',
  },

  init: {
    marks: { ok: '[ok]  ', failed: '[fail]', skipped: '[skip]' },
    title: 'GreenLight setup',
    intro: [
      'This connects GreenLight to your n8n instance. It only reads: workflows and',
      'execution history. It never creates, changes or deletes anything.',
      '',
      'You need an API key. In n8n open Settings, then n8n API, and create one.',
      'Read access is enough. Copy it when it is shown: n8n displays it only once.',
      '',
    ],
    askAddress: 'n8n address, for example https://n8n.example.com',
    askKey: 'API key',
    askKeySaved: 'API key (press Enter to keep the saved one)',
    askKeyTyped: 'API key (press Enter to keep the one you typed)',
    checking: 'Checking the connection...',
    tryAgain: 'Try again?',
    notSavedRetry: 'Nothing was saved. Run the setup again when you are ready.',
    webhookIntro: [
      'Optional: GreenLight can post an alert to a webhook when something new appears',
      '(see "Watching" in the README). Paste its address, or press Enter to skip.',
    ],
    askWebhook: 'Alert webhook address',
    askWebhookAgain: 'Alert webhook address (Enter to skip)',
    badWebhook: 'That is not a valid http or https address.',
    webhookHttp: 'Note: that address uses http, so alerts and the token travel unencrypted. Prefer https.',
    askToken: 'Webhook token (Enter if it has none)',
    updatesIntro: [
      'Optional: GreenLight can tell you when a new version is out. It asks GitHub for the',
      'number of the latest release about once a day. Nothing about you or your n8n is sent.',
    ],
    askUpdates: 'Tell me about new versions?',
    confirmSave: (path: string) => `Save these settings to ${path}?`,
    notSaved: 'Nothing was saved.',
    saved: (path: string) => `Saved to ${path}. It holds your API key, so keep it private and do not commit it.`,
    next: [
      'What next:',
      '  Scan once and read the report   greenlight            (from a clone: npm run scan)',
      '  Keep watching and get alerts    greenlight watch      (from a clone: npm run watch)',
      '  Open the dashboard              npm run panel',
      '  Check the connection again      greenlight doctor',
    ],
    cancelled: 'Setup cancelled.',
    yesNo: { yes: '[Y/n]', no: '[y/N]' },
  },

  watch: {
    newFinding: (severity: string, name: string, detector: string) => `NEW ${severity} ${name} (${detector})`,
    resolvedFinding: (name: string, detector: string) => `RESOLVED ${name} (${detector})`,
    cycle: (workflows: number, open: number, added: number, resolved: number) =>
      `Scanned ${workflows} workflows: ${open} open, ${added} new, ${resolved} resolved.`,
    notDelivered: (reason: string) => `Alert not delivered, will retry on the next scan: ${reason}`,
    scanFailed: (failures: number, reason: string) => `Scan failed (${failures} in a row): ${reason}`,
    stateUnreadable: (path: string) => `Could not read ${path}; starting without history.`,
    stateForeign: (path: string) => `${path} is not a GreenLight state file; starting without history.`,
  },

  alert: {
    newFindings: (count: number, critical: number, instance: string) =>
      `GreenLight: ${plural(count, critical === count ? 'new critical finding' : 'new finding', critical === count ? 'new critical findings' : 'new findings')} on ${instance}`,
    resolvedFindings: (count: number, instance: string) =>
      `GreenLight: ${plural(count, 'finding', 'findings')} resolved on ${instance}`,
    resolvedHeading: 'Resolved:',
    failingSubject: (instance: string) => `GreenLight cannot scan ${instance}`,
    failingText: (failures: number) =>
      `The last ${plural(failures, 'scan', 'scans')} failed, so nothing is being checked. Verify that the instance is reachable and that the API key is still valid.`,
    recoveredSubject: (instance: string) => `GreenLight is scanning ${instance} again`,
    recoveredText: 'The instance answered and scanning has resumed.',
    severity: { critical: 'CRITICAL', warning: 'WARNING' },
    webhookUnreachable: (reason: string) => `Could not reach the webhook: ${reason}`,
    webhookStatus: (status: number) => `The webhook answered HTTP ${status}.`,
  },

  update: {
    /** Shown beside the version in the dashboard, in `greenlight --version` and in `doctor`. */
    notice: (latest: string) => `Version ${latest} is available.`,
  },
};

export type Messages = typeof en;
