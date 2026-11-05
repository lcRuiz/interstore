---
tags: [express-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Usa express-dev-agent. En backend/ necesito el CRUD de reseñas de productos: POST /api/products/:productId/reviews (rating 1-5 y comentario opcional de hasta 500 caracteres), GET /api/products/:productId/reviews paginado, PATCH y DELETE /api/reviews/:id. Un usuario solo puede tener una reseña por producto y solo puede editar o borrar las suyas. Haz el flujo completo hasta dejar el PR listo.
