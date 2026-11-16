# Bitácora de IA

Registrar cada uso relevante:
- Fecha:
- Herramienta/modelo:
- Prompt o tarea:
- Resultado obtenido:
- Qué se aceptó:
- Qué se modificó/rechazó y por qué:
- Quién revisó y probó:
- Evidencia (commit/test):

## Entrada obligatoria: defecto real de concurrencia
No inventar esta entrada. Cuando el equipo detecte un defecto real producido por IA, documentar:
- Código/prompt que lo produjo:
- Defecto (race/deadlock/oversubscription/GIL):
- Cómo se reprodujo:
- Evidencia de prueba/log:
- Causa:
- Corrección:
- Prueba que demuestra la corrección:

## Entrada de trabajo realizada durante la preparación de esta versión
- Fecha: 2026-11-16
- Herramienta/modelo: ChatGPT (asistencia de programación)
- Tarea: revisar y ampliar el proyecto existente según el documento IC-3101; implementar pipeline acotado, pruebas, API, web y cliente Android.
- Resultado obtenido: cambios en backend, web, Android y documentación; siete pruebas unitarias del backend.
- Qué se aceptó: normalización Levenshtein, ejecución secuencial/concurrente/paralela, colas acotadas de trabajo, contador de fallos y fórmulas de métricas.
- Qué se modificó/rechazó y por qué: no se activó scraping de PlayStation, Metacritic o GOG debido a restricciones explícitas de sus términos; se documentaron fuentes alternativas/permisos como requisito pendiente.
- Quién revisó y probó: preparación asistida por IA; el equipo debe revisar y repetir pruebas en su equipo.
- Evidencia: `backend/tests/test_core.py`; `docs/ESTADO_REAL.md`.

### Defecto de concurrencia detectado en código generado por IA
- Código/tarea que lo produjo: primera versión de la cola acotada de resultados de `run_pipeline` generada al implementar workers concurrentes.
- Defecto: la cola de resultados también tenía capacidad limitada, pero el hilo principal esperaba a que terminaran los workers antes de consumirla. Si había más resultados que capacidad, los workers podían bloquearse al publicar y el hilo principal esperaba indefinidamente: interbloqueo.
- Cómo se detectó: revisión del flujo productor-consumidor antes de cerrar la implementación; el caso límite se convirtió en una prueba con 20 elementos y `queue_size=1`.
- Causa: aplicar backpressure a la salida sin un consumidor activo durante la producción.
- Corrección: mantener acotada la cola de entrada y recolectar resultados en una lista protegida con lock, evitando una segunda cola bloqueante sin consumidor.
- Prueba de regresión: `test_bounded_queue_with_more_items_than_capacity` en `backend/tests/test_core.py`; pasa con 20 elementos y capacidad 1.
- Nota: el equipo debe revisar el defecto, ejecutar la prueba y explicar el interbloqueo en la defensa.
