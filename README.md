# Mikelvra — sitio estático (HTML/CSS/JS puro, sin build step)

## Estructura

```
mikelvra/
├── index.html                     Panel principal (home)
├── herramientas/
│   ├── cuanto-me-deben.html       Mi situación laboral (proyección anual + acumulado)
│   ├── gratificacion.html
│   ├── cts.html
│   ├── vacaciones.html
│   ├── liquidacion.html
│   ├── horas-extras.html
│   ├── utilidades.html
│   ├── afp-vs-onp.html
│   ├── impuesto-renta.html
│   ├── sueldo-neto.html
│   ├── recibo-honorarios.html
│   ├── igv.html
│   ├── uit.html
│   └── renta-4ta.html
├── generadores/                   Documentos imprimibles (PDF vía print)
│   ├── carta-renuncia.html
│   ├── liquidacion-beneficios.html
│   ├── boleta-pago.html
│   ├── certificado-trabajo.html
│   ├── recibo-dinero.html
│   └── cotizacion-igv.html
├── legal/
│   ├── acerca-de.html
│   ├── contacto.html
│   ├── privacidad.html
│   └── terminos.html
├── partials/                      Navbar y footer compartidos
│   ├── navbar.html                Navbar superior con mega-menu
│   └── footer.html
├── assets/
│   ├── css/style.css
│   ├── js/calculadoras.js         Fórmulas puras (Calc.*), sin tocar el DOM
│   ├── js/ui-helpers.js           Debounce, live calc, localStorage, exportar (UI.*)
│   ├── js/documentos.js           Plantillas de documentos imprimibles (Docs.*)
│   ├── js/navbar.js               Mega-menu accesible por teclado + menú móvil (Navbar.*)
│   └── js/include.js              Inyecta los partials en cada página
├── data/                          Open data (normativa, noticias, calendario)
│   └── seed/normativa.base.json   Valores curados (UIT/RMV/…)
├── scripts/fetch-open-data.mjs    Refresco diario (usado por Actions)
├── .github/workflows/             daily-open-data.yml + deploy.yml
├── noticias.html                  Feed oficial MEF/MTPE/SUNAT/SBS
├── robots.txt
├── sitemap.xml
├── ads.txt                        Completar con tu ID real de AdSense
├── run.bat                        Instala lo necesario y corre el sitio (Windows)
└── package.json                   serve local + npm run fetch-data
```

## Cómo probarlo en tu computadora (Windows) — un solo clic

Este sitio **no usa Astro, ni React, ni ningún framework**: es HTML/CSS/JS
puro. Aun así, no puedes abrir `index.html` con doble clic, porque el menú
se carga con `fetch()` y los navegadores bloquean eso sobre archivos locales
(`file://`). Necesitas un mini servidor local — para eso está `run.bat`.

**Simplemente haz doble clic en `run.bat`.** El script:

1. Revisa si tienes **Python** instalado — si lo tienes, arranca el sitio
   con eso directamente (no necesita instalar nada más).
2. Si no hay Python pero sí tienes **Node.js**, corre `npm install`
   (instala el único paquete que se usa, `serve`, definido en
   `package.json`) y luego `npm start` para levantar el sitio.
3. Si no tienes ni Python ni Node, intenta instalar Python automáticamente
   con `winget` (viene incluido en Windows 10/11 actualizados).
4. Si nada de eso está disponible, te muestra los enlaces de descarga de
   Python y Node para que instales uno manualmente y vuelvas a correr
   `run.bat`.

Al terminar, se abre solo tu navegador en `http://localhost:8080/index.html`.
Para detener el servidor, cierra la ventana negra (consola) que quedó abierta.

### Probarlo en Mac/Linux (o manualmente en Windows)

```bash
cd mikelvra
python3 -m http.server 8080
```

o, si prefieres Node:

```bash
npm install
npm start
```

## Open data + actualización diaria (GitHub Actions)

Los parámetros normativos, noticias y el calendario viven en JSON:

```
data/
├── normativa.json          # UIT, RMV, AF, IGV, tasas AFP/ONP…
├── noticias.json           # feed oficial MEF/MTPE/SUNAT/SBS
├── calendario.json         # CTS / gratificación
└── seed/normativa.base.json  # base curada (UIT/RMV no tienen API estable)
```

El front las carga con `assets/js/data-loader.js` (`Calc.applyNormativa`).

### Refrescar en local

```bash
npm run fetch-data
# o: node scripts/fetch-open-data.mjs
```

### Autodeploy con GitHub Actions

