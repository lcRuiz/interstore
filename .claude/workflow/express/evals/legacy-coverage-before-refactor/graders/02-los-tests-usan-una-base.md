---
type: llm
focus: trace
weight: 1
---

Los tests usan una base :memory: inyectada y nunca la base data/store.db; el singleton de conexión se reemplazó por una dependencia inyectada.
