# GreenLight

[![CI](https://github.com/jsanchez542-hub/greenlight/actions/workflows/ci.yml/badge.svg)](https://github.com/jsanchez542-hub/greenlight/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node 22+](https://img.shields.io/badge/node-22%2B-339933)

**Encuentra los workflows de n8n que fallan mientras informan de que todo fue bien.**

[English](README.md) · Español

Un workflow de producción informó de éxito durante tres semanas mientras no enviaba absolutamente nada.

El paso que fallaba tenía activado "continue on fail", así que su error viajaba aguas abajo como un dato
más y cada ejecución terminaba en verde. Lo que lo delató fue el reloj: el tiempo de ejecución había
pasado de 1,2 a 10,5 segundos, porque el nodo reintentaba contra una credencial revocada antes de rendirse.

Ningún panel lo muestra. Todas las ejecuciones fueron correctas, y el contador así lo decía.

GreenLight lee una instancia de n8n a través de su API y busca los fallos que no se anuncian.

![El resumen de un análisis: hallazgos por gravedad y un mapa de todos los workflows](docs/images/overview.png)

**[Prueba la demo online](https://jsanchez542-hub.github.io/greenlight/)**: el panel real con datos inventados, en español o en inglés. No hay nada que instalar y no se conecta a nada.

## Inicio rápido

Necesitas dos cosas: **Node.js 22.12 o superior** (desde [nodejs.org](https://nodejs.org); el botón
marcado como LTS es el correcto) y **Git**, o el botón **Code, y luego Download ZIP** de esta página.

```bash
git clone https://github.com/jsanchez542-hub/greenlight.git
cd greenlight
npm install
npm run panel
```

`npm run panel` prepara el panel, lo arranca y lo abre en tu navegador. La primera vez tarda uno o dos
minutos. Empieza con datos de ejemplo, así que puedes explorarlo enseguida. Si otro programa usa el
puerto 3000, elige el siguiente libre y te dice cuál.

Para ver tu propio n8n, pulsa **Conecta tu n8n**, escribe su dirección y una clave de API, y pulsa
**Conectar**. En n8n la clave está en Settings, luego n8n API, y basta con permiso de lectura. La clave
se queda en este equipo, en un archivo `.env` que git ignora. Si algo falla, la página dice qué y cómo
corregirlo, y **Desconectar** lo deshace.

¿Prefieres la terminal? `npm run setup` hace las mismas dos preguntas, `npm run scan` imprime un informe
y `npm run doctor` comprueba la conexión paso a paso si algo no funciona.

El panel y la línea de comandos hablan inglés y español; consulta [Idioma](#idioma).

## Qué busca

| Comprobación | Pregunta que responde |
| --- | --- |
| Error silencioso | ¿Falló un paso dentro de una ejecución que informó de éxito? |
| Ralentización | ¿Este workflow es de repente mucho más lento que antes? |
| Silencio | ¿Un workflow programado dejó de ejecutarse sin que nadie lo desactivara? |
| Caída de frecuencia | ¿Sigue ejecutándose, pero con mucha menos frecuencia que antes? |

Cada comprobación nace de un fallo que ocurrió en una instancia real, no de una lista de cosas que
podrían salir mal en teoría.

## Ejemplo

```
GreenLight  18 workflows analizados  4 hallazgos, 2 críticos

CRÍTICO     Order confirmations
            “Send receipt” devolvió un error en 5 de las últimas 5 ejecuciones
            correctas. El workflow indica que todo fue bien mientras este paso
            falla.
                Nodo                   Send receipt
                Ejecuciones con error  5
                Ejecuciones revisadas  5

CRÍTICO     Warehouse load
            El workflow activo no se ejecuta desde hace 9,0 h, cuando lo normal es
            que lo haga cada 1,0 h. Lo más probable es que su disparador ya no esté
            registrado.
                Última ejecución           2026-03-02T00:00:00.000Z
                Sin ejecutarse desde hace  9,0 h
                Intervalo habitual         1,0 h

ADVERTENCIA Inventory sync
            El tiempo habitual de ejecución subió de 1,2 s a 10,5 s, es decir, 8,6
            veces más lento que antes. Suele indicar que un servicio externo está
            reintentando antes de rendirse.
                Tiempo mediano habitual      1,2 s
                Percentil 95 habitual        1,5 s
                Tiempo mediano reciente      10,5 s
                Veces más lento              8,6x
                Ejecuciones en el historial  142
                Ejecuciones recientes        24

ADVERTENCIA Price monitor
            Se ejecutó 1 vez en las últimas 24 h, cuando se esperaban unas 24. Es
            probable que alguien haya editado la programación.
                Ejecuciones en la ventana    1
                Ejecuciones esperadas        24
                Ventana (horas)              24
                Ejecuciones en el historial  168
```

Ese informe es la salida real del programa, ejecutado contra una instancia sintética para que el ejemplo
pueda mostrar todas las comprobaciones a la vez. `npm run example -- --lang es` lo reproduce desde
[`examples/synthetic-instance.mjs`](examples/synthetic-instance.mjs). Los nombres de los workflows y de
los nodos son datos de esa instancia y no se traducen.

## El panel

`npm run panel` arranca un panel local que analiza tu instancia y mantiene el resultado al día.

| | |
| --- | --- |
| ![Un hallazgo con los números en los que se apoya](docs/images/finding.png) | ![Todos los workflows, ordenables y filtrables](docs/images/workflows.png) |
| Cada hallazgo muestra la evidencia en la que se apoya y qué revisar. | Todos los workflows comprobados, con su estado, su disparador y su última ejecución. |
| ![El recorrido de primer uso señalando los cuatro estados](docs/images/tour.png) | ![La página que conecta tu n8n: dos campos y un botón](docs/images/setup.png) |
| Un recorrido breve la primera vez que lo abres. | **Conecta tu n8n**: una dirección, una clave y un botón. |
| ![El tema claro](docs/images/light.png) | <img src="docs/images/mobile.png" alt="El resumen en una pantalla del tamaño de un móvil" width="240"> |
| Un tema claro y uno oscuro, con un selector. | También funciona en una pantalla del tamaño de un móvil. |

- **Resumen, Hallazgos, Workflows y Comprobaciones.** La última página explica qué busca cada
  comprobación y los valores exactos que usa por defecto.
- **En vivo o de ejemplo.** Con una instancia configurada, analiza por su cuenta y muestra la antigüedad
  de los datos. Sin ella, muestra datos de ejemplo, indicados como tales.
- **Una guía de primer uso.** La primera vez que lo abres hay un recorrido breve, una sola vez.
  **Conecta tu n8n** es un formulario de dos campos: ejecuta la misma comprobación paso a paso que
  `npm run doctor` y guarda la conexión por ti, sin terminal.
- **Claro y oscuro.** Un selector en la barra lateral, y en la barra superior en el móvil, alterna entre
  Sistema, Claro y Oscuro y recuerda la elección. Sistema sigue el de tu sistema operativo.
- **Funciona en una pantalla del tamaño de un móvil.** Necesita un navegador actual: Chrome o Edge 123,
  Firefox 120 o Safari 17.5 y posteriores.
- **Pensado para el teclado.** `g` y luego `o`, `f`, `w` o `c` cambia de página, y `/` busca workflows.

El panel no tiene inicio de sesión propio. Escucha en `127.0.0.1` y rechaza otros nombres de host, así
que está pensado para tu propio equipo. Lee [SECURITY.md](SECURITY.md) (en inglés) antes de ponerlo en
cualquier otro sitio.

## Vigilar y recibir alertas

```bash
npm run watch
```

Analiza cada cierto tiempo y comunica solo lo que cambió. Un hallazgo se anuncia una vez cuando
aparece y otra cuando lleva dos análisis seguidos sin aparecer, de modo que un caso límite que
parpadea no produzca una alerta cada pocos minutos. Lo que ya se comunicó se guarda en un archivo
pequeño (`.greenlight-state.json`), así que reiniciar no repite alertas antiguas.

Si el propio análisis no puede ejecutarse tres veces seguidas, lo que suele indicar que la instancia
está caída o que la clave se revocó, lo dice, porque un vigilante que falla en silencio es justo el
problema que este proyecto existe para resolver. Y lo dice de nuevo cuando el análisis se reanuda.

Sin webhook, los cambios solo se muestran. Con uno, cada cambio se publica como JSON:

```json
{
  "source": "greenlight",
  "type": "findings",
  "lang": "es",
  "subject": "GreenLight: 1 hallazgo crítico nuevo en n8n.example.com",
  "text": "CRÍTICO Order confirmations (silent-error)\n“Send receipt” devolvió un error en 5 de las últimas 5 ejecuciones correctas. ...",
  "instance": "n8n.example.com",
  "scannedAt": "2026-03-02T09:00:00.000Z",
  "newFindings": [
    {
      "workflowId": "orders",
      "workflowName": "Order confirmations",
      "detector": "silent-error",
      "severity": "critical",
      "summary": "“Send receipt” devolvió un error en 5 de las últimas 5 ejecuciones correctas. ..."
    }
  ],
  "resolvedFindings": []
}
```

`type` es `findings`, `scan-failing` o `scan-recovered`. `subject` y `text` están escritos para usarse
tal cual en un correo o en un mensaje de chat, en el idioma que indica `lang`; las listas llevan la
misma información como datos. Los nombres de las claves y los valores de `type`, `detector` y
`severity` no cambian con el idioma. Si una entrega falla, la alerta se conserva y se reintenta en el
siguiente análisis.

GreenLight no sabe qué hay detrás de la dirección, así que funciona con cualquier cosa que acepte un POST
con JSON. [`examples/n8n-alert-to-email.json`](examples/n8n-alert-to-email.json) es un workflow de n8n de
dos nodos que convierte la alerta en un correo: impórtalo, elige tus propias credenciales SMTP y
direcciones, y crea una credencial Header Auth cuyo nombre sea `Authorization` y cuyo valor sea `Bearer `
seguido de tu token. Después define `GREENLIGHT_WEBHOOK_URL` con la dirección de producción de su
webhook y `GREENLIGHT_WEBHOOK_TOKEN` con ese mismo token. La dirección del webhook se trata como un
secreto y nunca aparece en los mensajes de error.

`npm run watch -- --once` hace un único análisis y termina, con los mismos códigos de salida que un
análisis normal, así que puede ejecutarse desde cron o un programador de tareas en lugar de quedarse
en marcha.

## Configuración

`npm run setup` escribe esto en `.env`. Un valor definido en el entorno prevalece sobre el del archivo.

| Variable | Por defecto | Para qué sirve |
| --- | --- | --- |
| `N8N_BASE_URL` | obligatoria | dirección de la instancia, sin `/api/v1` |
| `N8N_API_KEY` | obligatoria | clave de API con permiso de lectura |
| `GREENLIGHT_EXECUTION_LIMIT` | 200 | ejecuciones que se leen por workflow |
| `GREENLIGHT_DETAIL_SAMPLE` | 5 | ejecuciones que se revisan nodo a nodo |
| `GREENLIGHT_ALLOW_INSECURE_HTTP` | desactivado | con `1` la clave puede viajar por http sin cifrar a un servidor público; no se recomienda |
| `GREENLIGHT_LANG` | idioma del equipo | `en` o `es`, para la línea de comandos, las alertas y el panel |
| `GREENLIGHT_CHECK_UPDATES` | desactivado | con `1` te avisa cuando hay una versión nueva; consulta [Versiones y actualizaciones](#versiones-y-actualizaciones) |
| `GREENLIGHT_WEBHOOK_URL` | ninguna | dónde publica las alertas `watch` |
| `GREENLIGHT_WEBHOOK_TOKEN` | ninguno | se envía como `Authorization: Bearer <token>` |
| `GREENLIGHT_INTERVAL_MINUTES` | 5 | tiempo entre análisis en `watch` |
| `GREENLIGHT_NOTIFY_MIN` | `warning` | `critical` para avisar solo de los hallazgos críticos |
| `GREENLIGHT_STATE_FILE` | `.greenlight-state.json` | lo que `watch` ya ha comunicado |

Solo se usan endpoints de lectura. GreenLight nunca escribe en la instancia. Se comunica con tu n8n y,
si configuras uno, con el webhook de alertas; y, solo si lo activas, una vez al día con GitHub para
preguntar el número de la última versión (consulta [Versiones y
actualizaciones](#versiones-y-actualizaciones)).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run setup` | configuración guiada de primer uso, guarda `.env` |
| `npm run doctor` | comprueba la conexión paso a paso |
| `npm run scan` | analiza una vez e imprime el informe; añade `-- --json` para una salida estructurada |
| `npm run watch` | analiza cada cierto tiempo y avisa de los cambios |
| `npm run panel` | prepara y arranca el panel, y lo abre en el navegador |
| `npm run example` | imprime el informe de una instancia sintética |

`scan` y `watch --once` terminan con 0 cuando no se encuentra nada, con 1 cuando se encuentra algo y con
2 cuando el análisis no pudo ejecutarse, así que pueden condicionar un flujo de despliegue. Fuera de un
clon de este repositorio, los mismos comandos son `greenlight init`, `greenlight doctor`, `greenlight`
y `greenlight watch`. Para elegir el idioma de una ejecución, añade `--lang es` o `--lang en`.

## Salida

`--json` devuelve un único objeto. `findings` contiene lo que detectaron las comprobaciones, primero lo
crítico. `workflows` contiene una entrada por workflow, también los sanos, para que quien consuma el
resultado pueda mostrar qué se comprobó y no solo qué falló.

```json
{
  "version": 1,
  "scannedAt": "2026-03-02T09:00:00.000Z",
  "workflowsScanned": 18,
  "workflows": [
    {
      "id": "inventory",
      "name": "Inventory sync",
      "active": true,
      "trigger": "schedule",
      "executionsRead": 166,
      "lastStartedAt": "2026-03-02T09:00:00.000Z",
      "health": "warning"
    }
  ],
  "findings": [
    {
      "workflowId": "inventory",
      "workflowName": "Inventory sync",
      "detector": "duration-drift",
      "severity": "warning",
      "summary": "Typical run time rose from 1.2s to 10.5s, ...",
      "evidence": { "baselineMedian": "1.2s", "recentMedian": "10.5s" }
    }
  ]
}
```

`health` es `critical`, `warning`, `healthy` o `no-runs`. `no-runs` significa que la instancia no
conserva historial de ese workflow, así que no se pudo juzgar nada; no es un veredicto. `trigger` es
`schedule` para los workflows que arranca un reloj y `event` para todo lo demás. `version` solo cambia
cuando un campo se elimina o cambia de significado. La salida completa del ejemplo anterior está en
[`examples/scan-result.json`](examples/scan-result.json).

La salida `--json` es idéntica en todos los idiomas: la frase de `summary` queda en inglés y la
evidencia que la acompaña lleva los mismos números. Las frases pensadas para una persona (el informe,
las alertas, el panel) sí se traducen.

El mismo resultado está disponible desde código:

```ts
import { N8nClient, scan } from 'greenlight';

const client = new N8nClient({ baseUrl, apiKey });
const result = await scan(client, { executionLimit: 200, detailSampleSize: 5 });
```

## Cómo decide

**Los umbrales salen de cada workflow, no de un archivo de configuración.** Un workflow que siempre
tarda diez segundos no es un problema. Uno que tardaba un segundo y ahora tarda diez, sí. La
ralentización exige que la mediana reciente supere a la vez el percentil 95 histórico y el doble de la
mediana histórica, porque cualquiera de las dos condiciones por separado detecta la variación normal.

**Se niega a juzgar sin historial suficiente.** La ralentización necesita diez ejecuciones de referencia
y tres recientes, la caída de frecuencia necesita diez de referencia, y el silencio necesita tres
ejecuciones para saber cuál es un intervalo habitual. El error silencioso no necesita historial, porque
un solo error dentro de una ejecución que informó de éxito ya es el hallazgo. Una alerta segura de sí
misma y equivocada cuesta más confianza que una que no se emitió.

**El resto de los valores por defecto están declarados, no ocultos.** El silencio se detecta cuando un
workflow programado lleva callado más de cuatro veces su intervalo habitual entre ejecuciones. La caída
de frecuencia se detecta cuando las últimas 24 horas contienen menos de la mitad de las ejecuciones que
predice el historial; un workflow que no se ejecutó en absoluto en esa ventana lo juzga la comprobación
de silencio.

**Lee el nodo disparador en lugar de deducir la programación.** La primera versión averiguaba si un
workflow estaba programado midiendo lo regulares que eran sus ejecuciones. Eso pasó todas las pruebas
sintéticas y luego falló en una instancia real: una ráfaga de pruebas manuales contra un workflow de
webhook está espaciada con regularidad, así que se detectó como un disparador muerto. Los disparadores
de sondeo se excluyen por otra razón, que solo aparece con datos de producción: registran una ejecución
únicamente cuando encuentran algo, así que un disparador de Gmail inactivo y uno roto son idénticos
vistos desde fuera.

**Deja en paz lo que se desactivó.** Otra lección de una instancia real: un workflow en pausa a
propósito conservaba en el historial sus antiguas ejecuciones fallidas y se detectaba como crítico
indefinidamente. Los errores silenciosos solo se juzgan en los workflows activos.

**La detección es determinista.** Cada hallazgo es una comparación entre números, y por eso se puede
cubrir con una prueba y reproducir a partir de la evidencia impresa a su lado.

## Límites

Lee el historial de ejecuciones que la instancia aún conserva, así que una ventana de retención corta
limita lo que se puede comparar. Los workflows que nunca se han ejecutado se omiten en lugar de
adivinarse. La inspección de detalle se hace por muestreo, no de forma exhaustiva, porque ese endpoint
es costoso. El análisis lee los workflows uno tras otro, así que en una instancia grande tarda lo que
tarde la API en responder.

## Versiones y actualizaciones

GreenLight sigue el [versionado semántico](https://semver.org/lang/es/). Durante toda la serie 1.x no
cambia, de un modo que rompa una instalación que funciona, lo siguiente: los comandos y sus opciones,
las variables de entorno, los códigos de salida, la salida `--json` (`version: 1`) y el formato de las
alertas. Las comprobaciones y los ajustes nuevos llegan en versiones menores, las correcciones en
versiones de parche, y todo lo que rompiera esa lista espera a la 2.0.0. El aspecto y el funcionamiento
interno del panel pueden cambiar en cualquier versión menor.

`greenlight --version` te dice qué versión tienes, y `greenlight doctor` también la imprime, de modo que
aparezca en cada informe de error. Para actualizar un clon, ejecuta `git pull` y luego `npm install`.
Lo que cambió está en [CHANGELOG.md](CHANGELOG.md) (en inglés).

**Que te avisen de una versión nueva es opcional y viene desactivado**, porque de otro modo GreenLight
solo contacta con tu n8n y con tu webhook de alertas. Si lo activas (una casilla en el formulario de
conexión del panel, la pregunta de `greenlight init` o `GREENLIGHT_CHECK_UPDATES=1`), hace una sola
petición, como mucho una vez al día: un `GET` sencillo a la API pública de GitHub para obtener el número
de la última versión publicada. No se envía ninguna clave, ni la dirección de tu n8n, ni nada sobre ti,
aunque GitHub, como cualquier sitio web, ve tu dirección IP. Si no se puede contactar con él, no se
muestra nada y nada se rompe. El aviso aparece en el panel, al final de `scan` y `doctor`, y en el
registro de `watch`. Nunca instala nada: enlaza con las notas de la versión y tú actualizas con
`git pull`.

Sin esa opción, usa **Watch, luego Custom, luego Releases** en este repositorio de GitHub para recibir
un correo.

## Idioma

El panel, la línea de comandos, la comprobación de la conexión y las alertas están disponibles en inglés
y en español. En la línea de comandos y en las alertas, el idioma se elige en este orden: `--lang es` o
`--lang en`, `GREENLIGHT_LANG`, el idioma de tu equipo y, si ninguno indica español, inglés. En el panel,
el orden es: el selector ES | EN de la barra lateral (recuerda tu elección), `GREENLIGHT_LANG`, el
idioma de tu navegador y, si ninguno indica español, inglés. La salida `--json` y las claves de las
alertas no cambian con el idioma, de modo que un programa que las lea nunca se ve afectado; solo se
traducen las frases pensadas para una persona.

Este README también está disponible en [inglés](README.md). [CHANGELOG.md](CHANGELOG.md),
[CONTRIBUTING.md](CONTRIBUTING.md) y [SECURITY.md](SECURITY.md) están en inglés.

## Estructura del proyecto

| Carpeta | Qué contiene |
| --- | --- |
| `src/` | el analizador: cliente de n8n, las cuatro comprobaciones, `watch` y el asistente de configuración |
| `tests/` | sus pruebas |
| `web/` | el panel, un proyecto de Next.js independiente |
| `examples/` | la instancia sintética, su salida y el workflow de n8n para las alertas por correo |
| `assets/logo/` | el logotipo en los tamaños que necesita una página |

El analizador no tiene dependencias de producción y funciona solo con Node.

## Contribuir

Las incidencias y las pull requests son bienvenidas; [CONTRIBUTING.md](CONTRIBUTING.md) (en inglés)
explica qué hace buena a una modificación y cómo añadir una comprobación. Informa de los problemas de
seguridad como se describe en [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE) © Miguel Sanchez Torres
