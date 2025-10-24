import { db } from "./index";
import { entryTypes, products } from "./schema";

// Default entry types
const defaultEntryTypes = [
  { key: "purchase", name: "Purchase" },
  { key: "payment", name: "Payment" },
  { key: "refund", name: "Refund" },
  { key: "adjustment", name: "Adjustment" },
];

// Default products
const defaultProducts = [
  { key: "cash", name: "Cash" },
];

export async function seedEntryTypes() {
  try {
    for (const type of defaultEntryTypes) {
      // Check if type already exists
      const existing = await db.query.entryTypes.findFirst({
        where: (entryTypes, { eq }) => eq(entryTypes.key, type.key),
      });
      
      if (!existing) {
        await db.insert(entryTypes).values(type);
        console.log(`Created entry type: ${type.name}`);
      }
    }
    console.log("Entry types seeded successfully");
  } catch (error) {
    console.error("Error seeding entry types:", error);
    throw error;
  }
}

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
