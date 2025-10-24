import { db } from "./index";
import { products } from "./schema";

// Default products
const defaultProducts = [
  { key: "purchase", name: "Purchase" },
  { key: "payment", name: "Payment" },
  { key: "refund", name: "Refund" },
  { key: "adjustment", name: "Adjustment" },
  { key: "cash", name: "Cash" },
];

export async function seedProducts() {
  try {
    for (const product of defaultProducts) {
      // Check if product already exists
      const existing = await db.query.products.findFirst({
        where: (products, { eq }) => eq(products.key, product.key),
      });
      
      if (!existing) {
        await db.insert(products).values(product);
        console.log(`Created product: ${product.name}`);
      }
    }
    console.log("Products seeded successfully");
  } catch (error) {
    console.error("Error seeding products:", error);
    throw error;
  }
}
