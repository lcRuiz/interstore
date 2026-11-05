---
tags: [angular-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Tenemos este componente heredado sin pruebas en frontend/src/app/features/catalog/legacy/product-list/. Hay que agregarle un filtro por categoría (select con las categorías únicas de los productos; "Todas" muestra todo). Llévalo a Angular 21 de paso, pero sin romper lo que ya hace.

Input files: product-list.component.ts
