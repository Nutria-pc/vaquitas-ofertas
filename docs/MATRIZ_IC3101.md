# Matriz de trazabilidad IC-3101

| Exigencia del documento | Implementación en esta versión | Estado verificable |
|---|---|---|
| 500 juegos automáticos desde listado público paginado | Importador SteamSpy + Steam Store App Details | Código listo; debe ejecutarse y verificarse en el entorno del equipo |
| 3 plataformas | Campo `platforms` | Pendiente: importador actual solo llena PC |
| 50 casos difíciles | Normalizador Levenshtein y candidatos | Pendiente: 50 pares revisados manualmente |
| 4 tiendas, 2 plataforma + 1 minorista; 2 precios por juego | Modelo de observaciones y links de tienda | Pendiente: conectores y autorizaciones; auditoría en `AUDITORIA_FUENTES.md` |
| 3 fuentes HTML, incluidas 2 tiendas | Adaptador HTML genérico | No habilitado; no se encontró evidencia suficiente de permiso para las fuentes obligatorias |
| Metacritic + otra calificación | Modelo `ExternalFact` | Pendiente: autorización/fuente Metacritic y segunda fuente |
| How Long To Beat | Modelo `ExternalFact` | Pendiente: acceso autorizado y datos |
| Portadas/metadatos | Steam header image en importador | Disponible para títulos que Steam devuelve; faltan otras plataformas |
| Precio actual/regular/formato/URL/fecha | `PriceObservation` y detalle API/web | Implementado para precio Steam importado cuando está disponible |
| Pipeline con colas acotadas | Cola de trabajo acotada entre descubrimiento/lectura y descarga; matching | Parcial: completar las seis etapas de producción e instrumentación individual |
| Secuencial/concurrente/paralelo | `run_pipeline` | Implementado; pruebas de equivalencia básicas pasan |
| Paralelismo por juego/fuente/tienda | Pools de E/S y procesos CPU | Parcial; falta pipeline completo multi-fuente y límites por dominio |
| Timeouts/reintentos/jitter/cola de fallidos | Adaptador HTML genérico | Parcial; implementar persistencia de fallidos por fuente en worker de producción |
| Contención: lock/local/concurrente + carrera | `contention_experiment` | Implementado; medir en el equipo y analizar resultados |
| Web: filtros, orden, cards, detalle, historial, métricas | Next.js + FastAPI | Implementado para datos existentes; falta gráfico temporal y filtros por tipo/formato más exhaustivos |
| Replay de respuestas reales y latencia simulada | Harness `benchmark_replay.py` | Código listo; faltan capturas reales autorizadas del catálogo completo |
| Barridos 1,2,4,8,16,32,64; 5 repeticiones | Harness de benchmark | Pendiente ejecutar en hardware del equipo y añadir barrido CPU requerido |
| Speedup, eficiencia, Amdahl, Karp–Flatt | `calculate_metrics` | Fórmulas implementadas; informe requiere mediciones reales |
| Acta/tablero/seguimiento/ADRs/cambios | Documentación base | Plantillas incluidas; equipo debe añadir fechas, responsables, tablero y evidencias |
| Bitácora IA y error real | `docs/bitacora-ia.md` | Debe completar el equipo con error reproducido, prompt, diagnóstico y corrección reales |
| Web pública y tarea programada | Guía de publicación | Pendiente cuentas, dominios, despliegue y cron activo |
| App Android | Kotlin + Compose consume catálogo y detalle API | Código incluido; build/APK y prueba en dispositivo pendientes |
| Defensa de 20 minutos | No es automatizable | Preparar predicción y defensa con resultados propios |

No marcar una fila como completa hasta guardar evidencia verificable (logs, capturas, commits, resultados o URL pública).
