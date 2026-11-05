# Norte

Una tienda online pequeña con catálogo, carrito, pedidos y un sistema de puntos. La armé como prueba técnica, y lo que más me importó no fue sumar pantallas sino decidir dónde vive cada regla (en el servidor) y cerrar las formas obvias de inflar los puntos.

Son dos aplicaciones en el mismo repositorio: una API en Node con Express y SQLite (`backend/`) y un cliente en Angular 21 (`frontend/`).

## Cómo ejecutarlo

Hace falta Node 22.16 o superior (la desarrollé con la 24) y npm. No hay que instalar ninguna base de datos: SQLite ya viene dentro de Node.

Primero la API:

```bash
cd backend
npm install
npm run dev
```

Queda en http://localhost:3000. La primera vez crea `data/store.db`, aplica las migraciones y carga datos de ejemplo: 3 categorías, 40 productos y 2 usuarios.

En otra terminal, el cliente:

```bash
cd frontend
npm install
npm start
```

Se abre en http://localhost:4200. Las llamadas a `/api` se reenvían a la API (ver `frontend/proxy.conf.json`), así que en desarrollo no hay que configurar CORS.

Para probarlo rápido: agrega un producto desde el catálogo (suma 10 puntos), agrégalo otra vez (ya no suma), abre el carrito y confirma el pedido.

Algunas cosas que conviene saber:

- La aplicación entra como Ana, el usuario 1. Para ver cómo se comporta con Carlos, cambia `DEFAULT_USER_ID` en `frontend/src/app/core/session/session.ts`.
- Para volver a los datos iniciales, detén la API y ejecuta `npm run db:reset` dentro de `backend/`. Borra `data/store.db` y la recrea, así que no lo uses si hay algo que quieras conservar.
- La API lee tres variables opcionales (`backend/.env.example`): `PORT`, `DB_PATH` y `CORS_ORIGIN`. Con los valores por defecto no hace falta crear ningún `.env`.
- Las pruebas se corren con `npm test` en cada carpeta. En el backend usan una base SQLite en memoria; en el frontend, `npx ng test --watch=false` hace una sola pasada. El frontend además tiene `npm run lint` y `npm run build`.

La API, si quieres llamarla a mano, pide el usuario en un encabezado:

```bash
curl -H "X-User-Id: 1" "http://localhost:3000/api/products?category=ropa&sort=price"
```

| Método | Ruta | Para qué sirve |
|---|---|---|
| GET | `/api/health` | Comprobar que la API responde (no pide usuario) |
| GET | `/api/me` | Usuario actual y saldo de puntos |
| GET | `/api/products` | Catálogo con `page`, `pageSize`, `category`, `q` y `sort` |
| GET | `/api/products/:id` | Detalle de un producto |
| GET | `/api/categories` | Categorías para el filtro |
| GET | `/api/cart` | Carrito del usuario |
| POST | `/api/cart/items` | Agregar un producto (suma la cantidad si ya estaba) |
| PATCH | `/api/cart/items/:productId` | Cambiar la cantidad de una línea |
| DELETE | `/api/cart/items/:productId` | Quitar una línea |
| POST | `/api/orders` | Confirmar el pedido; exige el encabezado `Idempotency-Key` |
| GET | `/api/orders/:id` | Ver un pedido propio |

El contrato completo, con los errores posibles, está en `backend/openapi.yaml`. Las pantallas son `/` (catálogo), `/products/:id`, `/cart` y `/orders/:id`.

## Decisiones de arquitectura

### El servidor decide, el cliente muestra

El enunciado pedía que el cliente nunca decidiera cuántos puntos se otorgan, y de ahí salió casi todo lo demás. Los precios, los totales, el stock y los puntos se calculan en la API; el frontend solo pinta lo que recibe. Por la misma razón el carrito vive en el servidor: si no puede ver qué agregaste, no puede darte puntos por agregarlo. No lo modelé como una entidad aparte (un `quote`, por ejemplo) porque cada usuario tiene un solo carrito y la compra es una operación atómica; si algún día hubiera carritos de invitado o varios carritos por usuario, esa tabla sí haría falta.

### Base de datos

Uso el módulo `node:sqlite` que trae Node en lugar de `better-sqlite3`. Evita compilar binarios nativos, que en Windows suele dar problemas, y su API síncrona hace muy simples las transacciones. La contra es que en la documentación de Node todavía figura como candidato a estable, y que SQLite admite un solo escritor a la vez: está bien para esto, pero no para varias instancias de la API sobre el mismo archivo.

