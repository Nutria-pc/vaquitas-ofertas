# ADR-005 · Límites de concurrencia
- Fecha: completar por el equipo
- Contexto: varios niveles de trabajo pueden multiplicar solicitudes.
- Alternativas: 1/2/4 workers por dominio; límites por etapa; colas acotadas.
- Decisión: iniciar con 8 workers E/S globales, máximo 2 por dominio y ajustar tras medir.
- Consecuencias: registrar throughput, errores, latencia y backpressure.
- Estado: propuesta; validar en pruebas.
