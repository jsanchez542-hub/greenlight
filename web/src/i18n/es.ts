import type { Messages } from './en';

const numbers = new Intl.NumberFormat('es');
const n = (value: number): string => numbers.format(value);
const plural = (count: number, one: string, many: string): string => `${n(count)} ${count === 1 ? one : many}`;

export const es: Messages = {
  meta: {
    title: 'GreenLight',
    defaultTitle: 'GreenLight: resultados del análisis de tus workflows de n8n',
    description:
      'Errores silenciosos, ralentizaciones, silencios y programaciones perdidas en los workflows de n8n, leídos a partir de un análisis de la instancia.',
    pages: {
      overview: {
        title: 'Resumen',
        description: 'El estado de cada workflow de n8n en el último análisis y qué requiere atención primero.',
      },
      findings: {
        title: 'Hallazgos',
        description: 'Todos los hallazgos del último análisis, filtrados por severidad y por comprobación.',
      },
      finding: {
        title: 'Hallazgo',
        description: 'La evidencia de un hallazgo y qué revisar.',
      },
      workflows: {
        title: 'Workflows',
        description: 'Todos los workflows analizados, con su estado, su disparador y su última ejecución.',
      },
      workflow: {
        title: 'Workflow',
        description: 'El estado de un workflow y los hallazgos que generó.',
      },
      checks: {
        title: 'Comprobaciones',
        description: 'Qué busca cada comprobación y los valores por defecto que usa para decidir.',
      },
      setup: {
        title: 'Conecta tu n8n',
        description: 'Conecta GreenLight con tu n8n con una dirección y una clave de API. Solo lee.',
      },
    },
  },

  notFound: {
    title: 'Página no encontrada',
    body: 'No hay nada en esta dirección. Puede que el enlace sea antiguo o tenga un error.',
    home: 'Ir al resumen',
  },

  nav: {
    primary: 'Principal',
    sections: 'Secciones',
    location: 'Ubicación',
    skip: 'Saltar al contenido',
    labels: { overview: 'Resumen', findings: 'Hallazgos', workflows: 'Workflows', checks: 'Comprobaciones' },
    tabs: { overview: 'Resumen', findings: 'Hallazgos', workflows: 'Workflows', checks: 'Comprobar' },
    pages: {
      overview: 'resumen',
      findings: 'hallazgos',
      workflows: 'workflows',
      checks: 'comprobaciones',
      setup: 'conexión',
      notFound: 'no encontrada',
    },
    sources: { live: 'en vivo', sample: 'ejemplo' },
    sectionTitle: (label, key) => `${label} (g ${key})`,
  },

  sidebar: {
    connect: 'Conectar',
    connected: 'Conectado',
    notConnected: 'sin conexión',
    connectedTitle: (host) => `Conectado a ${host ?? 'tu n8n'}`,
    connectTitle: 'Conecta tu n8n',
    source: 'origen',
    scanned: 'analizado',
    liveInstance: 'Instancia en vivo',
    sampleData: 'Datos de ejemplo',
    shortcutsGo: 'luego',
    shortcutsSearch: 'buscar workflows',
    tour: 'Hacer el recorrido',
    tourTitle: 'Hacer el recorrido (?)',
    collapse: 'Contraer',
    collapseLabel: 'Contraer la barra lateral',
    expandLabel: 'Expandir la barra lateral',
    connectHint: 'Puedes conectar tu n8n cuando quieras desde aquí.',
    connectHintDismiss: 'Entendido',
  },

  top: {
    sample: 'Datos de ejemplo',
    notLive: '· no es una instancia real',
    sourceGroup: 'Origen de los datos',
    liveFull: 'En vivo',
    liveShort: 'En vivo',
    sampleFull: 'Datos de ejemplo',
    sampleShort: 'Ejemplo',
    scanNow: 'Analizar ahora',
    scanning: 'Analizando',
    refreshing: 'actualizando',
    scanned: 'analizado',
  },

  theme: {
    system: 'Sistema',
    light: 'Claro',
    dark: 'Oscuro',
    prefix: 'Tema',
    systemNow: (now) => `Sistema, ahora ${now}`,
    button: (current, next) => `Tema: ${current}. Cambiar a ${next.toLowerCase()}.`,
  },

  language: {
    group: 'Language / Idioma',
    english: 'English',
    spanish: 'Español',
  },

  age: {
    justNow: 'ahora mismo',
    minutes: (count) => `hace ${n(count)} min`,
    hours: (count) => `hace ${n(count)} h`,
    days: (count) => `hace ${plural(count, 'día', 'días')}`,
    atScan: 'En el momento del análisis',
    minutesBefore: (count) => `${n(count)} min antes del análisis`,
    hoursBefore: (count) => `${n(count)} h antes del análisis`,
    daysBefore: (count) => `${plural(count, 'día', 'días')} antes del análisis`,
  },

  count: {
    workflows: (count) => plural(count, 'workflow', 'workflows'),
    findings: (count) => plural(count, 'hallazgo', 'hallazgos'),
  },

  status: {
    health: {
      critical: { label: 'Crítico', meaning: 'Al menos una comprobación generó un hallazgo crítico.' },
      warning: {
        label: 'Advertencia',
        meaning: 'Al menos una comprobación generó una advertencia y ninguna generó un hallazgo crítico.',
      },
      healthy: {
        label: 'Saludable',
        meaning: 'Se leyó el historial y ninguna comprobación encontró nada. No es una garantía.',
      },
      'no-runs': {
        label: 'Sin ejecuciones',
        meaning: 'La instancia no tiene historial de ejecuciones de este workflow, así que no se pudo evaluar nada.',
      },
    },
    severity: { critical: 'Crítico', warning: 'Advertencia' },
    severityCount: (severity, count) =>
      severity === 'critical'
        ? plural(count, 'crítico', 'críticos')
        : plural(count, 'advertencia', 'advertencias'),
    trigger: {
      schedule: { label: 'Programado', meaning: 'Se inicia por una programación de tiempo' },
      event: {
        label: 'Evento',
        meaning: 'Se inicia por cualquier otra cosa, como un webhook o un disparador de sondeo',
      },
    },
    yes: 'sí',
    no: 'no',
    noRuns: 'sin ejecuciones registradas',
    all: 'todos',
  },

  scan: {
    settingsBroken: 'No se puede usar el archivo de ajustes.',
    settingsFix: 'Corrígelo y recarga la página.',
    invented: 'Estos workflows son inventados.',
    chooseLive: ' Elige En vivo para ver los tuyos.',
    connectToSee: 'Conecta tu n8n para ver los tuyos.',
    lastGood: (age) => `Se muestra el último análisis correcto${age === null ? '' : `, ${age}`}.`,
    attemptFailed: 'El último intento falló:',
    runCheck: 'Comprobar la conexión',
    outOfDate: (age) => `Este análisis está desactualizado, ${age}.`,
    shouldRefresh: (minutes) => `Debería actualizarse cada ${n(minutes)} min y no lo ha hecho.`,
    progressTitle: 'Analizando la instancia',
    progressBody: (elapsed) =>
      `Leyendo el historial de ejecuciones de cada workflow, uno por uno. En una instancia mediana tarda decenas de segundos. Tiempo transcurrido: ${elapsed}.`,
    showSampleMeanwhile: 'Mientras tanto, ver datos de ejemplo',
    failedTitle: 'El análisis no terminó',
    runAgain: 'Repetir el análisis',
    showSample: 'Ver datos de ejemplo',
    notInScanTitle: 'No está en este análisis',
    notInScanBody: (kind) =>
      `${kind === 'finding' ? 'Este hallazgo no existe' : 'Este workflow no existe'} en el resultado que se muestra. Puede que el origen de los datos haya cambiado desde que se creó el enlace.`,
    backToFindings: 'Volver a hallazgos',
    backToWorkflows: 'Volver a workflows',
    connectLink: 'Conecta tu n8n',
  },

  copy: {
    copy: 'Copiar',
    copied: 'Copiado',
    failed: 'Selecciona y copia',
    label: (what) => `Copiar ${what}`,
    done: (what) => `Copiado: ${what}`,
    watchCommand: 'el comando watch',
    setupCommand: 'el comando',
  },

  filter: {
    severity: 'severidad',
    check: 'comprobación',
    status: 'estado',
  },

  overview: {
    title: 'resumen',
    noWorkflowsMeta: 'no se encontró ningún workflow',
    emptyTitle: 'No hay workflows que analizar',
    emptyBody:
      'La instancia respondió, pero no tiene workflows, así que no hay nada que analizar. Crea uno en n8n y pulsa Analizar ahora.',
    scanned: 'analizado',
    checked: (count) => `${plural(count, 'workflow analizado', 'workflows analizados')}`,
    resultLabel: 'Resultado del análisis',
    nothing: 'Sin hallazgos',
    nothingNoHistory: 'Ningún workflow tiene historial de ejecuciones todavía, así que no había nada que evaluar.',
    nothingPassed: (count) =>
      `${count === 1 ? '1 workflow con historial de ejecuciones pasó' : `${n(count)} workflows con historial de ejecuciones pasaron`} todas las comprobaciones. Un análisis sin hallazgos solo cubre el historial que la instancia conserva.`,
    findingsCaption: 'hallazgos',
    viewWorkflows: 'Ver workflows',
    attention: 'requieren atención',
    allFindings: (count) => `Ver los ${n(count)} hallazgos`,
    openFindings: 'Abrir hallazgos',
    mapTitle: 'mapa de workflows',
    mapBody: 'Un nodo por workflow, agrupados por estado. La posición no significa nada más.',
    watchTitle: '¿Quieres alertas?',
    watchBody:
      'Ejecuta greenlight watch y te avisa cuando aparece algo nuevo, así no tienes que mirar esta página. La sección Watching del README.md explica adónde pueden ir las alertas.',
    dismiss: 'Descartar',
  },

  findings: {
    title: 'hallazgos',
    shown: (visible, total) =>
      `${n(visible)} de ${plural(total, 'hallazgo', 'hallazgos')} ${visible === 1 ? 'mostrado' : 'mostrados'}`,
    emptyTitle: 'Sin hallazgos',
    emptyBody: 'Ninguna comprobación generó hallazgos en este análisis.',
    noMatch: 'Ningún hallazgo coincide con estos filtros.',
    clear: 'Quitar filtros',
    all: 'Todos los hallazgos',
    openWorkflow: (name) => `Abrir el workflow ${name}`,
    evidence: 'evidencia',
    about: 'sobre esta comprobación',
    allChecks: 'Todas las comprobaciones',
  },

  workflows: {
    title: 'workflows',
    noWorkflowsMeta: 'no se encontró ningún workflow',
    emptyBody: 'La instancia todavía no tiene workflows. Crea uno en n8n y vuelve a analizar.',
    shown: (visible, total) =>
      `${n(visible)} de ${plural(total, 'workflow', 'workflows')} ${visible === 1 ? 'mostrado' : 'mostrados'}`,
    searchLabel: 'Filtrar workflows por nombre',
    searchPlaceholder: 'filtrar por nombre',
    noMatch: 'Ningún workflow coincide con la búsqueda y el filtro actuales.',
    clear: 'Quitar búsqueda y filtro',
    all: 'Todos los workflows',
    columns: {
      name: 'Workflow',
      status: 'Estado',
      trigger: 'Disparador',
      lastRun: 'Última ejecución',
      runs: 'Ejecuciones leídas',
      active: 'Activo',
      findings: 'Hallazgos',
    },
    caption:
      'Workflows analizados en este análisis. La última ejecución se mide respecto al momento del análisis. Las cabeceras de columna ordenan la tabla.',
    id: (id) => `id ${id}`,
    statusHeading: 'Estado',
    facts: { trigger: 'disparador', active: 'activo', runs: 'ejecuciones leídas', lastRun: 'última ejecución' },
    findingsHeading: 'hallazgos',
    noFindings: 'Ninguna comprobación generó hallazgos para este workflow.',
  },

  checks: {
    title: 'comprobaciones',
    meta: 'qué busca cada comprobación y los valores por defecto que usa',
    raises: (severity) => (severity === 'critical' ? 'genera críticos' : 'genera advertencias'),
    inScan: (count) => `${plural(count, 'hallazgo', 'hallazgos')} en este análisis`,
    appliesTo: 'se aplica a',
    question: 'Pregunta',
    howItDecides: 'Cómo decide',
    whatToReview: 'Qué revisar',
    detectors: {
      'silent-error': {
        label: 'Error silencioso',
        question: '¿Falló un paso dentro de una ejecución que informó éxito?',
        appliesTo: 'Workflows activos con una ejecución correcta reciente',
        method:
          'Abre una muestra de las ejecuciones correctas más recientes y lee la salida de cada nodo. Si un nodo emite un error como si fuera un dato normal, se señala aunque la ejecución haya terminado en verde. Suele ocurrir cuando un paso tiene activada la opción de continuar si falla. Un workflow desactivado no se revisa, porque su historial puede contener fallos antiguos sobre los que nadie necesita actuar.',
        thresholds: [
          { name: 'muestra', value: '5 ejecuciones correctas por defecto' },
          { name: 'historial necesario', value: 'ninguno' },
        ],
        review:
          'Abre el nodo indicado y lee el error que devuelve. Revisa la credencial o el servicio que hay detrás y decide si el workflow debería detenerse ante ese fallo en lugar de seguir adelante.',
      },
      'duration-drift': {
        label: 'Ralentización',
        question: '¿Este workflow es de repente mucho más lento que antes?',
        appliesTo: 'Cualquier workflow con historial suficiente',
        method:
          'Compara el tiempo mediano de las ejecuciones recientes con el historial del propio workflow. Cada condición por separado señalaría variaciones normales, así que deben cumplirse las dos.',
        thresholds: [
          { name: 'mediana reciente', value: 'por encima del percentil 95 histórico' },
          { name: 'mediana reciente', value: 'al menos el doble de la mediana histórica' },
          { name: 'ejecuciones de referencia', value: '10 o más' },
          { name: 'ejecuciones recientes', value: '3 o más' },
        ],
        review:
          'Probablemente un paso está reintentando o esperando a un servicio externo antes de rendirse. Compara una ejecución lenta reciente con una rápida antigua y busca el nodo cuyo tiempo cambió.',
      },
      silence: {
        label: 'Silencio',
        question: '¿Un workflow programado dejó de ejecutarse sin haberse desactivado?',
        appliesTo: 'Workflows activos que se inician por programación',
        method:
          'Compara el tiempo desde la última ejecución con el intervalo habitual entre ejecuciones. Los workflows iniciados por webhooks o por disparadores de sondeo no se evalúan, porque para ellos un periodo tranquilo puede ser normal.',
        thresholds: [
          { name: 'sin ejecutarse', value: 'más de 4 veces el intervalo habitual' },
          { name: 'ejecuciones necesarias', value: '3 o más, para aprender el intervalo' },
        ],
        review:
          'Comprueba que el workflow sigue activo y que su disparador programado sigue registrado. Después revisa los registros de la instancia en torno a la hora de la última ejecución.',
      },
      'frequency-drop': {
        label: 'Caída de frecuencia',
        question: '¿Sigue ejecutándose, pero con mucha menos frecuencia que antes?',
        appliesTo: 'Workflows activos que se inician por programación',
        method:
          'Cuenta las ejecuciones de la ventana reciente y las compara con lo que predice el historial del propio workflow. Un workflow que no se ejecutó ni una vez en la ventana lo juzga la comprobación de silencio, que compara el tiempo sin ejecutarse con el intervalo habitual del workflow.',
        thresholds: [
          { name: 'ventana', value: '24 horas' },
          { name: 'señala cuando', value: 'menos de la mitad de las ejecuciones previstas' },
          { name: 'ejecuciones de referencia', value: '10 o más' },
        ],
        review:
          'Compara el disparador programado tal como está configurado hoy con el ritmo que muestra el historial. Un intervalo editado suele ser la causa.',
      },
    },
  },

  setup: {
    title: 'conecta tu n8n',
    meta: 'GreenLight solo lee. Tu clave se queda en este equipo.',
    connectHeading: 'Conectar',
    connectedHeading: 'Conectado',
    connectedTo: (host, count) =>
      `Conectado a ${host}. ${count === 1 ? '1 workflow encontrado' : `${n(count)} workflows encontrados`}.`,
    openDashboard: 'Abrir el panel',
    changeKey: 'Cambiar la clave',
    disconnect: 'Desconectar',
    disconnected: 'Desconectado. El panel vuelve a mostrar datos de ejemplo.',
    notYet:
      'Todavía no estás conectado. Corrige el paso marcado como Fallido, vuelve a pegar la clave y pulsa Conectar.',
    savedFails: 'La conexión guardada no funciona en este momento.',
    checking: 'Comprobando la conexión…',
    terminalSummary: '¿Prefieres la terminal?',
    terminalBody:
      'Abre una terminal en la carpeta de GreenLight y ejecuta esto. Te pide los mismos dos datos y los guarda por ti.',
    steps: { ok: 'Correcto', failed: 'Fallido', skipped: 'Omitido' },
    notices: {
      processEnv: 'También está definida en el entorno de este programa, que tiene prioridad. Quítala allí.',
    },
    form: {
      addressLabel: 'La dirección de tu n8n',
      addressPlaceholder: 'https://n8n.tuempresa.com',
      addressHelp: 'La dirección que escribes en el navegador para abrir n8n.',
      addressInvalid: 'Eso no parece una dirección web. Empieza por https://',
      openSettings: 'Abrir los ajustes de n8n',
      newTab: ' (se abre en una pestaña nueva)',
      keyHelpLink:
        'En n8n elige Settings, luego n8n API y después Create an API key. Cópiala: n8n la muestra una sola vez. Basta con una clave que solo pueda leer.',
      keyLabel: 'Clave de API',
      keyPlaceholder: 'Pega aquí la clave',
      show: 'Mostrar',
      hide: 'Ocultar',
      theKey: ' la clave',
      keyHelp: 'GreenLight solo lee. La clave se guarda en este equipo y se borra de este formulario al enviarla.',
      missing: 'Escribe la dirección y la clave.',
      connect: 'Conectar',
      connecting: 'Conectando…',
    },
  },

  updates: {
    available: (latest) => `Hay una versión nueva: ${latest}.`,
    whatChanged: 'Qué ha cambiado',
    dismiss: 'Descartar',
    settingLabel: 'Avisarme de las versiones nuevas',
    settingHelp:
      'Consulta a GitHub el número de la última versión, como mucho una vez al día. No se envía nada sobre ti ni sobre tu n8n. GitHub verá tu dirección IP, como cualquier web.',
    saving: 'Guardando…',
    saved: 'Guardado.',
    notSaved: 'No se pudo guardar la elección.',
  },

  tour: {
    steps: {
      purpose: {
        title: 'Qué busca GreenLight',
        body: 'Algunos workflows de n8n terminan en verde y aun así fallan por dentro. GreenLight lee tu historial de ejecuciones y te muestra cuáles.',
      },
      states: {
        title: 'Cuatro estados',
        body: 'Crítico y advertencia salen de las comprobaciones. Saludable significa que no se encontró nada en el historial leído, lo que no es una garantía. Sin ejecuciones no es un veredicto: no había historial que evaluar.',
      },
      findings: {
        title: 'Hallazgos',
        body: 'Cada hallazgo indica la comprobación, el workflow y la evidencia. Abre uno para ver las cifras y qué revisar.',
      },
      workflows: {
        title: 'Workflows',
        body: 'Todos los workflows analizados. Ordena cualquier columna, filtra por estado y busca por nombre.',
      },
      checks: {
        title: 'Comprobaciones',
        body: 'Qué busca cada comprobación y los valores por defecto que usa para decidir.',
      },
      keys: {
        title: 'Teclado',
        body: 'Pulsa g y luego o, f, w o c para moverte entre secciones, / para buscar workflows y ? para volver a abrir este recorrido.',
      },
    },
    position: (step, total) => `${step} de ${total}`,
    skip: 'Omitir el recorrido',
    back: 'Atrás',
    next: 'Siguiente',
    done: 'Listo',
    connect: 'Conectar mi n8n',
    connectShort: 'Conectar',
    welcomeTitle: 'Te damos la bienvenida a GreenLight',
    welcomeBody:
      'Algunos workflows de n8n terminan en verde y aun así fallan por dentro. GreenLight lee tu historial de ejecuciones y te muestra cuáles.',
    welcomeWithConnect: ' Haz un recorrido de un minuto o conecta primero tu propio n8n.',
    welcomeTourOnly: ' Haz un recorrido de un minuto por lo que hay en pantalla.',
    startTour: 'Hacer el recorrido de 1 minuto',
    skipWelcome: 'Ahora no',
  },

  failures: {
    hostNotAllowed: 'Este host no está permitido. Abre el panel desde localhost.',
    notFromDashboard: 'Esta ruta solo responde a peticiones hechas desde el propio panel.',
    settingsNotFromDashboard: 'Los ajustes solo se pueden cambiar desde el propio panel.',
    liveNotConfigured: 'El análisis en vivo no está configurado en este servidor.',
    methodNotAllowed: 'Ese método no está permitido aquí.',
    notJson: 'Envía la petición como JSON.',
    rateLimited: (seconds) => `Demasiados intentos. Prueba de nuevo en ${plural(seconds, 'segundo', 'segundos')}.`,
    tooLarge: 'La petición es demasiado grande.',
    notUnderstood: 'No se entendió la petición.',
    fieldsMissing: 'Escribe la dirección de tu n8n y la clave.',
    fieldsTooLong: 'La dirección o la clave es demasiado larga.',
    fieldsControl: 'La dirección o la clave contiene un salto de línea u otro carácter que no se puede guardar.',
    envSymlink: 'El archivo .env es un enlace simbólico y GreenLight no los sigue. Usa un archivo normal.',
    envNotFile: 'La entrada .env no es un archivo normal.',
    envTooLarge: 'El archivo .env pesa más de 64 KiB, así que no es un archivo de ajustes.',
    envUnreadable: 'No se puede leer el archivo .env.',
    settingsUnreadable: 'No se pudieron leer los ajustes.',
    saveFailed: 'No se pudieron guardar los ajustes.',
    checkFailed: 'Falló la comprobación de la conexión.',
    scanTooSoon: (seconds) =>
      `Se acaba de hacer un análisis. Prueba de nuevo en ${plural(seconds, 'segundo', 'segundos')}.`,
    serverSilent: 'El servidor del panel no respondió. Comprueba que sigue en marcha.',
    serverStatus: 'El servidor del panel respondió con un error.',
    invalidAnswer: 'El servidor del panel envió una respuesta que esta página no pudo leer.',
    scanFailed: 'El análisis no pudo terminar.',
    scanUnresolved: 'El análisis no pudo terminar: no se pudo resolver la dirección de la instancia.',
    scanRefused: 'El análisis no pudo terminar: no hay nada escuchando en la dirección de la instancia.',
    scanTimeout: 'El análisis no pudo terminar: la instancia tardó demasiado en responder.',
    scanCertificate: 'El análisis no pudo terminar: el certificado HTTPS de la instancia no es de confianza.',
    scanRejectedKey: 'El análisis no pudo terminar: la instancia rechazó la clave de API.',
    scanForbidden: 'El análisis no pudo terminar: la clave de API no tiene permiso para leer lo que GreenLight necesita.',
    scanNotFound: 'El análisis no pudo terminar: no hay una API de n8n en la dirección de la instancia.',
    scanServerError: 'El análisis no pudo terminar: la instancia respondió con un error.',
  },
};
