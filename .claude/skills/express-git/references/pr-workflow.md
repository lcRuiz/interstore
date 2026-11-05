# Abrir el PR (backend)

## Checklist previa
- [ ] `git log --oneline <base>..HEAD`: Conventional Commits; migración identificada.
- [ ] `git diff --stat <base>...HEAD`: solo archivos de la feature (sin `.env`, `*.db`, `data/`, `.workflow/`, `dist/`).
- [ ] Reporte GREEN: suite, typecheck y build en verde.
- [ ] Informe de seguridad con veredicto APROBADO o APROBADO CON RIESGO ACEPTADO.
- [ ] `docs/features/<feature>.md`, `openapi.yaml` y `docs/security/<feature>-audit.md` commiteados.
- [ ] `gh auth status` ok y remoto configurado.

## Plan de rollback de migraciones (obligatorio si hay migraciones)
Responde en el PR:
1. **Qué cambia** en el esquema y en los datos.
2. **¿Es reversible?** `down` probado / irreversible (con el motivo).
3. **Cómo se revierte**: revertir el commit de la migración + `down`, o restaurar el backup.
4. **Backup previo**: comando para respaldar la base antes de aplicar (p. ej. `sqlite3 data/store.db ".backup data/store.backup.db"` o copiar el archivo con el servidor detenido, incluidos `-wal`/`-shm`). El agente **no** lo ejecuta sin la puerta humana.
5. **Compatibilidad**: ¿la versión anterior del código funciona con el esquema nuevo? (Importa si el despliegue no es atómico.)
6. **Tiempo y bloqueo**: ¿la migración bloquea escrituras mucho tiempo en tablas grandes?

## Puerta humana (push + PR)
```
PUERTA HUMANA: git push -u origin <rama> && gh pr create --base <base> --head <rama> --title "<title>" --body-file <tmp>
Commits: <git log --oneline base..HEAD>
Migraciones: <lista>
```

## Comandos
```bash
git push -u origin <rama>
gh pr create --base <base> --head <rama> --title "feat(orders): add checkout endpoint" --body-file <ruta-al-cuerpo.md>
gh pr view --json number,url
```
- El cuerpo va en un archivo (scratchpad o `.workflow/<feature>/pr-body.md`) para evitar problemas de escape en PowerShell y bash.
- Si el entorno pide terminar la descripción del PR con una línea de atribución, agrégala al final del cuerpo.
- CI: consulta el estado una vez (`gh pr checks <n>`); si falla, trátalo como un ajuste. No lo consultes en bucle.

## Después
Registra el número y la URL en `state.md`.
