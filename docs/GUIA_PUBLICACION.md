# GUÍA PARA SUBIR RADAR GAMING A INTERNET Y ANDROID

Esta guía está escrita para Windows. Seguí el orden; web, API y Android son tres entregables conectados.

## 0. Antes de empezar
Instalá:
- Git: https://git-scm.com/downloads
- Python 3.11+: https://www.python.org/downloads/
- Node.js LTS: https://nodejs.org/
- Android Studio: https://developer.android.com/studio
- Una cuenta GitHub, Vercel y un proveedor para backend persistente (Render/Railway/Fly.io/VPS).

Descomprimí `radar-gaming-final.zip` en una carpeta simple, por ejemplo `C:\\Proyectos\\radar-gaming`.

## 1. Probar en tu computadora

### 1.1 Backend
Abrí PowerShell:
```powershell
cd C:\\Proyectos\\radar-gaming\\backend
py -3.11 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```
Comprobá:
- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs

Si PowerShell bloquea la activación, ejecutá en esa terminal:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\\.venv\\Scripts\\Activate.ps1
```

### 1.2 Web
En otra terminal:
```powershell
cd C:\\Proyectos\\radar-gaming\\web
Copy-Item .env.example .env.local
npm install
npm run dev
```
Abrí http://localhost:3000. La web consulta la API en localhost:8000.

### 1.3 Android
1. Abrí Android Studio → Open → seleccioná la carpeta `android`.
2. Esperá la sincronización de Gradle.
3. Creá/iniciá un emulador Android.
4. Ejecutá `app`.
5. Para emulador, el host local de Windows se referencia como `10.0.2.2`, no `localhost`.
6. Para un teléfono físico, cambiá `API_BASE_URL` en `android/app/build.gradle.kts` por la IP LAN de tu PC y asegurate de que ambos estén en la misma red. No uses HTTP sin protección en producción.

## 2. Subir el código a GitHub
Desde la carpeta raíz:
```powershell
git init
git add .
git commit -m "Radar Gaming release candidate"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/radar-gaming.git
git push -u origin main
```
Creá primero el repositorio vacío en GitHub. No subas `.env`, claves, bases de datos ni capturas privadas.

## 3. Publicar la web en Vercel
1. Entrá en https://vercel.com y conectá GitHub.
2. Importá `radar-gaming`.
3. En Root Directory seleccioná `web`.
4. Framework: Next.js.
5. Build command: `npm run build`.
6. Install command: `npm install`.
7. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = URL HTTPS pública de tu backend, por ejemplo `https://tu-api.onrender.com`.
8. Deploy.

La web quedará en una URL `*.vercel.app`; podés añadir dominio propio desde Vercel.

## 4. Publicar la API y el worker
No alojés el scraper programado en funciones serverless cortas. La API necesita un servicio Python persistente y un worker/cron.

### Opción de despliegue tipo Render
1. Crear un Web Service desde el repositorio.
2. Root Directory: `backend`.
3. Build: `pip install -r requirements.txt`.
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Configurar variables:
   - `DATABASE_URL`: URL PostgreSQL administrada (recomendado para producción).
   - `CORS_ORIGINS`: dominio Vercel exacto.
   - `USER_AGENT`: identificador de proyecto y contacto.
   - `ADMIN_TOKEN`: secreto largo para endpoints administrativos.
   - `USD_TO_CRC_OVERRIDE`: dejar vacío salvo contingencia documentada.
6. Crear una base PostgreSQL y guardar la URL como secreto.
7. Crear un Cron Job separado para ejecutar el pipeline/actualización cuando la ingesta esté implementada y auditada.

En producción, configurar migraciones de base de datos, backups, HTTPS, logs y monitoreo. SQLite sirve para desarrollo, no para múltiples instancias de producción.

