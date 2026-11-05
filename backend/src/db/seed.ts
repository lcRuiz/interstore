import { transaction, type Db } from './connection.js';
import { normalizeSearch } from './search-name.js';

interface SeedCategory {
  slug: string;
  name: string;
}

interface SeedProduct {
  name: string;
  /** COP, entero. */
  price: number;
  stock: number;
  category: string;
  pointsMultiplier: 1 | 2;
}

const categories: SeedCategory[] = [
  { slug: 'calzado', name: 'Calzado' },
  { slug: 'ropa', name: 'Ropa' },
  { slug: 'accesorios', name: 'Accesorios' },
];

/**
 * Los 12 productos del diseño (`design/project/data.js`), con el precio del
 * diseño x1000 (COP). `x2: true` → multiplicador 2; `badge: 'Agotado'` → stock 0.
 */
const designProducts: SeedProduct[] = [
  { name: 'Andes Runner', price: 2_490_000, stock: 12, category: 'calzado', pointsMultiplier: 2 },
  { name: 'Sudadera Merino', price: 1_890_000, stock: 8, category: 'ropa', pointsMultiplier: 1 },
  { name: 'Chaqueta Brisa', price: 3_290_000, stock: 15, category: 'ropa', pointsMultiplier: 2 },
  { name: 'Mochila Diaria 22 L', price: 1_450_000, stock: 20, category: 'accesorios', pointsMultiplier: 2 },
  { name: 'Camiseta Esencial', price: 590_000, stock: 60, category: 'ropa', pointsMultiplier: 1 },
  { name: 'Chino Elástico', price: 1_290_000, stock: 14, category: 'ropa', pointsMultiplier: 1 },
  { name: 'Lago Slip-on', price: 1_990_000, stock: 0, category: 'calzado', pointsMultiplier: 1 },
  { name: 'Gorra Lona Encerada', price: 490_000, stock: 35, category: 'accesorios', pointsMultiplier: 1 },
  { name: 'Calcetín Merino', price: 390_000, stock: 80, category: 'accesorios', pointsMultiplier: 1 },
  { name: 'Botella Térmica', price: 620_000, stock: 25, category: 'accesorios', pointsMultiplier: 1 },
  { name: 'Chamarra Valle', price: 3_890_000, stock: 6, category: 'ropa', pointsMultiplier: 2 },
  { name: 'Short Trail 7"', price: 790_000, stock: 18, category: 'ropa', pointsMultiplier: 1 },
];

/** Relleno sintético (nombres con tildes y eñes a propósito, para probar la búsqueda). */
const fillerNames: Record<string, string[]> = {
  calzado: [
    'Trail Pampa',
    'Zapatilla Ñandú',
    'Bota Páramo',
    'Sandalia Río',
    'Mocasín Cumbre',
    'Zapato Oficina Lino',
    'Tenis Montaña',
    'Alpargata Sol',
  ],
  ropa: [
    'Camisa Lino Verano',
    'Pantalón Cargo',
    'Buzo Capota Algodón',
    'Falda Plisada',
    'Vestido Lino Corto',
    'Chaleco Térmico',
    'Jean Recto Clásico',
    'Blusa Bordada',
    'Cárdigan Lana Fina',
    'Pijama Franela',
    'Polo Piqué',
    'Abrigo Paño',
  ],
  accesorios: [
    'Cinturón Cuero',
    'Bufanda Alpaca',
    'Guantes Lana',
    'Billetera Cuero Compacta',
    'Sombrero Ala Ancha',
    'Gafas Polarizadas',
    'Bolso Cruzado Lona',
    'Paraguas Plegable',
  ],
};

/** Valores determinísticos (sin aleatoriedad): el seed es reproducible. */
function buildFiller(): SeedProduct[] {
  const products: SeedProduct[] = [];
  let i = 0;
  for (const [category, names] of Object.entries(fillerNames)) {
    for (const name of names) {
      i += 1;
      products.push({
        name,
        category,
        price: 190_000 + ((i * 7) % 25) * 70_000,
        stock: i % 6 === 0 ? 0 : 4 + ((i * 3) % 37),
        pointsMultiplier: i % 5 === 0 ? 2 : 1,
      });
    }
  }
  return products;
}

const users = [
  { id: 1, name: 'Ana Demo' },
  { id: 2, name: 'Carlos Demo' },
];

const FIRST_CREATED_AT = Date.UTC(2026, 0, 1);
const HOUR_MS = 3_600_000;

/**
 * Carga datos de demo (3 categorías, 40 productos, 2 usuarios) si la base no
 * tiene productos. Idempotente. `created_at` crece con el id (una hora entre
 * productos) para que `sort=newest` tenga un orden real.
 */
export function seed(db: Db): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (count > 0) return;

  transaction(db, () => {
    const insertUser = db.prepare('INSERT INTO users (id, name) VALUES (?, ?)');
    for (const user of users) insertUser.run(user.id, user.name);

    const insertCategory = db.prepare('INSERT INTO categories (slug, name) VALUES (?, ?)');
    const categoryIds = new Map<string, number>();
    for (const category of categories) {
      const result = insertCategory.run(category.slug, category.name);
      categoryIds.set(category.slug, Number(result.lastInsertRowid));
    }

    const insertProduct = db.prepare(
      `INSERT INTO products
         (category_id, name, search_name, price, image_url, stock, points_multiplier, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    [...designProducts, ...buildFiller()].forEach((product, index) => {
      const position = index + 1;
      const categoryId = categoryIds.get(product.category);
      if (categoryId === undefined) throw new Error(`Categoría de seed desconocida: ${product.category}`);
      // Imágenes de placeholder determinísticas (dependencia externa aceptada para la demo).
      const imageUrl = `https://picsum.photos/seed/store-${position}/480/480`;
      const createdAt = new Date(FIRST_CREATED_AT + position * HOUR_MS).toISOString();
      insertProduct.run(
        categoryId,
        product.name,
        normalizeSearch(product.name),
        product.price,
        imageUrl,
        product.stock,
        product.pointsMultiplier,
        createdAt,
      );
    });
  });
}
