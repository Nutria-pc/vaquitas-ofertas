# ADR-007 · Hosting
- Fecha: completar por el equipo
- Contexto: sitio público y tarea programada de scraping.
- Alternativas: Vercel para web; backend/worker persistente en Render/Railway/Fly/VPS.
- Decisión: web Vercel y API/worker persistente independiente.
- Consecuencias: CORS, HTTPS, PostgreSQL, secretos y cron configurados.
- Estado: propuesta.