El esquema se crea con migraciones versionadas (`PRAGMA user_version`) y todas las tablas son `STRICT`, para que una columna entera no acepte texto. Con las reglas de negocio hice lo mismo que con el cliente: si la base puede garantizarlas, no las dejo solo en el código. Por eso:

- Los puntos viven en un libro de movimientos (`points_ledger`) que solo admite inserciones. Un trigger suma cada movimiento al saldo del usuario, de modo que el saldo siempre es la suma del libro, y una restricción `UNIQUE (usuario, acción, referencia)` impide premiar dos veces lo mismo, incluso con dos peticiones simultáneas.
- Los pedidos guardan una copia del nombre y del precio de cada producto en el momento de la compra, así un cambio posterior en el catálogo no reescribe el historial.
- El dinero son enteros en pesos colombianos, nunca decimales.
- Las categorías son una tabla con un identificador legible (`slug`), que es lo que viaja en la URL del filtro.
- La búsqueda usa una columna `search_name` con el nombre en minúsculas y sin tildes. `LOWER()` de SQLite solo entiende ASCII, y quería que buscar «cafe» encontrara «Café». Con un catálogo de este tamaño un `LIKE` alcanza; para uno grande habría que pasar a FTS5.

El razonamiento completo del modelo está en `docs/adr/0001-data-model.md`.

### API

Sigue capas simples: rutas, servicios y repositorios. Los servicios no saben nada de HTTP y los repositorios no tienen reglas de negocio. La aplicación se construye con una función `createApp({ db })`, que es lo que permite probar todo contra una base en memoria con las migraciones reales en lugar de simular la base con mocks; así los errores de SQL y las restricciones se descubren en las pruebas.

La entrada se valida con Zod en el borde, y todos los errores salen con la misma forma, `{ error: { code, message, details } }`, donde el `code` es estable para que el cliente decida qué mostrar sin depender del texto.

Confirmar un pedido ocurre dentro de una sola transacción: se leen las líneas del carrito, se valida el stock de todas antes de escribir nada, se descuenta, se crea el pedido, se registran los puntos y se vacía el carrito. Si falla cualquier paso, no queda nada a medias. Para que un doble clic o un reintento tras una caída de red no cree dos pedidos, el cliente manda un `Idempotency-Key`: si esa clave ya se usó, la API devuelve el pedido original sin tocar stock ni puntos.

La paginación y los filtros se resuelven en el servidor con `LIMIT/OFFSET`. Elegí offset por simplicidad, porque el catálogo es chico y estable; con millones de filas pasaría a paginar por cursor.

### Frontend

Angular 21 con componentes independientes, sin zone.js y con signals para el estado. El código está organizado por funcionalidad (`catalog`, `cart`, `orders`, `rewards`), cada una con sus servicios de datos, sus componentes y sus páginas; lo transversal vive en `core` y `shared`.

- Los filtros del catálogo (categoría, búsqueda, orden y página) viven en la URL. Así se puede compartir un enlace y el botón Atrás funciona. La búsqueda espera 300 ms tras la última tecla y cancela la petición anterior, para que una respuesta lenta no pise a una más nueva.
- El carrito es optimista: al agregar, cambiar o quitar, la pantalla responde al instante y luego se reconcilia con lo que devuelve el servidor. Si la petición falla, se deshace solo esa línea y se avisa. Las operaciones sobre un mismo producto se encolan para que varios clics rápidos no se pisen.
- Los puntos no son optimistas: el saldo cambia solo cuando el servidor responde. Confirmar el pedido tampoco lo es, porque es la operación sensible; el botón espera y se bloquea mientras tanto.
- Cada vista que depende de la API muestra explícitamente sus cuatro estados: cargando, error (con «Reintentar» solo si tiene sentido), vacío y con datos.
- Los estilos son SCSS sobre variables CSS que salen de un sistema de diseño propio (colores, tipografía Geist, espaciado), en `frontend/src/styles/_tokens.scss`. Ningún componente usa colores o medidas sueltas.

## Reglas de puntos

Hay dos formas de ganar puntos.

**Agregar un producto al carrito: 10 puntos, una sola vez por usuario y producto.** Ni la cantidad, ni agregarlo y quitarlo y volverlo a agregar, ni cambiarle la cantidad después suman más. Tampoco da puntos un producto agotado ni una petición que falle.