## 5. Configurar fuentes reales
Este paso no se puede completar con solo desplegar el repositorio.
1. Elegí 4 tiendas: al menos 2 tiendas de plataforma y 1 minorista.
2. Para cada dominio, revisá robots.txt, términos, límites y disponibilidad desde Costa Rica.
3. El documento exige 3 fuentes obtenidas por scraping HTML, incluidas 2 tiendas. Registrá evidencia y selectores en ADRs.
4. Si el sitio bloquea scraping o lo prohíbe, no lo evadás: sustituí por fuente admitida y documentá el ADR.
5. Para IGDB, RAWG u otra API, obtené las credenciales siguiendo sus términos.
6. Metacritic y PlayStation tienen restricciones de automatización en sus términos; GOG también prohíbe automatización no autorizada. No uses el adaptador HTML genérico contra esos sitios. Conseguí autorización escrita o aprobación del docente para fuentes sustitutas; ver `docs/AUDITORIA_FUENTES.md`.
7. Para Metacritic y HowLongToBeat, implementá conectores permitidos y guarda URL/fecha. No inventes puntuaciones ni duración.
7. Configurá fuente de tipo de cambio y guarda moneda original, tasa, fecha y CRC calculado.
8. Capturá respuestas reales para modo replay. No uses HTML inventado como evidencia.

## 6. Catálogo de 500
El script `backend/scripts/import_steam_catalog.py` usa el listado público paginado SteamSpy y verifica candidatos con Steam Store App Details. Filtra el tipo `game` y guarda metadatos/precio Steam cuando está disponible. Puede tardar varios minutos por los límites de consulta.
Ejecutá desde `backend` con entorno activo:
```powershell
python scripts/import_steam_catalog.py --limit 500 --country US
```
Este importador crea un catálogo Steam/PC, no resuelve las tres plataformas ni las cuatro tiendas exigidas. El equipo debe conseguir fuentes autorizadas para las demás plataformas, completar el catálogo y revisar los 50 casos difíciles.

## 7. Publicar Android
Para probar: Android Studio → Run.
Para generar APK:
- Build → Generate Signed Bundle / APK.
- Elegí Android App Bundle (AAB) para Google Play.
- Creá y guardá la clave de firma de forma segura (no la subas a Git).
- Configurá URL HTTPS de backend en `API_BASE_URL`.
- Probá en varios tamaños de pantalla y con red móvil.
- Google Play Console requiere cuenta de desarrollador, ficha, política de privacidad y cumplimiento de sus políticas. Subir el AAB no garantiza aprobación.

## 8. Actualización programada
La actualización debe correr como job/worker, no cuando alguien abre la web.
- Define frecuencia responsable por dominio.
- Registra hora de inicio/fin, éxitos, reintentos, fallos y datos stale.
- Guarda cada observación de precio; nunca sobrescribas el historial.
- Añade un endpoint/admin protegido para disparar trabajos. No dejes endpoints de administración públicos sin autenticación.

## 9. Lista final antes de compartir
- [ ] Web pública abre y consulta API HTTPS.
- [ ] API con PostgreSQL, CORS limitado y secretos protegidos.
- [ ] App Android apunta a backend HTTPS.
- [ ] 500 juegos reales, 3+ plataformas y 50 casos difíciles validados.
- [ ] 4 tiendas consultadas; cada juego publicado con precio en 2+ tiendas.
- [ ] 3 fuentes HTML, incluidas 2 tiendas, auditadas.
- [ ] Metacritic + otra fuente; HowLongToBeat y portadas.
- [ ] Precio actual, precio regular, formato, URL, fecha y moneda.
- [ ] Historial, mínimo histórico y filtros.
- [ ] Tres modos con resultados equivalentes.
- [ ] Replay capturado con respuestas reales.
- [ ] Barridos 1,2,4,8,16,32,64; cinco repeticiones; mediana y dispersión.
- [ ] Matching validado con 60 pares revisados.
- [ ] Experimento de contención y carrera reproducible documentados.
- [ ] Acta, tablero, seguimiento, ADRs, cambios de diseño e IA.
- [ ] Equipo puede defender cada decisión y resultado.

## Solución de problemas
- `ModuleNotFoundError`: activá `.venv` e instalá `pip install -r requirements.txt`.
- Web no conecta: verificá `/health`, `NEXT_PUBLIC_API_URL` y CORS.
- Android no conecta: emulador usa `10.0.2.2`; dispositivo físico usa IP LAN en desarrollo.
- Error Gradle: actualizá Android Studio/JDK compatible y sincronizá.
- CORS: `CORS_ORIGINS` debe contener el origen exacto de Vercel, sin barra final.
- No hay precios: es correcto si no hay adaptadores verificados. No rellenar con precios ficticios.
