---
type: llm
focus: trace
weight: 1
---

La implementación separa routes/controller, service y repository; todo el SQL está parametrizado y PATCH/DELETE filtran por dueño en la consulta.