**Confirmar un pedido: 1 punto por cada $10.000 de cada línea, multiplicado por el factor del producto.** Algunos productos tienen la insignia «Puntos x2», que duplica sus puntos. El redondeo es hacia abajo y se hace por línea, no sobre el total del pedido. Ejemplos con los datos de muestra: un Andes Runner (x2, $2.490.000) da 498 puntos; una Camiseta Esencial ($590.000) da 59; tres Calcetines Merino ($390.000 cada uno) dan 117. Los puntos de un pedido se otorgan una sola vez; si el pedido no puede completarse, no se otorga nada.

Al principio pensé en un punto por cada $1.000, pero con los precios de muestra un solo par de zapatillas habría dado casi cinco mil puntos, cientos de veces más de lo que vale agregar al carrito. Con $10.000 los números quedan en una escala razonable y cerca del diez por ciento que sugería el diseño.

Qué no resta ni suma: quitar un producto del carrito no quita los puntos ya ganados. Como cada producto da sus 10 puntos una sola vez, el máximo posible por esta vía es 10 por cada producto del catálogo, 400 con los datos de muestra.

Cómo se protege todo esto, en la práctica: los premios pasan por el libro de movimientos con su restricción de unicidad, la validación del stock ocurre antes de otorgar nada, todo va en una transacción y el cliente no envía nunca puntos, precios ni totales (si los manda, la API los rechaza o los ignora). Cada una de estas trampas tiene su prueba automática.

Hay un límite que no pude cerrar: como no hay pago, comprar no cuesta nada, y alguien podría pedir muchas veces el producto más barato para acumular puntos. Lo acota que el stock baja de forma permanente, pero la defensa de verdad sería cobrar.

Los favoritos estaban pensados para dar 5 puntos (la tabla y el tipo de movimiento ya existen), pero no los implementé.

## Supuestos

- No hay autenticación real. La API identifica al usuario con el encabezado `X-User-Id`, y hay dos usuarios de ejemplo (Ana y Carlos). Es una simulación, no un mecanismo de seguridad: cualquiera podría hacerse pasar por otro. Para algo real habría que reemplazarlo por sesión o token sin tocar las reglas.
- Los precios están en pesos colombianos y son enteros. Los precios del diseño original se multiplicaron por mil para que tuvieran sentido en esa moneda.
- No hay pago, dirección ni envío. Un pedido queda confirmado al instante y el stock se descuenta en ese momento, no al agregar al carrito. Por eso el carrito no reserva nada: dos personas pueden tener la última unidad en el carrito y solo una podrá comprarla.
- Una línea del carrito admite hasta 99 unidades, y nunca más que el stock.
- En el catálogo, una categoría que no existe o una página fuera de rango devuelven una lista vacía, no un error. El tamaño de página es 12 en la interfaz y 50 como máximo en la API.
- Las fotos de los productos son enlaces a picsum.photos, así que hace falta conexión para verlas.
- La base de datos es un solo archivo local. No está pensada para varias instancias de la API, y las bases creadas con una versión anterior del esquema hay que recrearlas con `npm run db:reset`.
- Si falla la red al confirmar un pedido, el cliente reintenta con la misma clave. Si el servidor responde con un error definitivo (sin stock, carrito vacío), la clave se descarta y el siguiente intento es uno nuevo.

## Lo que quedó fuera

Favoritos, historial de pedidos, pago y envío, cancelación de pedidos, límite de peticiones por usuario, pruebas de extremo a extremo y una integración continua que corra las pruebas en cada cambio. El backend no tiene linter. Además, `npm audit` marca avisos en Vitest, la herramienta de pruebas: no forma parte de lo que se ejecuta en producción, pero arreglarlos implica subir una versión mayor.

## Estructura

```
backend/
  src/
    app.ts, server.ts, config.ts
    db/            conexión, migraciones, datos de ejemplo
    errors/        errores de la API y manejador común
    middleware/    validación y usuario actual
    modules/       users, products, cart, orders, rewards
  tests/
  openapi.yaml
frontend/
  src/
    app/
      core/        sesión, errores de la API, layout
      shared/      componentes y utilidades reutilizables
      features/    catalog, cart, orders, rewards
    styles/        tokens de diseño
docs/
  adr/             decisiones de diseño (modelo de datos)
  features/        una nota por funcionalidad
  security/        revisión de seguridad de cada una
  reviews/         revisiones de código
```

Cada funcionalidad entró por su propio pull request, con commits en el formato de Conventional Commits, de modo que el historial se puede leer de a una pieza por vez.
