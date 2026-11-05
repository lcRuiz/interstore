# Checklist de PR (Angular 21)

`angular-develop` la usa antes de cerrar la fase 2 y `angular-git` la usa para revisar el PR. Marca cada ítem o justifica la excepción.

## Correctitud y pruebas
- [ ] Cada requerimiento de la matriz tiene tests y están en verde.
- [ ] La suite completa pasa (`npx ng test --watch=false`), no solo los tests nuevos.
- [ ] Ningún test modificado, saltado o relajado sin justificación registrada.
- [ ] Estados de carga, vacío, error y éxito implementados y probados.
- [ ] Errores HTTP mapeados a `ApiError`; la UI decide por `code`.
- [ ] Mutaciones optimistas con rollback y reconciliación con el servidor.

## Arquitectura (convenciones del repo)
- [ ] Archivos en `core` / `shared` / `features/<f>/{data-access,ui,pages}` según corresponda.
- [ ] Sin imports de internals de otras features; alias `@core/@shared/@features`.
- [ ] Componentes `ui` sin servicios de datos inyectados.
- [ ] Rutas lazy.

## Angular moderno
- [ ] OnPush, `input()/output()/model()`, `inject()`, `host: {}`.
- [ ] `@if/@for/@switch` con `track`; sin `ngClass/ngStyle`.
- [ ] Estado con signals; `effect` solo para efectos externos; sin suscripciones sin cleanup.
- [ ] APIs experimentales solo con decisión documentada.

## Seguridad (ver `security-rules.md`)
- [ ] Sin `innerHTML` con datos externos ni `bypassSecurityTrust*` sin justificación auditada.
- [ ] Sin secretos ni tokens en el código, `environment.ts` o storage del navegador.
- [ ] Redirecciones con parámetros validadas (solo rutas internas).
- [ ] Headers de identidad solo hacia el origen de la API.
- [ ] Dependencias nuevas justificadas y auditadas.

## Rendimiento
- [ ] `track` por id estable; `@defer` en contenido pesado no crítico.
- [ ] `NgOptimizedImage` en imágenes de contenido.
- [ ] Sin cálculos en el template; `computed` memoizados.
- [ ] Presupuestos del build respetados.

## Accesibilidad
- [ ] HTML semántico, foco visible, navegación por teclado.
- [ ] Botones de solo ícono con `aria-label`; `aria-live` en cambios dinámicos.
- [ ] Contraste con los tokens semánticos.

## Estilo y documentación
- [ ] `npm run lint` y `npm run format:check` en verde.
- [ ] Solo tokens CSS; mobile-first.
- [ ] TSDoc en la API pública; marcadores `SUPUESTO:`/`RECORTE:`/`TODO(feature):`.
- [ ] `docs/features/<feature>.md` refleja lo implementado.
- [ ] Commits en Conventional Commits; PR con matriz y resumen de seguridad.
