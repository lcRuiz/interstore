# Autenticación, JWT y sesiones

Referencias oficiales: OWASP Cheat Sheets (Authentication, Password Storage, JSON Web Token, Session Management) en `https://cheatsheetseries.owasp.org/`. Consúltalas ante dudas de parámetros concretos (costes de hashing, longitudes).

## Contraseñas
- Hash con **argon2id** (preferido), **scrypt** o **bcrypt**, con parámetros de coste recomendados vigentes (verifícalos en el cheat sheet). Nunca `md5`, `sha1` ni `sha256` sin sal ni coste.
- Comparación mediante la función `verify` de la librería (tiempo constante).
- Política: longitud mínima razonable (≥ 8–12), máximo alto (≥ 64), sin reglas de composición arbitrarias; opcionalmente, rechazar contraseñas filtradas conocidas.
- Nunca registrar, devolver ni guardar la contraseña en claro (tampoco en logs de validación).

## Login y fuerza bruta
- Rate limiting por IP **y** por cuenta; bloqueo temporal o backoff progresivo.
- Mismo mensaje, status y tiempo aproximado para "usuario inexistente" y "contraseña incorrecta" (evita la enumeración).
- Registrar intentos fallidos (sin la contraseña) para alertas.

## JWT
- Algoritmo fijado al verificar (`algorithms: ['HS256']` o `['RS256']`); rechazar `none` y algoritmos inesperados.
- Secretos HMAC largos (≥ 256 bits) y aleatorios, desde la config validada; claves asimétricas fuera del repo.
- `exp` corto para el access token; `iss`/`aud` validados; `jwt.decode` **nunca** para autorizar (no verifica la firma).
- Revocación: lista de denegación o versión de token por usuario si el logout debe ser inmediato.
- Refresh tokens: rotación en cada uso, detección de reutilización, almacenados hasheados.
- No guardes datos sensibles en el payload (está codificado en base64, no cifrado).

## Sesiones y cookies
- Cookie de sesión: `httpOnly`, `secure` (HTTPS), `sameSite=lax|strict`, `path=/`, expiración.
- Regenerar el id de sesión al hacer login (evita la fijación de sesión).
- Invalidar en el servidor al hacer logout.
- Con cookies y CORS con credenciales: protección CSRF (`sameSite` + token o verificación de `Origin`).

## Autorización
- Rol desde la sesión o el token verificado; nunca desde el body o headers del cliente.
- Verificación por propiedad en cada recurso (ver A01 / IDOR).
- Denegar por defecto: una ruta nueva sin una regla explícita debe fallar cerrada.

## Este repo
`X-User-Id` (middleware `currentUser`) es una sesión **simulada**: no hay secreto ni firma, cualquiera puede suplantar a otro usuario. Está aceptado como supuesto de la prueba técnica. En las auditorías:
- Reporta como **informativo** "suplantación posible por diseño".
- Reporta como **alto** cualquier feature nueva que dependa de esa identidad para operaciones sensibles (pagos, administración, datos personales) sin un mecanismo real.
- Recomienda la sustitución (sesión con cookie `httpOnly` o JWT verificado) como trabajo futuro.
