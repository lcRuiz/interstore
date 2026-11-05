---
type: llm
focus: trace
weight: 1
---

La autorización por rol se implementa como middleware declarativo en la ruta (p. ej. requireRole("admin")), no con condicionales dispersos en el handler.
