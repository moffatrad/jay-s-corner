import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "./client";
import { users, products } from "./schema";
import { eq } from "drizzle-orm";

function img(seed: string) {
  return `https://picsum.photos/seed/${seed}/800/800`;
}

const SAMPLE_PRODUCTS = [
  // Clothing
  {
    name: "Classic Denim Jacket",
    description:
      "A timeless denim jacket with a comfortable fit, button front, and durable stitching. Layers well over any outfit.",
    price: "549.00",
    images: [img("denim-jacket-1"), img("denim-jacket-2")],
    category: "Clothing",
    stockQuantity: 18,
  },
  {
    name: "Everyday Cotton T-Shirt",
    description:
      "Soft, breathable 100% cotton t-shirt. Pre-shrunk fabric and a relaxed fit for all-day comfort.",
    price: "149.00",
    images: [img("tshirt-1")],
    category: "Clothing",
    stockQuantity: 42,
  },
  {
    name: "Slim Fit Chino Pants",
    description:
      "Tailored chino pants with a slim, modern cut. Versatile enough for the office or a night out.",
    price: "379.00",
    images: [img("chinos-1")],
    category: "Clothing",
    stockQuantity: 25,
  },
  {
    name: "Hooded Fleece Sweater",
    description: "Warm fleece-lined hoodie with a kangaroo pocket and adjustable drawstring hood.",
    price: "429.00",
    images: [img("hoodie-1")],
    category: "Clothing",
    stockQuantity: 30,
  },

  // Electronics
  {
    name: "Wireless Bluetooth Earbuds",
    description:
      "True wireless earbuds with active noise cancellation, 24-hour battery life (with case), and touch controls.",
    price: "899.00",
    images: [img("earbuds-1"), img("earbuds-2")],
    category: "Electronics",
    stockQuantity: 15,
  },
  {
    name: "Portable Bluetooth Speaker",
    description: "Compact speaker with rich bass, IPX6 water resistance, and 12-hour playtime.",
    price: "749.00",
    images: [img("speaker-1")],
    category: "Electronics",
    stockQuantity: 20,
  },
  {
    name: "Fast-Charge Power Bank 20,000mAh",
    description: "High-capacity power bank with dual USB-C ports and fast-charging support for phones and tablets.",
    price: "459.00",
    images: [img("powerbank-1")],
    category: "Electronics",
    stockQuantity: 33,
  },
  {
    name: "Smart Fitness Watch",
    description:
      "Tracks heart rate, sleep, and workouts. Notifications, 7-day battery life, and a bright always-on display.",
    price: "1299.00",
    images: [img("smartwatch-1"), img("smartwatch-2")],
    category: "Electronics",
    stockQuantity: 12,
  },

  // Jewelry
  {
    name: "Sterling Silver Hoop Earrings",
    description: "Lightweight, hypoallergenic sterling silver hoops. A classic that goes with everything.",
    price: "329.00",
    images: [img("hoops-1")],
    category: "Jewelry",
    stockQuantity: 27,
  },
  {
    name: "Minimalist Gold-Plated Necklace",
    description: "Delicate 18k gold-plated chain necklace with a subtle pendant. Tarnish resistant.",
    price: "459.00",
    images: [img("necklace-1")],
    category: "Jewelry",
    stockQuantity: 19,
  },
  {
    name: "Beaded Charm Bracelet",
    description: "Handcrafted beaded bracelet with an adjustable clasp and mixed natural stone beads.",
    price: "199.00",
    images: [img("bracelet-1")],
    category: "Jewelry",
    stockQuantity: 24,
  },

  // Shoes
  {
    name: "Everyday Canvas Sneakers",
    description: "Lightweight canvas sneakers with a cushioned insole, perfect for all-day wear.",
    price: "599.00",
    images: [img("sneakers-1"), img("sneakers-2")],
    category: "Shoes",
    stockQuantity: 22,
  },
  {
    name: "Leather Ankle Boots",
    description: "Genuine leather ankle boots with a durable rubber sole and a comfortable padded footbed.",
    price: "899.00",
    images: [img("boots-1")],
    category: "Shoes",
    stockQuantity: 14,
  },
  {
    name: "Running Sports Shoes",
    description: "Breathable mesh upper with responsive cushioning, built for daily training runs.",
    price: "749.00",
    images: [img("runners-1")],
    category: "Shoes",
    stockQuantity: 20,
  },

  // Kitchenware
  {
    name: "Non-Stick Cookware Set (5-Piece)",
    description: "Durable non-stick pots and pans with heat-resistant handles. Dishwasher safe.",
    price: "1099.00",
    images: [img("cookware-1")],
    category: "Kitchenware",
    stockQuantity: 10,
  },
  {
    name: "Stainless Steel Knife Set",
    description: "6-piece precision-forged knife set with a wooden block, for every kitchen task.",
    price: "699.00",
    images: [img("knives-1")],
    category: "Kitchenware",
    stockQuantity: 16,
  },
  {
    name: "Electric Kettle 1.7L",
    description: "Fast-boiling electric kettle with auto shut-off and a concealed heating element.",
    price: "399.00",
    images: [img("kettle-1")],
    category: "Kitchenware",
    stockQuantity: 28,
  },
  {
    name: "Glass Food Storage Containers (Set of 5)",
    description: "Airtight, microwave and freezer-safe glass containers with leak-proof lids.",
    price: "349.00",
    images: [img("containers-1")],
    category: "Kitchenware",
    stockQuantity: 31,
  },
];

async function main() {
  console.log("Seeding Jay's Corner database...");

  // 1. Admin / seller account
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@jayscorner.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME ?? "Jay";

  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    });
    console.log(`Created admin account: ${adminEmail}`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }

  // 2. Sample products (only seed if the catalog is empty, so re-running is safe)
  const existingProductCount = await db.$count(products);
  if (existingProductCount === 0) {
    await db.insert(products).values(SAMPLE_PRODUCTS);
    console.log(`Inserted ${SAMPLE_PRODUCTS.length} sample products.`);
  } else {
    console.log(`Products table already has ${existingProductCount} rows — skipping product seed.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
