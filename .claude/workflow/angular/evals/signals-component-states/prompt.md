---
tags: [angular-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Necesito la página del catálogo en frontend: un CatalogStore con signals que cargue productos (asume que ya existe CatalogApi.list(params) que devuelve Observable<Paginated<Product>>) y una CatalogPage que muestre skeleton al cargar, estado vacío "No hay productos para este filtro", error con botón Reintentar si el error es reintentable, y la grilla al tener datos. Sigue el flujo de tests primero.
