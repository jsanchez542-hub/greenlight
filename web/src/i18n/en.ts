const numbers = new Intl.NumberFormat('en');
const n = (value: number): string => numbers.format(value);
const plural = (count: number, one: string, many: string): string => `${n(count)} ${count === 1 ? one : many}`;

export const en = {
  meta: {
    title: 'GreenLight',
    defaultTitle: 'GreenLight scan results for n8n workflows',
    description:
      'Silent errors, slow-downs, silence and dropped schedules in n8n workflows, read from a scan of the instance.',
    pages: {
      overview: {
        title: 'Overview',
        description: 'The state of every n8n workflow in the latest scan, and what needs attention first.',
      },
      findings: {
        title: 'Findings',
        description: 'Every finding of the latest scan, filtered by severity and by check.',
      },
      finding: {
        title: 'Finding',
        description: 'The evidence behind one finding and what to review.',
      },
      workflows: {
        title: 'Workflows',
        description: 'Every workflow that was checked, with its state, trigger and last run.',
      },
      workflow: {
        title: 'Workflow',
        description: 'The state of one workflow and the findings raised for it.',
      },
      checks: {
        title: 'Checks',
        description: 'What each check looks for and the defaults it uses to decide.',
      },
      setup: {
        title: 'Connect your n8n',
        description: 'Connect GreenLight to your n8n with an address and an API key. It only reads.',
      },
    },
  },

  notFound: {
    title: 'Page not found',
    body: 'There is nothing at this address. The link may be old or mistyped.',
    home: 'Go to the overview',
  },

  nav: {
    primary: 'Primary',
    sections: 'Sections',
    location: 'Location',
    skip: 'Skip to content',
    labels: { overview: 'Overview', findings: 'Findings', workflows: 'Workflows', checks: 'Checks' },
    tabs: { overview: 'Overview', findings: 'Findings', workflows: 'Workflows', checks: 'Checks' },
    pages: {
      overview: 'overview',
      findings: 'findings',
      workflows: 'workflows',
      checks: 'checks',
      setup: 'setup',
      notFound: 'not found',
    },
    sources: { live: 'live', sample: 'sample' },
    sectionTitle: (label: string, key: string) => `${label} (g ${key})`,
  },

  sidebar: {
    connect: 'Connect',
    connected: 'Connected',
    notConnected: 'not connected',
    connectedTitle: (host: string | null) => `Connected to ${host ?? 'your n8n'}`,
    connectTitle: 'Connect your n8n',
    source: 'source',
    scanned: 'scanned',
    liveInstance: 'Live instance',
    sampleData: 'Sample data',
    shortcutsGo: 'then',
    shortcutsSearch: 'search workflows',
    tour: 'Take the tour',
    tourTitle: 'Take the tour (?)',
    collapse: 'Collapse',
    collapseLabel: 'Collapse sidebar',
    expandLabel: 'Expand sidebar',
    connectHint: 'You can connect your n8n any time from here.',
    connectHintDismiss: 'Got it',
  },

  top: {
    sample: 'Sample data',
    notLive: '· not a live instance',
    sourceGroup: 'Data source',
    liveFull: 'Live instance',
    liveShort: 'Live',
    sampleFull: 'Sample data',
    sampleShort: 'Sample',
    scanNow: 'Scan now',
    scanning: 'Scanning',
    refreshing: 'refreshing',
    scanned: 'scanned',
  },

  theme: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    prefix: 'Theme',
    systemNow: (now: string) => `System, currently ${now}`,
    button: (current: string, next: string) => `Theme: ${current}. Switch to ${next}.`,
  },

  language: {
    group: 'Language / Idioma',
    english: 'English',
    spanish: 'Español',
  },

  age: {
    justNow: 'just now',
    minutes: (count: number) => `${n(count)} min ago`,
    hours: (count: number) => `${n(count)} h ago`,
    days: (count: number) => `${plural(count, 'day', 'days')} ago`,
    atScan: 'At scan time',
    minutesBefore: (count: number) => `${n(count)} min before scan`,
    hoursBefore: (count: number) => `${n(count)} h before scan`,
    daysBefore: (count: number) => `${n(count)} days before scan`,
  },

  count: {
    workflows: (count: number) => plural(count, 'workflow', 'workflows'),
    findings: (count: number) => plural(count, 'finding', 'findings'),
  },

  status: {
    health: {
      critical: { label: 'Critical', meaning: 'At least one check raised a critical finding.' },
      warning: {
        label: 'Warning',
        meaning: 'At least one check raised a warning and none raised a critical finding.',
      },
      healthy: {
        label: 'Healthy',
        meaning: 'History was read and no check found anything. This is not a guarantee.',
      },
      'no-runs': {
        label: 'No runs',
        meaning: 'The instance holds no execution history for it, so nothing could be judged.',
      },
    },
    severity: { critical: 'Critical', warning: 'Warning' },
    severityCount: (severity: 'critical' | 'warning', count: number) => `${n(count)} ${severity}`,
    trigger: {
      schedule: { label: 'Schedule', meaning: 'Started by a clock' },
      event: {
        label: 'Event',
        meaning: 'Started by anything else, such as a webhook or a polling trigger',
      },
    },
    yes: 'yes',
    no: 'no',
    noRuns: 'no runs on record',
    all: 'all',
  },

  scan: {
    settingsBroken: 'The settings file cannot be used.',
    settingsFix: 'Fix it and reload the page.',
    invented: 'These are invented workflows.',
    chooseLive: ' Choose Live instance to see your own.',
    connectToSee: 'Connect your n8n to see your own.',
    lastGood: (age: string | null) => `Showing the last successful scan${age === null ? '' : `, ${age}`}.`,
    attemptFailed: 'The latest attempt failed:',
    runCheck: 'Run the connection check',
    outOfDate: (age: string) => `This scan is out of date, ${age}.`,
    shouldRefresh: (minutes: number) => `It should refresh every ${n(minutes)} min and has not.`,
    progressTitle: 'Scanning the instance',
    progressBody: (elapsed: string) =>
      `Reading the execution history of each workflow, one at a time. On a mid-sized instance this takes tens of seconds. Elapsed: ${elapsed}.`,
    showSampleMeanwhile: 'Show sample data meanwhile',
    failedTitle: 'The scan did not finish',
    runAgain: 'Run the scan again',
    showSample: 'Show sample data',
    notInScanTitle: 'Not in this scan',
    notInScanBody: (kind: 'finding' | 'workflow') =>
      `This ${kind} does not exist in the result being shown. The data source may have changed since the link was made.`,
    backToFindings: 'Back to findings',
    backToWorkflows: 'Back to workflows',
    connectLink: 'Connect your n8n',
  },

  copy: {
    copy: 'Copy',
    copied: 'Copied',
    failed: 'Select and copy',
    label: (what: string) => `Copy ${what}`,
    done: (what: string) => `${what} copied`,
    watchCommand: 'the watch command',
    setupCommand: 'the command',
  },

  filter: {
    severity: 'severity',
    check: 'check',
    status: 'status',
  },

  overview: {
    title: 'overview',
    noWorkflowsMeta: 'no workflows found',
    emptyTitle: 'No workflows to check',
    emptyBody:
      'The instance answered but has no workflows, so there is nothing to scan. Create one in n8n and press Scan now.',
    scanned: 'scanned',
    checked: (count: number) => `${plural(count, 'workflow', 'workflows')} checked`,
    resultLabel: 'Scan result',
    nothing: 'Nothing to report',
    nothingNoHistory: 'No workflow has execution history yet, so there was nothing to judge.',
    nothingPassed: (count: number) =>
      `${plural(count, 'workflow', 'workflows')} with execution history passed every check. A clean scan only covers the history the instance still holds.`,
    findingsCaption: 'findings',
    viewWorkflows: 'View workflows',
    attention: 'needs attention',
    allFindings: (count: number) => `All ${n(count)} findings`,
    openFindings: 'Open findings',
    mapTitle: 'workflow map',
    mapBody: 'One node per workflow, grouped by state. Position carries no other meaning.',
    watchTitle: 'Want alerts?',
    watchBody:
      'Run greenlight watch and it tells you when something new appears, so you do not have to look at this page. The Watching section of README.md explains where the alerts can go.',
    dismiss: 'Dismiss',
  },

  findings: {
    title: 'findings',
    shown: (visible: number, total: number) => `${n(visible)} of ${plural(total, 'finding', 'findings')} shown`,
    emptyTitle: 'Nothing to report',
    emptyBody: 'None of the checks raised a finding in this scan.',
    noMatch: 'No finding matches these filters.',
    clear: 'Clear filters',
    all: 'All findings',
    openWorkflow: (name: string) => `Open workflow ${name}`,
    evidence: 'evidence',
    about: 'about this check',
    allChecks: 'All checks',
  },

  workflows: {
    title: 'workflows',
    noWorkflowsMeta: 'no workflows found',
    emptyBody: 'The instance has no workflows yet. Create one in n8n and scan again.',
    shown: (visible: number, total: number) => `${n(visible)} of ${plural(total, 'workflow', 'workflows')} shown`,
    searchLabel: 'Filter workflows by name',
    searchPlaceholder: 'filter by name',
    noMatch: 'No workflow matches the current search and filter.',
    clear: 'Clear search and filter',
    all: 'All workflows',
    columns: {
      name: 'Workflow',
      status: 'Status',
      trigger: 'Trigger',
      lastRun: 'Last run',
      runs: 'Runs read',
      active: 'Active',
      findings: 'Findings',
    },
    caption:
      'Workflows checked in this scan. Last run is measured against the scan time. Column headers sort the table.',
    id: (id: string) => `id ${id}`,
    statusHeading: 'Status',
    facts: { trigger: 'trigger', active: 'active', runs: 'runs read', lastRun: 'last run' },
    findingsHeading: 'findings',
    noFindings: 'No check raised a finding for this workflow.',
  },

  checks: {
    title: 'checks',
    meta: 'what each check looks for and the defaults it uses',
    raises: (severity: 'critical' | 'warning') => `raises ${severity}`,
    inScan: (count: number) => `${plural(count, 'finding', 'findings')} in this scan`,
    appliesTo: 'applies to',
    question: 'Question',
    howItDecides: 'How it decides',
    whatToReview: 'What to review',
    detectors: {
      'silent-error': {
        label: 'Silent error',
        question: 'Did a step fail inside a run that reported success?',
        appliesTo: 'Active workflows with a recent successful execution',
        method:
          'Opens a sample of the most recent successful executions and reads the output of every node. A node that emits an error as ordinary data is reported, even though the run finished green. This usually happens when a step has continue on fail enabled. A workflow that is switched off is not checked, because its history may hold old failures nobody needs to act on.',
        thresholds: [
          { name: 'sample', value: '5 successful executions by default' },
          { name: 'history needed', value: 'none' },
        ],
        review:
          'Open the named node and read the error it returns. Check the credential or service behind it, then decide whether the workflow should stop on that failure instead of carrying on.',
      },
      'duration-drift': {
        label: 'Duration drift',
        question: 'Is this workflow suddenly much slower than it used to be?',
        appliesTo: 'Any workflow with enough history',
        method:
          'Compares the median run time of recent executions with the same workflow’s own history. Either condition alone reports ordinary variation, so both must hold.',
        thresholds: [
          { name: 'recent median', value: 'above the historical 95th percentile' },
          { name: 'recent median', value: 'at least twice the historical median' },
          { name: 'baseline runs', value: '10 or more' },
          { name: 'recent runs', value: '3 or more' },
        ],
        review:
          'A step is probably retrying or waiting on a downstream service before it gives up. Compare a recent slow execution with an older fast one and look for the node whose time changed.',
      },
      silence: {
        label: 'Silence',
        question: 'Has a scheduled workflow stopped running without being switched off?',
        appliesTo: 'Active workflows started by a clock',
        method:
          'Compares the time since the last run with the usual interval between runs. Workflows started by webhooks or polling triggers are not judged, because a quiet period can be normal for them.',
        thresholds: [
          { name: 'quiet for', value: 'more than 4 times the usual interval' },
          { name: 'runs needed', value: '3 or more, to learn the interval' },
        ],
        review:
          'Check that the workflow is still active and that its schedule trigger is still registered. Then look at the instance logs around the time of the last run.',
      },
      'frequency-drop': {
        label: 'Frequency drop',
        question: 'Is it still running, but far less often than before?',
        appliesTo: 'Active workflows started by a clock',
        method:
          'Counts the runs in the recent window and compares them with what the workflow’s own history predicts. A workflow that did not run at all in the window is judged by the silence check instead, which compares the gap against the workflow’s usual interval.',
        thresholds: [
          { name: 'window', value: '24 hours' },
          { name: 'reports when', value: 'fewer than half the predicted runs' },
          { name: 'baseline runs', value: '10 or more' },
        ],
        review:
          'Compare the schedule trigger as it is configured today with the cadence the history shows. An edited interval is the usual cause.',
      },
    },
  },

  setup: {
    title: 'connect your n8n',
    meta: 'GreenLight only reads. Your key stays on this computer.',
    connectHeading: 'Connect',
    connectedHeading: 'Connected',
    connectedTo: (host: string, count: number) =>
      `Connected to ${host}. ${plural(count, 'workflow', 'workflows')} found.`,
    openDashboard: 'Open the dashboard',
    changeKey: 'Change key',
    disconnect: 'Disconnect',
    disconnected: 'Disconnected. The dashboard shows sample data again.',
    notYet: 'Not connected yet. Fix the step marked Failed, then paste the key again and press Connect.',
    savedFails: 'The saved connection does not work at the moment.',
    checking: 'Checking the connection…',
    terminalSummary: 'Prefer the terminal?',
    terminalBody:
      'Open a terminal in the GreenLight folder and run this. It asks for the same two things and saves them for you.',
    steps: { ok: 'Passed', failed: 'Failed', skipped: 'Skipped' },
    notices: {
      processEnv: 'It is also set in the environment of this program, which takes precedence. Remove it there.',
    },
    form: {
      addressLabel: 'Your n8n address',
      addressPlaceholder: 'https://n8n.yourcompany.com',
      addressHelp: 'The address you type in your browser to open n8n.',
      addressInvalid: 'That does not look like a web address. Start it with https://',
      openSettings: 'Open n8n settings',
      newTab: ' (opens in a new tab)',
      keyHelpLink:
        'In n8n choose Settings, then n8n API, then Create an API key. Copy it: n8n shows it only once. A key that can only read is enough.',
      keyLabel: 'API key',
      keyPlaceholder: 'Paste the key here',
      show: 'Show',
      hide: 'Hide',
      theKey: ' the key',
      keyHelp: 'GreenLight only reads. The key is kept on this computer and is cleared from this form once sent.',
      missing: 'Fill in the address and the key.',
      connect: 'Connect',
      connecting: 'Connecting…',
    },
  },

  updates: {
    available: (latest: string) => `A new version is available: ${latest}.`,
    whatChanged: 'What changed',
    dismiss: 'Dismiss',
    settingLabel: 'Tell me about new versions',
    settingHelp:
      'Asks GitHub for the number of the latest version, at most once a day. Nothing about you or your n8n is sent. GitHub will see your IP address, like any website.',
    saving: 'Saving…',
    saved: 'Saved.',
    notSaved: 'The choice could not be saved.',
  },

  tour: {
    steps: {
      purpose: {
        title: 'What GreenLight looks for',
        body: 'Some n8n workflows finish green and still fail inside. GreenLight reads your run history and shows which ones.',
      },
      states: {
        title: 'Four states',
        body: 'Critical and warning come from the checks. Healthy means nothing was found in the history it read, which is not a guarantee. No runs is not a verdict: there was no history to judge.',
      },
      findings: {
        title: 'Findings',
        body: 'Each finding names the check, the workflow and the evidence. Open one to see the numbers and what to review.',
      },
      workflows: {
        title: 'Workflows',
        body: 'Every workflow that was checked. Sort any column, filter by state, search by name.',
      },
      checks: {
        title: 'Checks',
        body: 'What each check looks for and the defaults it uses to decide.',
      },
      keys: {
        title: 'Keyboard',
        body: 'Press g then o, f, w or c to move between sections, / to search workflows and ? to open this tour again.',
      },
    },
    position: (step: number, total: number) => `${step} of ${total}`,
    skip: 'Skip tour',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    connect: 'Connect my n8n',
    connectShort: 'Connect my n8n',
    welcomeTitle: 'Welcome to GreenLight',
    welcomeBody:
      'Some n8n workflows finish green and still fail inside. GreenLight reads your run history and shows which ones.',
    welcomeWithConnect: ' Take a one-minute tour, or connect your own n8n first.',
    welcomeTourOnly: ' Take a one-minute tour of what is on screen.',
    startTour: 'Take the 1-minute tour',
    skipWelcome: 'Skip for now',
  },

  failures: {
    hostNotAllowed: 'This host is not allowed. Open the dashboard through localhost.',
    notFromDashboard: 'This route only answers requests made from the dashboard itself.',
    settingsNotFromDashboard: 'Settings can only be changed from the dashboard itself.',
    liveNotConfigured: 'Live scanning is not configured on this server.',
    methodNotAllowed: 'That method is not allowed here.',
    notJson: 'Send the request as JSON.',
    rateLimited: (seconds: number) => `Too many attempts. Try again in ${plural(seconds, 'second', 'seconds')}.`,
    tooLarge: 'The request is too large.',
    notUnderstood: 'The request was not understood.',
    fieldsMissing: 'Enter the address of your n8n and the key.',
    fieldsTooLong: 'The address or the key is too long.',
    fieldsControl: 'The address or the key contains a line break or another character that cannot be saved.',
    envSymlink: 'The .env file is a symbolic link, which GreenLight does not follow. Use a regular file.',
    envNotFile: 'The .env entry is not a regular file.',
    envTooLarge: 'The .env file is larger than 64 KiB, which is not a settings file.',
    envUnreadable: 'The .env file cannot be read.',
    settingsUnreadable: 'The settings could not be read.',
    saveFailed: 'The settings could not be saved.',
    checkFailed: 'The connection check failed.',
    scanTooSoon: (seconds: number) => `A scan ran moments ago. Try again in ${plural(seconds, 'second', 'seconds')}.`,
    serverSilent: 'The dashboard server did not answer. Check that it is still running.',
    serverStatus: 'The dashboard server answered with an error.',
    invalidAnswer: 'The dashboard server sent an answer this page could not read.',
    scanFailed: 'The scan could not finish.',
    scanUnresolved: 'The scan could not finish: the address of the instance could not be resolved.',
    scanRefused: 'The scan could not finish: nothing is listening at the address of the instance.',
    scanTimeout: 'The scan could not finish: the instance took too long to answer.',
    scanCertificate: 'The scan could not finish: the HTTPS certificate of the instance is not trusted.',
    scanRejectedKey: 'The scan could not finish: the instance rejected the API key.',
    scanForbidden: 'The scan could not finish: the API key is not allowed to read what GreenLight needs.',
    scanNotFound: 'The scan could not finish: there is no n8n API at the address of the instance.',
    scanServerError: 'The scan could not finish: the instance answered with an error.',
  },
};

export type Messages = typeof en;
