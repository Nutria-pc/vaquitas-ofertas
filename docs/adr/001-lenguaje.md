# ADR-001 · Lenguaje
- Fecha: 2026-11-16
- Contexto: el curso permite Python 3.11+ o C# .NET 8+; se requiere distinguir concurrencia de E/S y paralelismo CPU.
- Alternativas: Python (ecosistema scraping y ProcessPoolExecutor); C# (.NET TPL y Channels).
- Decisión: propuesta Python 3.11+ para esta base.
- Consecuencias: el GIL obliga a usar procesos para el cálculo CPU; medir y documentar overhead.
- Estado: propuesta; el equipo debe aceptarla o reemplazarla.
