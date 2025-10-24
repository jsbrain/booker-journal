/**
 * Seed data script for Booker Journal
 * 
 * Creates:
 * - Default user: Admin (manuel.maute@bradbit.com, pw: example)
 * - 3 products: c (Blumen, 40€), p (Schokolade, 2€), g (Pfanne, 4.50€)
 * - 3 initial inventory purchases with specific dates
 * - 3 projects with different starting balances
 * - 10-30 buying events per project
 */

import { db } from "./index";
import { user, account, products, entryTypes, projects, inventoryPurchases, journalEntries } from "./schema";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

// Seed data configuration
const SEED_USER = {
  email: "manuel.maute@bradbit.com",
  name: "Admin",
  password: "example",
};

const SEED_PRODUCTS = [
  { key: "c", name: "Blumen", defaultBuyingPrice: "40.00" },
  { key: "p", name: "Schokolade", defaultBuyingPrice: "2.00" },
  { key: "g", name: "Pfanne", defaultBuyingPrice: "4.50" },
];

const SEED_ENTRY_TYPES = [
  { key: "purchase", name: "Purchase" },
  { key: "payment", name: "Payment" },
  { key: "refund", name: "Refund" },
  { key: "adjustment", name: "Adjustment" },
];

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Create/verify user
    console.log("👤 Creating user...");
    const existingUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.email, SEED_USER.email),
    });

    let userId: string;
    if (existingUser) {
      console.log("   User already exists, skipping creation");
      userId = existingUser.id;
    } else {
      const hashedPassword = await bcrypt.hash(SEED_USER.password, 10);
      const newUserId = nanoid();
      
      await db.insert(user).values({
        id: newUserId,
        email: SEED_USER.email,
        name: SEED_USER.name,
        emailVerified: true,
      });

      // Create account with password
      await db.insert(account).values({
        id: nanoid(),
        accountId: SEED_USER.email,
        providerId: "credential",
        userId: newUserId,
        password: hashedPassword,
      });

      userId = newUserId;
      console.log("   ✓ User created");
    }

    // 2. Create/verify entry types
    console.log("📝 Creating entry types...");
    for (const type of SEED_ENTRY_TYPES) {
      const existing = await db.query.entryTypes.findFirst({
        where: (types, { eq }) => eq(types.key, type.key),
      });
      
      if (!existing) {
        await db.insert(entryTypes).values(type);
        console.log(`   ✓ Created entry type: ${type.name}`);
      }
    }

    // Get entry types for later use
    const purchaseType = await db.query.entryTypes.findFirst({
      where: (types, { eq }) => eq(types.key, "purchase"),
    });
    const paymentType = await db.query.entryTypes.findFirst({
      where: (types, { eq }) => eq(types.key, "payment"),
    });

    if (!purchaseType || !paymentType) {
      throw new Error("Entry types not found");
    }

    // 3. Create/verify products
    console.log("📦 Creating products...");
    const productIds: Record<string, string> = {};
    
    for (const product of SEED_PRODUCTS) {
      const existing = await db.query.products.findFirst({
        where: (prods, { eq }) => eq(prods.key, product.key),
      });
      
      if (existing) {
        productIds[product.key] = existing.id;
        console.log(`   Product ${product.name} already exists`);
      } else {
        const [newProduct] = await db.insert(products).values(product).returning();
        productIds[product.key] = newProduct.id;
        console.log(`   ✓ Created product: ${product.name} (${product.defaultBuyingPrice}€)`);
      }
    }

    // 4. Create projects
    console.log("🗂️  Creating projects...");
    const projectData = [
      { name: "Project Negative Start", initialBalance: -500 },
      { name: "Project Zero Start", initialBalance: 0 },
      { name: "Project Positive Start", initialBalance: 1000 },
    ];

    const createdProjects: Array<{ id: string; name: string; initialBalance: number }> = [];

    for (const proj of projectData) {
      const [newProject] = await db.insert(projects).values({
        name: proj.name,
        userId,
      }).returning();
      
      createdProjects.push({
        id: newProject.id,
        name: newProject.name,
        initialBalance: proj.initialBalance,
      });
      
      console.log(`   ✓ Created project: ${proj.name}`);
    }

    // 5. Create initial inventory purchases with specific dates
    console.log("📥 Creating initial inventory purchases...");
    const inventoryData = [
      { 
        productKey: "p", 
        quantity: 1000, 
        date: new Date("2025-01-01T10:00:00Z"),
        projectIndex: 0,
      },
      { 
        productKey: "c", 
        quantity: 100, 
        date: new Date("2025-04-23T10:00:00Z"),
        projectIndex: 1,
      },
      { 
        productKey: "g", 
        quantity: 100, 
        date: new Date("2025-10-05T10:00:00Z"),
        projectIndex: 2,
      },
    ];

    for (const inv of inventoryData) {
      const product = SEED_PRODUCTS.find(p => p.key === inv.productKey);
      if (!product) continue;

      const buyingPrice = parseFloat(product.defaultBuyingPrice);
      const totalCost = inv.quantity * buyingPrice;
      const project = createdProjects[inv.projectIndex];

      await db.insert(inventoryPurchases).values({
        projectId: project.id,
        productId: productIds[inv.productKey],
        quantity: inv.quantity.toString(),
        buyingPrice: buyingPrice.toString(),
        totalCost: totalCost.toString(),
        purchaseDate: inv.date,
        note: `Initial inventory purchase for ${project.name}`,
      });

      console.log(`   ✓ Created inventory purchase: ${inv.quantity} ${product.name} on ${inv.date.toLocaleDateString()}`);
    }

    // 6. Create journal entries for each project
    console.log("📊 Creating journal entries...");
    
    for (const project of createdProjects) {
      console.log(`   Creating entries for ${project.name}...`);
      
      // Create initial balance entry if not zero
      if (project.initialBalance !== 0) {
        const initialDate = new Date("2024-12-01T10:00:00Z");
        await db.insert(journalEntries).values({
          projectId: project.id,
          amount: "1",
          price: project.initialBalance.toString(),
          typeId: project.initialBalance > 0 ? paymentType.id : purchaseType.id,
          productId: productIds["c"], // Use Cash (Blumen) for initial balance
          note: "Initial balance",
          timestamp: initialDate,
        });
      }

      // Generate 10-30 random buying events
      const numEvents = Math.floor(Math.random() * 21) + 10; // 10-30
      const startDate = new Date("2025-01-01");
      const endDate = new Date();
      const timeRange = endDate.getTime() - startDate.getTime();

      for (let i = 0; i < numEvents; i++) {
        // Random product
        const productKeys = Object.keys(productIds);
        const randomProductKey = productKeys[Math.floor(Math.random() * productKeys.length)];
        const productId = productIds[randomProductKey];
        
        // Random amount (1-50 units)
        const amount = Math.floor(Math.random() * 50) + 1;
        
        // Random price based on product (with some variation)
        const product = SEED_PRODUCTS.find(p => p.key === randomProductKey);
        const basePrice = product ? parseFloat(product.defaultBuyingPrice) : 10;
        const priceVariation = basePrice * 0.2; // ±20% variation
        const price = basePrice + (Math.random() * priceVariation * 2 - priceVariation);
        
        // Random timestamp
        const randomTime = Math.random() * timeRange;
        const timestamp = new Date(startDate.getTime() + randomTime);
        
        // Random entry type (mostly purchases, some payments)
        const isPurchase = Math.random() > 0.3; // 70% purchases, 30% payments
        const typeId = isPurchase ? purchaseType.id : paymentType.id;
        
        // For purchases, make price negative; for payments, positive
        const finalPrice = isPurchase ? -Math.abs(price) : Math.abs(price);
        
        await db.insert(journalEntries).values({
          projectId: project.id,
          amount: amount.toString(),
          price: finalPrice.toFixed(2),
          typeId,
          productId,
          note: isPurchase 
            ? `Purchase of ${product?.name || 'product'}` 
            : `Payment for ${product?.name || 'product'}`,
          timestamp,
        });
      }
      
      console.log(`   ✓ Created ${numEvents} entries for ${project.name}`);
    }

    console.log("✅ Database seeding completed successfully!");
    
    return {
      userId,
      projectIds: createdProjects.map(p => p.id),
      productIds,
      success: true,
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seeding complete, exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
