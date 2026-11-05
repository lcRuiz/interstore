# Abrir el PR

## Checklist previa
- [ ] `git log --oneline <base>..HEAD`: commits con el formato correcto.
- [ ] `git diff --stat <base>...HEAD`: solo archivos de la feature (sin `.workflow/`, `.env` ni `dist/`).
- [ ] Suite, lint, formato y build en verde (reporte GREEN).
- [ ] Informe de seguridad con veredicto APROBADO o APROBADO CON RIESGO ACEPTADO.
- [ ] `docs/features/<feature>.md` y `docs/security/<feature>-audit.md` commiteados.
- [ ] `gh auth status` ok y remoto configurado.

## Puerta humana (push + PR)
Muestra antes de ejecutar:
```
PUERTA HUMANA: git push -u origin <rama> && gh pr create --base <base> --head <rama> --title "<title>" --body-file <tmp>
Commits: <git log --oneline base..HEAD>
Título: <title>
```

## Comandos
```bash
git push -u origin <rama>
gh pr create --base <base> --head <rama> --title "feat(cart): add optimistic cart" --body-file <ruta-al-cuerpo.md>
gh pr view --json number,url
```
- Escribe el cuerpo en un archivo temporal (en el scratchpad o en `.workflow/<feature>/pr-body.md`) y pásalo con `--body-file`. Así evitas problemas de escape en PowerShell y bash.
- Título: Conventional Commit que resume el PR (normalmente el del commit `feat`/`fix` principal).
- Etiquetas o reviewers solo si el repo los usa (`--label`, `--reviewer`).
- Si el entorno pide terminar la descripción del PR con una línea de atribución, agrégala al final del cuerpo.

## Cuerpo
Plantilla del repo (`.github/pull_request_template.md`) si existe; si no, `assets/pr-body.template.md`. Rellena con datos reales:
- Matriz requerimiento→test: tomada de `.workflow/<feature>/test-matrix.md`.
- Resultados: números del reporte GREEN (no los redondees ni los infles).
- Seguridad: veredicto, edición OWASP, hallazgos resueltos o aceptados y enlace al informe.
- Riesgos y supuestos: los del estado.

## Después de crear
- Registra el número y la URL en `state.md`.
- Si el repo tiene CI, no la consultes en bucle: revisa el estado una vez (`gh pr checks <n>`) y, si falla, trátalo como un ajuste (sección de ciclo de ajustes).
