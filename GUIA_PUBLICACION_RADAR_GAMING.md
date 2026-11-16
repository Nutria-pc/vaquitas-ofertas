# Guía para instalar y publicar RADAR GAMING

## Antes de comenzar
Necesitás Windows 10/11, Python 3.11+, Node.js 20+, Android Studio, Git y cuentas de GitHub/Vercel/proveedor de API.

## 1. Backend
```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```
Probá `http://127.0.0.1:8000/health` y `http://127.0.0.1:8000/docs`.

## 2. Cargar catálogo y precios Steam
```powershell
cd backend
.venv\Scripts\Activate.ps1
python scripts/import_steam_catalog.py --limit 500 --country US
```
El importador puede tardar varios minutos. Usa SteamSpy para descubrir y Steam Store App Details para validar juegos y obtener metadatos/precios cuando estén disponibles. Los precios en USD se convierten a CRC con la tasa consultada. Es catálogo Steam/PC; no cumple por sí solo las tres plataformas ni las cuatro tiendas del TEC.

## 3. Web
En otra terminal:
```powershell
cd web
Copy-Item .env.example .env.local
npm install
npm run dev
```
Abrí `http://localhost:3000`. `NEXT_PUBLIC_API_URL` debe apuntar a la API.

## 4. Android
Abrí `android` desde Android Studio, sincronizá Gradle y ejecutá `app`. El emulador local usa `10.0.2.2:8000`. Para teléfono físico usá la IP LAN de la computadora. Para producción cambiá `API_BASE_URL` a la URL HTTPS de la API; la variante release bloquea HTTP claro.

## 5. Subir a GitHub
Desde la carpeta raíz:
```powershell
git init
git add .
git commit -m "Radar Gaming"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/radar-gaming.git
git push -u origin main
```
No subás `.env`, claves, APK firmado, base de datos ni snapshots privados.

## 6. Publicar web en Vercel
Importá el repositorio en Vercel, seleccioná `web` como Root Directory, Build `npm run build`, Install `npm install` y configurá `NEXT_PUBLIC_API_URL` con la URL HTTPS del backend. Desplegá.

## 7. Publicar API
Usá Render, Railway, Fly.io o VPS persistente. Root `backend`, Build `pip install -r requirements.txt`, Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Configurá `DATABASE_URL` PostgreSQL, `CORS_ORIGINS` con el dominio Vercel y un `ADMIN_TOKEN` secreto. No expongás endpoints administrativos sin token.

## 8. Replay y mediciones
Guardá respuestas reales autorizadas en `backend/replay/` y creá `records.json` siguiendo `backend/replay/README.md`. Ejecutá:
```powershell
cd backend
python scripts/benchmark_replay.py --latency-ms 50 --repetitions 5
```
El resultado `benchmark-results.json` es medido en la computadora donde se ejecuta. Repetí los barridos de CPU según núcleos lógicos y doble; completá el informe técnico con hardware y análisis.

## 9. Pendientes académicos que no se pueden completar desde este entorno
- Fuentes autorizadas para 3 plataformas, 4 tiendas, 3 fuentes HTML, minorista, Metacritic y HowLongToBeat.
- 500 juegos con metadatos multiplataforma, 50 casos difíciles y 60 pares de validación manual.
- Snapshots reales completos, pruebas de equivalencia, benchmark final y análisis con datos propios.
- Despliegue real, cron activo, APK firmado y pruebas en dispositivo.
- Datos reales de integrantes, reuniones, tablero y contribuciones Git de los tres miembros.

La auditoría explica por qué no se automatizan algunas tiendas. Pedí al docente autorización de sustituciones o conseguí permisos antes de activar scraping. No presentes valores ficticios como datos reales.
