---
tags: [express-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Implementa GET /api/products en el backend: paginación (page, pageSize con máximo 50), filtro por category, búsqueda por nombre con q y orden con sort (name, price o newest). Respuesta { data, meta: { page, pageSize, total, totalPages } } y errores con el formato del repo. Primero los tests.
