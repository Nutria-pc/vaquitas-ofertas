# Informe técnico — RADAR GAMING

> Plantilla de informe. No completar con números inventados. Adjuntar logs, snapshots autorizados, hardware y gráficos producidos por la ejecución real.

## 1. Ficha del equipo de medición
- CPU / modelo:
- Núcleos físicos:
- Núcleos lógicos:
- SMT:
- RAM:
- Sistema operativo:
- Python:
- Fecha de medición:
- Versión/commit:

## 2. Fuentes y catálogo
- Listado paginado utilizado:
- Número de juegos verificados:
- Plataformas:
- Tiendas y evidencia de permiso:
- Fuentes HTML y fecha de auditoría:
- Pares difíciles revisados:
- Metacritic / segunda calificación:
- HowLongToBeat:

## 3. Validación del emparejamiento
- Tamaño del conjunto manual (mínimo 60 pares):
- Verdaderos positivos:
- Falsos positivos:
- Falsos negativos:
- Precisión:
- Exhaustividad:
- Umbral elegido y justificación:

## 4. Diseño experimental
- Snapshot replay y hash:
- Latencia fija:
- Latencia variable:
- Repeticiones (mínimo 5):
- Barrido E/S: 1, 2, 4, 8, 16, 32, 64:
- Barrido CPU: 1, 2, 4, hasta núcleos lógicos y doble:
- Mediana y dispersión por etapa:

## 5. Resultados
Adjuntar tabla por etapa y pipeline completo con T_sec, T_par(1), T_par(p), S_abs, S_rel, eficiencia y Karp–Flatt. Adjuntar curvas de speedup y eficiencia.

## 6. Experimento de contención
Comparar lock global, estado local por hilo y colección concurrente. Adjuntar la carrera sin sincronización y la corrección.

## 7. Respuestas a las ocho preguntas de la sección 12
1. Descarga y workers frente a núcleos:
2. Cuello de botella y efecto de latencia:
3. Fracción serial estimada:
4. Efecto de superar núcleos lógicos / SMT:
5. ThreadPoolExecutor vs ProcessPoolExecutor (Python):
6. Costo del andamiaje paralelo:
7. Ejecución viva frente a replay:
8. Predicciones Hito 1 frente a mediciones:

## 8. Limitaciones, cambios de diseño y conclusiones
- ADRs:
- Cambios respecto al Hito 1:
- Restricciones de fuentes:
- Amenazas a la validez:
- Conclusiones basadas en mediciones:
