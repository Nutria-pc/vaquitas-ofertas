# Auditoría de fuentes y límites de uso

Revisión documental realizada el 16-11-2026. Esta matriz no sustituye una autorización escrita ni asesoría legal. Antes de habilitar un conector se debe volver a comprobar la versión vigente de los términos y `robots.txt`.

| Fuente | Uso previsto | Evidencia revisada | Decisión técnica |
|---|---|---|---|
| Steam Store | Descubrimiento/metadatos/precio PC | Steam Store App Details JSON se usa en el importador; el acceso debe respetar disponibilidad y límites del servicio | Conector de catálogo implementado; guardar hora, moneda original y URL de producto |
| SteamSpy | Listado público paginado para etapa 0 | API documentada; endpoint `all` está limitado a una solicitud por minuto | Importador respeta pausa y limita a una página por ejecución |
| PlayStation Store | Precio plataforma | Términos PlayStation prohíben métodos automatizados como bots/scripts para interactuar con contenido | **No hacer scraping**. Requiere fuente alternativa autorizada o permiso escrito y aprobación del curso |
| Metacritic | Calificación obligatoria | Términos de Fandom/Metacritic prohíben scraping, minería de datos y extracción automatizada no autorizada | **No hacer scraping**. Se requiere permiso/API licenciada o sustitución formal aprobada; no se inventan Metascores |
| GOG | Precio plataforma | Acuerdo de usuario prohíbe bots, spiders, scripts y herramientas automatizadas no autorizadas que interactúen con servicios/contenido | No habilitar crawler. Buscar autorización o una API/partner autorizado |
| HowLongToBeat | Duración | No se ha verificado una API pública autorizada para este proyecto | Conector pendiente de autorización/fuente aprobada |
| Minoristas | Precio físico | No se ha conseguido evidencia de una API pública reutilizable y autorizada para este proyecto | No automatizar hasta identificar API/afiliación/permiso de cada minorista |

## Fuentes oficiales consultadas

- PlayStation Website Terms of Use: https://www.playstation.com/en-us/legal/website-terms-of-use/ (incluye prohibición de scraping y text/data mining).
- Metacritic / Fandom Terms of Service: https://www.fandom.com/terms-of-service-pp1 (prohíbe scraping no autorizado y almacenamiento/copia de contenido).
- GOG User Agreement: https://support.gog.com/hc/en-us/articles/212632089-GOG-User-Agreement (prohíbe automatización no autorizada).
- SteamSpy API docs: https://steamspy.com/api.php (documentación de endpoints y límites; consultar la documentación actual antes de ejecutar).

## Consecuencia para IC-3101

El proyecto no puede declarar satisfecho el mínimo de cuatro tiendas, dos tiendas HTML, tres fuentes HTML, Metacritic y HowLongToBeat mientras no existan fuentes autorizadas para esos usos. No se activan selectores HTML genéricos contra servicios que prohíben extracción automatizada. La salida responsable es pedir al profesor aprobación de sustituciones equivalentes y/o conseguir permisos de las fuentes, dejando evidencia en ADRs.
