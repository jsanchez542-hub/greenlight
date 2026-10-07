import type { Messages } from './en.js';

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

export const es: Messages = {
  cli: {
    usage: `GreenLight  revisa una instancia de n8n y encuentra los workflows que fallan sin avisar.

  greenlight init                     configuración guiada: conecta con tu n8n y guarda .env
  greenlight doctor                   comprueba la conexión paso a paso e indica qué corregir
  greenlight [--json]                 analiza una vez e imprime el informe
  greenlight --version                imprime la versión
  greenlight watch [--once]           analiza cada cierto tiempo y avisa cuando aparece algo nuevo

Los ajustes se leen del entorno y de un archivo .env en la carpeta actual.
Al ejecutar greenlight init, ese archivo se crea por ti.

Entorno:
  N8N_BASE_URL                dirección de la instancia de n8n
  N8N_API_KEY                 clave de API con permiso de lectura
  GREENLIGHT_EXECUTION_LIMIT  ejecuciones que se leen por workflow (por defecto 200)
  GREENLIGHT_DETAIL_SAMPLE    ejecuciones que se revisan nodo a nodo (por defecto 5)
  GREENLIGHT_ALLOW_INSECURE_HTTP  con 1 envía la clave por http sin cifrar a un servidor público (no recomendado)
  GREENLIGHT_LANG             "en" o "es"; por defecto, el idioma de este equipo
  GREENLIGHT_CHECK_UPDATES    con 1 te avisa cuando hay una versión nueva (desactivado por defecto, ver el README)

Solo para watch:
  GREENLIGHT_WEBHOOK_URL      donde se publican las alertas en JSON (opcional; sin él, los cambios solo se muestran)
  GREENLIGHT_WEBHOOK_TOKEN    se envía como "Authorization: Bearer <token>" (opcional)
  GREENLIGHT_INTERVAL_MINUTES minutos entre análisis (por defecto 5)
  GREENLIGHT_NOTIFY_MIN       "warning" (por defecto) o "critical"
  GREENLIGHT_STATE_FILE       recuerda lo que ya se avisó (por defecto .greenlight-state.json)

Códigos de salida: 0 sin hallazgos, 1 con hallazgos, 2 el análisis no pudo ejecutarse.
Con watch --once son los mismos, así que sirve para cron o cualquier programador de tareas.
`,
    envFileUnreadable: (path, reason) => `No se pudo leer ${path}: ${reason}`,
    unknownError: 'error desconocido',
    doctorHeading: (version, host) => `GreenLight ${version}  doctor${host === null ? '' : `  ${host}`}`,
    doctorOk: 'Todo lo necesario está en orden.',
    doctorFix: 'Ejecuta greenlight init para corregir los ajustes.',
    watching: (instance, minutes, hasWebhook) =>
      `Vigilando ${instance} cada ${minutes} min. ${
        hasWebhook ? 'Las alertas van al webhook.' : 'No hay webhook configurado: los cambios solo se muestran aquí.'
      }`,
    updateAvailable: (current, latest, url) =>
      `Hay una versión nueva: ${latest} (tienes la ${current}). Qué ha cambiado: ${url}`,
  },

  runtime: {
    nodeTooOld: (needed, found) =>
      `GreenLight necesita Node.js ${needed} o superior y este equipo tiene ${found}. Instala la versión LTS actual desde https://nodejs.org y vuelve a ejecutar el comando.`,
  },

  config: {
    missingConnection:
      'Faltan N8N_BASE_URL y N8N_API_KEY. Ejecuta greenlight init para una configuración guiada, o defínelas en el entorno o en un archivo .env.',
    notPositive: (name, raw) => `${name} debe ser un número entero positivo y se recibió "${raw}".`,
    badSeverity: (raw) => `GREENLIGHT_NOTIFY_MIN debe ser "warning" o "critical" y se recibió "${raw}".`,
    badWebhook: 'GREENLIGHT_WEBHOOK_URL debe ser una dirección http o https válida.',
  },

  report: {
    scanned: (workflows) => `${plural(workflows, 'workflow analizado', 'workflows analizados')}`,
    nothing: 'sin hallazgos',
    summary: (count, critical) =>
      `${plural(count, 'hallazgo', 'hallazgos')}, ${plural(critical, 'crítico', 'críticos')}`,
    severity: { critical: 'CRÍTICO', warning: 'ADVERTENCIA' },
  },

  client: {
    insecureHttp:
      'Esa dirección empieza por http y es accesible desde internet, así que la clave de API viajaría sin cifrar. Usa la versión https de la dirección. (Avanzado: GREENLIGHT_ALLOW_INSECURE_HTTP=1 lo permite igualmente.)',
    apiStatus: (status, path) =>
      `La API de n8n respondió ${status} en ${path}. Revisa N8N_BASE_URL y N8N_API_KEY.`,
    tooManyRedirects: (path) =>
      `La API de n8n envió demasiadas redirecciones en ${path}. Usa la dirección final en N8N_BASE_URL.`,
    unusableRedirect: (path) =>
      `La API de n8n envió una redirección inutilizable en ${path}. Usa la dirección final en N8N_BASE_URL.`,
    otherHost: (path) =>
      `La API de n8n redirigió a otro servidor en ${path}, por eso la clave de API no se envió allí. Usa la dirección final en N8N_BASE_URL.`,
    httpsToHttp: (path) =>
      `La API de n8n redirigió de https a http en ${path}, lo que enviaría la clave de API sin cifrar. Revisa la configuración HTTPS de la instancia.`,
  },

  diagnose: {
    labels: {
      address: 'La dirección es válida',
      reach: 'La instancia responde',
      authenticate: 'La clave de API es aceptada',
      executions: 'El historial de ejecuciones se puede leer',
    },
    skipped: 'Omitido porque falló un paso anterior.',
    noAddress: {
      detail: 'No se indicó ninguna dirección.',
      hint: 'Usa la dirección con la que abres n8n, por ejemplo https://n8n.ejemplo.com.',
    },
    invalidAddress: {
      detail: 'Eso no es una dirección web válida.',
      hint: 'Escríbela completa, con https:// al principio, por ejemplo https://n8n.ejemplo.com.',
    },
    badProtocol: {
      detail: 'La dirección debe empezar por http:// o https://.',
      hint: 'Por ejemplo https://n8n.ejemplo.com.',
    },
    hasCredentials: {
      detail: 'La dirección incluye un usuario o una contraseña.',
      hint: 'Quítalos. La clave de API se pide por separado.',
    },
    hasApiPath: {
      detail: 'La dirección termina en /api/v1.',
      hint: 'Usa solo la dirección de n8n, por ejemplo https://n8n.ejemplo.com. GreenLight añade el resto.',
    },
    insecurePublic: { detail: 'La dirección usa http en un servidor público.' },
    addressOk: 'La dirección es válida.',
    insecureAllowed: 'Se permitió http sin cifrar a petición tuya: la clave de API viaja sin cifrar.',
    privateHttp: 'Usa http en una red privada, así que la clave no va cifrada. Es aceptable si confías en esa red.',
    noKeyReach: 'No se indicó la clave de API, así que no se contactó con la instancia.',
    noKey: {
      detail: 'No se indicó la clave de API.',
      hint: 'En n8n abre Settings, luego n8n API, y crea una clave. Cópiala cuando aparezca: n8n solo la muestra una vez.',
    },
    reached: 'La instancia respondió.',
    timeout: {
      detail: (seconds) => `La instancia no respondió en ${seconds} segundos.`,
      hint: 'Comprueba que la dirección es accesible desde este equipo y que nada la bloquea, como un cortafuegos o una VPN.',
    },
    unresolved: {
      detail: 'No se pudo resolver la dirección.',
      hint: 'Revisa cómo está escrito el dominio y que este equipo tiene conexión a internet.',
    },
    refused: {
      detail: 'No hay nada escuchando en esa dirección y ese puerto.',
      hint: 'Comprueba que n8n está en marcha y que el puerto es el que usa.',
    },
    untrustedCertificate: {
      detail: 'El certificado HTTPS de la instancia no es de confianza.',
      hint: 'El candado de esa dirección no es uno en el que este equipo confíe. Si es tu propio servidor, instala un certificado válido (uno gratuito de Let\'s Encrypt sirve). Avanzado: con un certificado autofirmado, define NODE_EXTRA_CA_CERTS con la ruta de tu archivo de certificado.',
    },
    connectionFailed: {
      detail: 'La conexión falló antes de recibir respuesta.',
      hint: (technical) => `Revisa la dirección y tu red. Detalle técnico: ${technical}.`,
    },
    status401: {
      detail: 'La instancia rechazó la clave de API.',
      hint: 'En n8n abre Settings, luego n8n API, y crea una clave nueva. Cópiala cuando aparezca: n8n solo la muestra una vez.',
    },
    status403: {
      detail: 'La clave de API es válida, pero no tiene permiso para leer workflows.',
      hint: 'Crea una clave que pueda leer workflows y ejecuciones. GreenLight nunca escribe, así que basta con una de solo lectura.',
    },
    status404: {
      detail: 'La dirección respondió, pero ahí no hay una API de n8n.',
      hint: 'Usa la dirección con la que abres n8n, sin /api/v1 al final. Si es correcta, puede que la API de n8n esté desactivada en ese servidor: actívala e inténtalo de nuevo.',
    },
    redirect: {
      detail: 'La dirección redirige a un sitio que GreenLight no seguirá.',
      hint: 'Esa dirección envía a quien la visita a otra parte. Usa la dirección en la que acabas, normalmente la que empieza por https.',
    },
    serverError: {
      detail: (status) => `La instancia respondió con un error (HTTP ${status}).`,
      hint: 'Inténtalo de nuevo en un momento. Si persiste, revisa los registros de la instancia.',
    },
    keyWorks: (count) =>
      `La clave funciona y ${count === 1 ? 'se ve 1 workflow' : `se ven ${count} workflows`}.`,
    executionsDenied: 'La clave de API no puede leer ejecuciones y GreenLight las necesita.',
    executionsFailed: 'No se pudo leer el historial de ejecuciones.',
    executionsHint:
      'Crea una clave que pueda leer ejecuciones además de workflows. Sin historial no hay nada que comparar.',
    executionsOk: 'El historial de ejecuciones se puede leer.',
  },

  init: {
    marks: { ok: '[ok]   ', failed: '[fallo]', skipped: '[omit] ' },
    title: 'Configuración de GreenLight',
    intro: [
      'Esto conecta GreenLight con tu instancia de n8n. Solo lee: workflows e historial',
      'de ejecuciones. Nunca crea, modifica ni borra nada.',
      '',
      'Necesitas una clave de API. En n8n abre Settings, luego n8n API, y crea una.',
      'Con permiso de lectura basta. Cópiala cuando aparezca: n8n solo la muestra una vez.',
      '',
    ],
    askAddress: 'Dirección de n8n, por ejemplo https://n8n.ejemplo.com',
    askKey: 'Clave de API',
    askKeySaved: 'Clave de API (pulsa Intro para mantener la guardada)',
    askKeyTyped: 'Clave de API (pulsa Intro para mantener la que escribiste)',
    checking: 'Comprobando la conexión...',
    tryAgain: '¿Quieres intentarlo de nuevo?',
    notSavedRetry: 'No se guardó nada. Vuelve a ejecutar la configuración cuando quieras.',
    webhookIntro: [
      'Opcional: GreenLight puede publicar una alerta en un webhook cuando aparezca algo nuevo',
      '(consulta "Vigilar" en el README). Pega su dirección o pulsa Intro para omitirlo.',
    ],
    askWebhook: 'Dirección del webhook de alertas',
    askWebhookAgain: 'Dirección del webhook de alertas (Intro para omitir)',
    badWebhook: 'Esa no es una dirección http o https válida.',
    webhookHttp: 'Aviso: esa dirección usa http, así que las alertas y el token viajan sin cifrar. Es mejor https.',
    askToken: 'Token del webhook (Intro si no tiene)',
    updatesIntro: [
      'Opcional: GreenLight puede avisarte cuando haya una versión nueva. Consulta a GitHub el',
      'número de la última versión publicada, más o menos una vez al día. No envía nada sobre ti ni sobre tu n8n.',
    ],
    askUpdates: '¿Quieres que te avise de las versiones nuevas?',
    confirmSave: (path) => `¿Guardar estos ajustes en ${path}?`,
    notSaved: 'No se guardó nada.',
    saved: (path) => `Guardado en ${path}. Contiene tu clave de API: mantenlo en privado y no lo subas a ningún repositorio.`,
    next: [
      'Qué sigue:',
      '  Analizar una vez y leer el informe   greenlight            (desde un clon: npm run scan)',
      '  Vigilar y recibir alertas            greenlight watch      (desde un clon: npm run watch)',
      '  Abrir el panel                       npm run panel',
      '  Volver a comprobar la conexión       greenlight doctor',
    ],
    cancelled: 'Configuración cancelada.',
    yesNo: { yes: '[S/n]', no: '[s/N]' },
  },

  watch: {
    newFinding: (severity, name, detector) => `NUEVO ${severity} ${name} (${detector})`,
    resolvedFinding: (name, detector) => `RESUELTO ${name} (${detector})`,
    cycle: (workflows, open, added, resolved) =>
      `${plural(workflows, 'workflow analizado', 'workflows analizados')}: ${plural(open, 'abierto', 'abiertos')}, ${plural(added, 'nuevo', 'nuevos')}, ${plural(resolved, 'resuelto', 'resueltos')}.`,
    notDelivered: (reason) => `No se entregó la alerta, se reintentará en el próximo análisis: ${reason}`,
    scanFailed: (failures, reason) => `El análisis falló (${failures} seguidos): ${reason}`,
    stateUnreadable: (path) => `No se pudo leer ${path}; se empieza sin historial.`,
    stateForeign: (path) => `${path} no es un archivo de estado de GreenLight; se empieza sin historial.`,
  },

  alert: {
    newFindings: (count, critical, instance) =>
      `GreenLight: ${
        critical === count
          ? plural(count, 'hallazgo crítico nuevo', 'hallazgos críticos nuevos')
          : plural(count, 'hallazgo nuevo', 'hallazgos nuevos')
      } en ${instance}`,
    resolvedFindings: (count, instance) =>
      `GreenLight: ${plural(count, 'hallazgo resuelto', 'hallazgos resueltos')} en ${instance}`,
    resolvedHeading: 'Resueltos:',
    failingSubject: (instance) => `GreenLight no puede analizar ${instance}`,
    failingText: (failures) =>
      `${failures === 1 ? 'El último análisis falló' : `Los últimos ${failures} análisis fallaron`}, así que no se está revisando nada. Comprueba que la instancia es accesible y que la clave de API sigue siendo válida.`,
    recoveredSubject: (instance) => `GreenLight vuelve a analizar ${instance}`,
    recoveredText: 'La instancia respondió y el análisis se ha reanudado.',
    severity: { critical: 'CRÍTICO', warning: 'ADVERTENCIA' },
    webhookUnreachable: (reason) => `No se pudo contactar con el webhook: ${reason}`,
    webhookStatus: (status) => `El webhook respondió HTTP ${status}.`,
  },

  update: {
    notice: (latest) => `Hay disponible una versión nueva: ${latest}.`,
  },
};
