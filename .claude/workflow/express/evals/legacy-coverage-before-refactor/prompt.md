---
tags: [express-dev-agent]
max_turns: 120
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Este módulo de cupones es heredado y no tiene pruebas. Quiero que lo integres en backend/src/modules/coupons/, que le pongas cobertura antes de tocarlo, lo lleves a la arquitectura del proyecto y luego agregues la regla nueva: un cupón vencido (expires_at en el pasado) debe responder 410 COUPON_EXPIRED.

Input files: coupons.legacy.ts
