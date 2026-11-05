# Antipatrón → alternativa (Express + SQLite)

| Antipatrón | Alternativa | Por qué |
|---|---|---|
| SQL con template strings o concatenación | Placeholders `?` / `:name` | Inyección SQL |
| `ORDER BY ${req.query.sort}` | Lista blanca + `z.enum` | Columnas no parametrizables |
| `LIKE '%' + q + '%'` sin escape | `escapeLike` + `ESCAPE '\'` | Comodines del usuario alteran la consulta |
| `INSERT … VALUES (${Object.values(req.body)})` / `UPDATE SET` con el body completo | DTO explícito con los campos permitidos | Mass assignment |
| `SELECT * FROM orders WHERE id = ?` en un recurso del usuario | `WHERE id = ? AND user_id = ?` | IDOR/BOLA |
| SQL o reglas de negocio en la ruta | Servicio + repositorio | Testabilidad y responsabilidades |
| `res.status(500).json({ error: err.message, stack })` | Error handler central con mensaje genérico | Fuga de información |
| `try { … } catch { }` | Traducir a `AppError` o propagar | Errores silenciados |
| Handler `async` sin `asyncHandler` en Express 4 | `asyncHandler` o migrar a 5 | Peticiones colgadas |
| `process.env.X` disperso | `config.ts` validado al arrancar | Falla rápido y un solo lugar |
| Singleton de conexión importado en todos lados | `createApp(deps)` + fábricas | Tests con `:memory:` |
| Chequear stock fuera de la transacción | Leer y escribir dentro de `BEGIN IMMEDIATE` | Condición de carrera |
| Varias sentencias en un `exec` con datos | Una sentencia parametrizada por llamada | Inyección apilada |
| Editar una migración ya aplicada | Migración nueva | Esquemas divergentes entre entornos |
| `PRAGMA foreign_keys` olvidado | Activarlo en cada conexión | Integridad referencial desactivada |
| Floats para dinero | Enteros | Redondeos |
| Devolver filas crudas | Mapear a DTO | Expone columnas internas |
| Listados sin límite | Paginación con máximo | DoS y rendimiento |
| `cors({ origin: '*', credentials: true })` | Origen explícito | Robo de datos cross-origin |
| `app.set('trust proxy', true)` sin proxy | Valor explícito por entorno | `req.ip` falsificable |
| `Object.assign(target, req.body)` / merge profundo con entrada | Copia de campos permitidos | Prototype pollution |
| Logs con body completo | Campos estructurados + redacción | Fuga de PII y secretos |
