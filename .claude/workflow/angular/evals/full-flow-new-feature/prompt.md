---
tags: [angular-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Usa el agente angular-dev-agent. En frontend/ quiero un indicador de puntos en el header: debe mostrar el saldo del usuario actual consumiendo GET /api/me (respuesta { data: { id, name, pointsBalance } }), con estado de carga (skeleton), error con reintento y el número formateado en es-CO. Haz el flujo completo hasta dejar el PR listo; el backend corre en localhost:3000.
