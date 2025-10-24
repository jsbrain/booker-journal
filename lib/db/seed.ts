import { db } from "./index";
import { entryTypes } from "./schema";

// Default entry types
const defaultEntryTypes = [
  { key: "purchase", name: "Purchase" },
  { key: "payment", name: "Payment" },
  { key: "refund", name: "Refund" },
  { key: "adjustment", name: "Adjustment" },
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
