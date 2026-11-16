# RADAR GAMING

Comparador de videojuegos en colones costarricenses para IC-3101. Monorepo con web Next.js, API FastAPI/SQLite o PostgreSQL y app Android Kotlin/Jetpack Compose.

> **Estado honesto:** el código base y las pruebas del backend están implementados, pero el proyecto no puede considerarse una entrega final del curso hasta completar las fuentes autorizadas, el catálogo multiplataforma, snapshots replay reales, benchmark en el hardware del equipo, publicación y evidencias de los tres integrantes. Consultá `docs/ESTADO_REAL.md` y `docs/AUDITORIA_FUENTES.md`.

## 1. Requisitos locales
- Python 3.11 o superior.
- Node.js 20 o superior.
- Android Studio con Android SDK 35 y JDK requerido por Android Gradle Plugin.

## 2. Backend (Windows PowerShell)
```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```
API: `http://127.0.0.1:8000`; documentación: `http://127.0.0.1:8000/docs`.

## 3. Catálogo Steam
En otra terminal:
```powershell
cd backend
.venv\Scripts\Activate.ps1
python scripts/import_steam_catalog.py --limit 500 --country US
```
El importador consulta el listado paginado SteamSpy y valida cada candidato con Steam Store App Details. Puede tardar varios minutos por la pausa entre solicitudes. Inserta títulos de tipo juego, plataforma PC, metadatos disponibles y precios Steam observados convertidos a CRC con el tipo de cambio consultado. No inventa juegos ni precios. Este catálogo por sí solo **no** satisface las tres plataformas ni las cuatro tiendas del curso.

## 4. Web
```powershell
cd web
copy .env.example .env.local
npm install
npm run dev
```
Configurar `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` en `.env.local`. Abrir `http://localhost:3000`.

## 5. Android
Abrir `android` en Android Studio, sincronizar Gradle y ejecutar `app`. El emulador usa `http://10.0.2.2:8000/`. Para un teléfono físico, cambiar `API_BASE_URL` en `android/app/build.gradle.kts` por la IP LAN del equipo o por la URL HTTPS del backend publicado. En producción usar HTTPS y desactivar tráfico HTTP claro.

## 6. Pruebas del backend
```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m compileall -q app scripts tests
python -m unittest discover -s tests -v
```

## 7. Replay y benchmark
Las mediciones formales no deben ejecutarse contra tiendas en vivo. Primero se deben guardar capturas HTML/JSON reales obtenidas legalmente en `backend/replay/`, y crear `backend/replay/records.json` con este formato:
```json
[
  {"canonical_title":"Nombre del juego", "candidate_title":"Nombre en la tienda", "response_file":"captura-001.html"}
]
```
El archivo referenciado debe existir dentro de `backend/replay/`; no se aceptan fixtures inventados como evidencia. Luego:
```powershell
cd backend
python scripts/benchmark_replay.py --latency-ms 50 --repetitions 5
```
Se genera `backend/replay/benchmark-results.json` con tiempos medidos en esa máquina. Completar además el barrido CPU hasta núcleos lógicos y el doble, y responder las preguntas del documento del curso.

## 8. Seguridad y despliegue
- Cambiar `ADMIN_TOKEN` por un secreto largo antes de publicar.
- Configurar `CORS_ORIGINS` con el dominio web exacto.
- Usar PostgreSQL en producción, HTTPS, copias de seguridad y rate limiting.
- El endpoint administrativo no debe exponerse sin autenticación.
- El worker de scraping debe correr en un servicio persistente/cron, no en funciones serverless de corta duración.
- No habilitar adaptadores HTML sin revisar términos, robots.txt, selectores, frecuencia y autorización. Ver `docs/AUDITORIA_FUENTES.md`.

## 9. Rutas principales
- `GET /health`
- `GET /games` (q, platform, game_type, store, format, sort, page, page_size)
- `GET /games/{id}`
- `GET /games/{id}/history`
- `GET /metrics`
- `GET /fx/usd-crc`
- `POST /admin/run-pipeline` (proteger con `X-Admin-Token` si se configura `ADMIN_TOKEN`)
- `GET /admin/contention`
- `GET /admin/match`
- `POST /admin/mark-stale`

## 10. Documentación académica
- `docs/MATRIZ_IC3101.md`: trazabilidad requisito por requisito.
- `docs/AUDITORIA_FUENTES.md`: restricciones y decisiones de fuentes.
- `docs/DIAGRAMA_PIPELINE.md`: arquitectura.
- `docs/adr/`: decisiones arquitectónicas.
- `docs/acta.md`, `docs/seguimiento.md`, `docs/bitacora-ia.md`, `docs/cambios-diseno.md`: completar con información y evidencias reales del equipo.