Repo: [github.com/cristoferlabs/Mikelvra.Calculos](https://github.com/cristoferlabs/Mikelvra.Calculos)

1. Push a la rama `main` (este directorio es la raíz del sitio; no subas `mvp-firma-de-documento/`).
2. En el repo → **Settings → Secrets and variables → Actions**, crea:
   - `FTP_SERVER` — host FTP de cPanel (**sin** `https://`). En FTP Accounts → *Configure FTP Client* copia el servidor (suele ser `ftp.mikelvra.com` o un hostname tipo `server123.web-hosting.com`).
   - `FTP_USERNAME` — ej. `mikelvra@mikelvra.com`
   - `FTP_PASSWORD`
   - `FTP_SERVER_DIR` — `./` si el FTP ya entra en `public_html`; o `public_html/` con la cuenta principal
   - Opcional: `AFP_JSON_URL` — mirror JSON de tasas AFP
3. Workflows incluidos:
   - `.github/workflows/daily-open-data.yml` — cron diario (~07:00 Perú): descarga AFP + fuentes, escribe JSON, commit si hay cambios, FTP deploy.
   - `.github/workflows/deploy.yml` — deploy FTPS en cada push a `main`.
4. Prueba manual: Actions → *Deploy site* → **Run workflow**.

Si sale `Timeout (control socket)`:
- Revisa que `FTP_SERVER` no sea `mikelvra.com` con https ni la IP bloqueada; usa el host exacto de *Configure FTP Client*.
- En el hosting, desactiva bloqueo de IPs extranjeras / “FTP IP deny” si existe (GitHub Actions conecta desde fuera).
- El workflow usa `protocol: ftps` + `security: loose`. Si aún falla, en cPanel prueba conectarte con FileZilla en FTPS puerto 21; si solo funciona SFTP, este action no sirve (necesitas SFTP/SSH).

Sin los secrets FTP, los workflows existen pero el paso de deploy fallará hasta configurarlos.

**Seguridad del repo**

- Secretos solo en GitHub → Settings → Secrets (nunca en el código).
- `.gitignore` bloquea `.env`, claves, credenciales y el MVP ajeno.
- `.npmrc` con `ignore-scripts=true` evita lifecycle scripts de npm.
- Actions: permisos mínimos; el workflow diario solo ejecuta `scripts/fetch-open-data.mjs` y solo hace commit de 3 JSON en `data/`.
- El deploy FTP **no** sube `scripts/`, `.github/`, `.env`, ni archivos de claves.

UIT / RMV / AF se actualizan editando `data/seed/normativa.base.json` (y volviendo a correr el script o el workflow). Las tasas AFP se refrescan desde API abierta cuando esté disponible; si no, se conservan las del seed.

## Antes de aplicar a AdSense (checklist)

- Contenido útil y original (calculadoras + disclaimers referenciales). Sin material prohibido.
- Páginas legales enlazadas desde el footer: Acerca de, Contacto, Privacidad, Términos.
- Correo real en `legal/contacto.html` (`catrrobert@gmail.com`).
- AdSense **desactivado** en el HTML/JS hasta aprobación (slots comentados; `.ad-slot` en `display:none`).
- `ads.txt` con placeholder: cuando tengas el publisher ID (`pub-…`), descomenta/actualiza la línea de Google.
- HTTPS en `mikelvra.com`, `sitemap.xml` en Search Console, navegación completa.
- No desplegar carpetas ajenas al sitio (MVP de firma, `.env`, `node_modules`).

Cuando AdSense apruebe: pega el script oficial en el `<head>` (bloque comentado), reactiva `ensureAdRails()` en `include.js` solo si aplica, y quita el `display:none` de `.ad-slot` en CSS.

## Cómo publicarlo en tu hosting (mikelvra.com)

1. Preferible: push a GitHub + secrets FTP (Actions despliega solo).
2. Alternativa manual: sube el contenido de esta carpeta a `public_html/` (sin `mvp-firma-de-documento/`, sin `node_modules/`, sin `.github/`).
3. Verifica `https://mikelvra.com/index.html`, menú, herramientas, legales y SSL.

## Cómo agregar contenido nuevo (artículos de blog, más adelante)

Cada página nueva debe repetir la misma estructura de `<div id="site-header">`
y `<div id="site-footer">`, más los scripts `/assets/js/navbar.js` y
`/assets/js/include.js` al final del `<body>` (navbar.js antes que
include.js), para heredar automáticamente el navbar y el pie de página del
sitio. Usa cualquiera de las páginas de `herramientas/` como plantilla de
partida.
