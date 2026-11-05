---
tags: [express-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Agrega al backend un endpoint para que solo los administradores ajusten el stock: PATCH /api/admin/products/:id/stock con { stock: entero >= 0 }. Hoy los usuarios no tienen rol; agrega el rol (customer por defecto) y marca al usuario 2 como admin en el seed. Con TDD y pasando por la auditoría de seguridad.
