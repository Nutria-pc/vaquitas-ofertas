# Estado real de RADAR GAMING

Última revisión: 16-11-2026. Esta lista distingue código incluido de requisitos que necesitan datos, permisos, equipo o publicación externos.

## Incluido en el repositorio
- Web Next.js con búsqueda, filtros de plataforma/tienda/formato, ordenamiento básico, tarjetas y enlaces a tienda.
- Vista de detalle, precios observados, enlaces originales e historial.
- Panel de métricas de catálogo/calidad.
- API FastAPI y modelos SQLAlchemy.
- Importador SteamSpy + Steam Store: importa títulos de tipo `game`, plataformas PC, fechas, portadas y observaciones de precio USD convertidas a CRC cuando hay tipo de cambio disponible.
- Matching Levenshtein propio y marca casos dudosos.
- Tres modos de pipeline; colas de trabajo acotadas para la etapa de E/S; paralelismo de matching mediante procesos.
- Experimento de contención con lock, acumuladores locales, diccionario por hilo y carrera controlada.
- Harness de benchmark para snapshots reales en modo replay y métricas speedup/eficiencia/Karp–Flatt.
- App Android Compose que consulta catálogo y detalle de la misma API.
- Pruebas unitarias de matching, equivalencia de modos, fallos de descarga y métricas.

## Pendiente y no debe presentarse como terminado
- 500 títulos verificados con 3 plataformas. El importador es de Steam/PC; no inventa disponibilidad PlayStation/Xbox/Switch.
- Cuatro tiendas con al menos dos precios por juego, tres fuentes HTML, dos tiendas HTML y un minorista. La auditoría documenta restricciones de uso; hacen falta fuentes autorizadas y/o aprobación de sustituciones.
- Metacritic (obligatoria) y segunda fuente de calificación: no hay datos cargados ni autorización de scraping de Metacritic.
- HowLongToBeat: conector/datos autorizados pendientes.
- Conjunto de validación de al menos 60 pares revisados manualmente y 50 casos difíciles: debe construirse/revisarse por el equipo.
- Snapshots reales de todas las fuentes y catálogo completo en `backend/replay/`; no se incluyen capturas falsas.
- Ejecutar barridos requeridos (I/O 1,2,4,8,16,32,64; CPU según núcleos) con cinco o más repeticiones en la máquina del equipo. No hay resultados de rendimiento prellenados.
- Publicación web/API, tarea programada activa, generación de APK firmado, URL pública y pruebas Android en dispositivo.
- Evidencia de tres integrantes, tablero real, commits distribuidos y predicciones Hito 1 hechas sin IA.

## Validaciones ejecutadas en el entorno de preparación
- `python -m compileall -q app scripts tests`: correcto.
- `python -m unittest discover -s tests -v`: 7 pruebas correctas.
- Smoke test FastAPI `/health`, `/games`, `/metrics`: HTTP 200.
- Sintaxis TS/TSX revisada con el compilador TypeScript global: correcta. No se pudo completar `npm install` en este entorno por timeout; faltan dependencias React/Next, por lo que typecheck y build Next.js no están certificados aquí.
- No se ejecutó build Android: requiere Android Studio/SDK/Gradle y configuración local.

## Importante
El contador de métricas refleja lo que exista realmente en la base de datos. Una base vacía debe mostrarse vacía; no cargar juegos, ofertas, ratings ni benchmarks ficticios para aparentar cumplimiento.
