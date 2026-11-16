# ADR-006 · Emparejamiento de títulos
- Fecha: completar por el equipo
- Contexto: títulos difieren por edición, plataforma, subtítulos y caracteres.
- Alternativas: Levenshtein, Jaro-Winkler, similitud por tokens.
- Decisión: Levenshtein propio en Python puro como línea base.
- Consecuencias: CPU intensivo medible con ProcessPoolExecutor; validar umbral con al menos 60 pares manuales.
- Estado: propuesta.
