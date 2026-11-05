# Seguridad específica de SQLite

## Inyección
| Forma | Riesgo | Correcto |
|---|---|---|
| `` `… WHERE name = '${name}'` `` | Inyección clásica | `WHERE name = ?` |
| `'… ORDER BY ' + req.query.sort` | Inyección en identificadores | Mapa en lista blanca + `z.enum` |
| `` `… IN (${ids.join(',')})` `` | Inyección si `ids` viene del usuario | `IN (${ids.map(() => '?').join(',')})` + `...ids` |
| `LIKE '%' \|\| ? \|\| '%'` sin escape | El usuario controla los comodines (`%` devuelve todo; patrones costosos) | Escapar `%`, `_`, `\` + `ESCAPE '\'`, longitud máxima |
| `db.exec(\`…${x}…\`)` | Sentencias apiladas | `prepare(...).run(...)`; `exec` solo con SQL constante |
| `PRAGMA ${name} = ${value}` desde la entrada | Cambiar el comportamiento de la base | PRAGMAs solo con constantes del código |
| `ATTACH DATABASE` con rutas del usuario | Leer o escribir archivos arbitrarios | Prohibido con datos externos |

Interpolar **constantes del código** (nombres de columna de una lista blanca, `PRAGMA user_version = <número de migración>`) no es inyección; márcalo como falso positivo con la justificación.

## Integridad
- `PRAGMA foreign_keys = ON` en **cada** conexión (incluidas las de scripts de migración y tests). Sin esto, las `FOREIGN KEY` declaradas no se aplican.
- Migraciones que desactivan `foreign_keys` para reconstruir tablas: deben reactivarlas y ejecutar `PRAGMA foreign_key_check` (resultado vacío) antes del `COMMIT`.
- `CHECK` y `NOT NULL` como última defensa (la validación va en el borde).
- Migraciones destructivas (`DROP`, `DELETE` masivo, cambios de tipo): plan de rollback con backup, declarado en el PR.

## El archivo de la base
- Fuera de los directorios servidos (`express.static`, `public/`).
- Permisos restringidos al usuario del proceso (en Unix, `600`/`640`).
- Excluido de git (`.gitignore`: `*.db`, `*.sqlite`, `*-wal`, `*-shm`, `data/`).
- Backups cifrados o en una ubicación con acceso restringido; nunca en el repo.
- **Datos sensibles**: SQLite no cifra en reposo. Contraseñas con hash fuerte; tokens de reset hasheados; PII mínima. Para cifrado en reposo hace falta una extensión (SQLCipher) o cifrado del disco: decisión de despliegue documentada.

## Disponibilidad
- Consultas sin `LIMIT` sobre tablas que crecen: A06.
- `LIKE '%…%'` sobre tablas grandes: escaneo completo; con entradas largas, DoS. Limita la longitud de `q`.
- Transacciones largas: bloquean al único escritor. `BEGIN IMMEDIATE` corto; nada de I/O externo (HTTP, email) dentro de una transacción.
- `busy_timeout` configurado si hay más de una conexión o proceso.

## Errores
Los mensajes de SQLite (`no such column`, `UNIQUE constraint failed: users.email`) revelan el esquema: nunca en respuestas; el servicio los traduce.
