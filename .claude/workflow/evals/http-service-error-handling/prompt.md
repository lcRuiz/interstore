---
tags: [angular-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Con TDD, crea en frontend el cliente CatalogApi para GET /api/products con query params page, pageSize, category y q (solo enviar los que tengan valor). Respuesta: { data: Product[], meta: { page, pageSize, total, totalPages } }. Errores del backend: { error: { code, message, details? } } con 400 VALIDATION_ERROR; también hay que manejar caída de red y 5xx. Product = { id, name, price, category, imageUrl, stock }.
