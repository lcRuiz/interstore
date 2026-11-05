import { transaction, type Db } from './connection.js';

interface SeedProduct {
  name: string;
  price: number;
  stock: number;
}

/** Precios en COP. Algunos productos con stock bajo o en 0 para probar casos borde. */
const catalog: Record<string, SeedProduct[]> = {
  Tecnología: [
    { name: 'Audífonos inalámbricos', price: 189_900, stock: 25 },
    { name: 'Teclado mecánico', price: 249_900, stock: 12 },
    { name: 'Mouse ergonómico', price: 89_900, stock: 40 },
    { name: 'Monitor 27 pulgadas', price: 1_099_000, stock: 5 },
    { name: 'Cargador USB-C 65W', price: 119_900, stock: 30 },
    { name: 'Parlante bluetooth', price: 159_900, stock: 18 },
    { name: 'Cámara web HD', price: 139_900, stock: 0 },
    { name: 'Disco SSD 1TB', price: 329_900, stock: 9 },
  ],
  Hogar: [
    { name: 'Cafetera de goteo', price: 149_900, stock: 15 },
    { name: 'Juego de sartenes', price: 219_900, stock: 10 },
    { name: 'Lámpara de escritorio', price: 79_900, stock: 22 },
    { name: 'Set de toallas', price: 99_900, stock: 35 },
    { name: 'Licuadora', price: 179_900, stock: 8 },
    { name: 'Organizador de cocina', price: 59_900, stock: 28 },
    { name: 'Almohada viscoelástica', price: 129_900, stock: 2 },
    { name: 'Vela aromática', price: 39_900, stock: 50 },
  ],
  Deportes: [
    { name: 'Balón de fútbol', price: 89_900, stock: 30 },
    { name: 'Tapete de yoga', price: 69_900, stock: 24 },
    { name: 'Mancuernas 5 kg (par)', price: 119_900, stock: 14 },
    { name: 'Botella térmica', price: 49_900, stock: 60 },
    { name: 'Cuerda para saltar', price: 29_900, stock: 45 },
    { name: 'Raqueta de tenis', price: 289_900, stock: 6 },
    { name: 'Bandas elásticas', price: 39_900, stock: 0 },
    { name: 'Guantes de ciclismo', price: 59_900, stock: 20 },
  ],
  Libros: [
    { name: 'Cien años de soledad', price: 64_900, stock: 20 },
    { name: 'Clean Code', price: 159_900, stock: 7 },
    { name: 'El principito', price: 34_900, stock: 40 },
    { name: 'Hábitos atómicos', price: 74_900, stock: 18 },
    { name: 'Sapiens', price: 84_900, stock: 11 },
    { name: 'Diseño de sistemas', price: 179_900, stock: 4 },
    { name: 'La sombra del viento', price: 69_900, stock: 15 },
    { name: 'Cuentos de Borges', price: 54_900, stock: 9 },
  ],
  Moda: [
    { name: 'Camiseta básica', price: 49_900, stock: 80 },
    { name: 'Chaqueta impermeable', price: 259_900, stock: 10 },
    { name: 'Tenis urbanos', price: 239_900, stock: 16 },
    { name: 'Gorra deportiva', price: 44_900, stock: 33 },
    { name: 'Morral para portátil', price: 169_900, stock: 12 },
    { name: 'Reloj análogo', price: 199_900, stock: 3 },
    { name: 'Gafas de sol', price: 129_900, stock: 21 },
    { name: 'Bufanda de lana', price: 59_900, stock: 0 },
  ],
};

const users = [
  { id: 1, name: 'Ana Demo' },
  { id: 2, name: 'Carlos Demo' },
];

/** Carga datos de demo si la base está vacía. Idempotente. */
export function seed(db: Db): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (count > 0) return;

  transaction(db, () => {
    const insertUser = db.prepare('INSERT INTO users (id, name) VALUES (?, ?)');
    for (const user of users) insertUser.run(user.id, user.name);

    const insertProduct = db.prepare(
      'INSERT INTO products (name, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?)',
    );
    let index = 0;
    for (const [category, products] of Object.entries(catalog)) {
      for (const product of products) {
        index += 1;
        // Imágenes de placeholder determinísticas (dependencia externa aceptada para la demo).
        const imageUrl = `https://picsum.photos/seed/store-${index}/480/480`;
        insertProduct.run(product.name, product.price, category, imageUrl, product.stock);
      }
    }
  });
}
