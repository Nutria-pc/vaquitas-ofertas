# ADR-002 · Persistencia
- Fecha: 2026-11-16
- Contexto: catálogo, hechos externos y observaciones históricas.
- Alternativas: SQLite local; PostgreSQL administrado.
- Decisión: SQLite en desarrollo y PostgreSQL en producción.
- Consecuencias: migraciones y URL DATABASE_URL deben configurarse para despliegue.
- Estado: propuesta.
