/**
 * Comprehensive seed data script for Booker Journal
 *
 * Creates realistic business scenario:
 * - Default user: Admin (manuel.maute@bradbit.com, pw: examplepassword)
 * - Entry types: Sale, Payment, Refund, Adjustment
 * - 3 products with varying prices over time
 * - Multiple inventory purchases throughout 2025 showing price changes
 * - 3 customer projects with realistic sales and payment patterns
 * - Detailed transaction history from Jan-Oct 2025
 */

import { db, client } from './index'
import {
  user,
  account,
  products,
  entryTypes,
  projects,
  inventoryPurchases,
  journalEntries,
} from './schema'
import { and, eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { nanoid } from '@/lib/utils'

// Seed data configuration
const SEED_USER = {
  email: 'manuel.maute@bradbit.com',
  name: 'Admin',
  password: 'examplepassword',
}

const SEED_PRODUCTS = [
  { key: 'blumen', name: 'Blumen', defaultBuyingPrice: '40.00' },
  { key: 'schokolade', name: 'Schokolade', defaultBuyingPrice: '2.00' },
  { key: 'pfanne', name: 'Pfanne', defaultBuyingPrice: '4.50' },
]

const SEED_ENTRY_TYPES = [
  { key: 'sale', name: 'Sale' },
  { key: 'payment', name: 'Payment' },
  { key: 'refund', name: 'Refund' },
  { key: 'adjustment', name: 'Adjustment' },
]

// Type for buying patterns
type BuyingPattern = 'blumen' | 'schokolade' | 'pfanne'

// Realistic customer data
const CUSTOMER_DATA: Array<{
  name: string
  initialBalance: number
  buyingPattern: BuyingPattern
  paymentReliability: number
}> = [
  {
    name: 'Müller Blumenladen GmbH',
    initialBalance: 850, // They owe us
    buyingPattern: 'blumen', // Primarily buys flowers
    paymentReliability: 0.6, // 60% pay regularly
  },
  {
    name: 'Schmidt Feinkost',
    initialBalance: 0, // Fresh start
    buyingPattern: 'schokolade', // Primarily buys chocolate
    paymentReliability: 0.8, // 80% pay regularly
  },
  {
    name: 'Weber Haushaltswaren',
    initialBalance: -120, // We owe them (overpaid)
    buyingPattern: 'pfanne', // Primarily buys pans
    paymentReliability: 0.9, // 90% pay regularly
  },
]

// Inventory purchase timeline for each product
const INVENTORY_TIMELINE: Record<
  BuyingPattern,
  Array<{
    date: string
    quantity: number
    price: number
    note: string
  }>
> = {
  blumen: [
    {
      date: '2025-01-01',
      quantity: 50,
      price: 45.0,
      note: 'Initial stock - Winter flowers',
    },
    {
      date: '2025-04-15',
      quantity: 100,
      price: 42.5,
      note: 'Spring restocking at better price',
    },
    {
      date: '2025-09-01',
      quantity: 200,
      price: 40.0,
      note: 'Large fall order with volume discount',
    },
  ],
  schokolade: [
    {
      date: '2025-01-10',
      quantity: 500,
      price: 2.2,
      note: 'New Year promotional stock',
    },
    {
      date: '2025-03-20',
      quantity: 300,
      price: 2.1,
      note: 'Easter season restocking',
    },
    {
      date: '2025-06-05',
      quantity: 400,
      price: 1.95,
      note: 'Summer sale stock at reduced price',
    },
    {
      date: '2025-10-15',
      quantity: 600,
      price: 2.0,
      note: 'Halloween/Christmas preparation',
    },
  ],
  pfanne: [
    {
      date: '2025-01-05',
      quantity: 80,
      price: 5.0,
      note: 'New supplier - testing quality',
    },
    {
      date: '2025-05-10',
      quantity: 150,
      price: 4.5,
      note: 'Switched to reliable supplier',
    },
    {
      date: '2025-08-20',
      quantity: 200,
      price: 4.2,
      note: 'Negotiated better contract terms',
    },
  ],
}

// Standalone seed functions for use by server actions
export async function seedEntryTypes() {
  try {
    for (const type of SEED_ENTRY_TYPES) {
      const existing = await db.query.entryTypes.findFirst({
        where: eq(entryTypes.key, type.key),
      })

      if (!existing) {
        await db.insert(entryTypes).values(type)
        console.log(`Created entry type: ${type.name}`)
      }
    }
    console.log('Entry types seeded successfully')
  } catch (error) {
    console.error('Error seeding entry types:', error)
    throw error
  }
}

export async function seedProducts() {
  try {
    for (const product of SEED_PRODUCTS) {
      const existing = await db.query.products.findFirst({
        where: eq(products.key, product.key),
      })

      if (!existing) {
        await db.insert(products).values(product)
        console.log(`Created product: ${product.name}`)
      }
    }
    console.log('Products seeded successfully')
  } catch (error) {
    console.error('Error seeding products:', error)
    throw error
  }
}

// Helper to generate realistic sale prices based on buying price
function generateSalePrice(buyingPrice: number, productKey: string): number {
  let margin: number

  // Different profit margins for different products
  switch (productKey) {
    case 'blumen':
      margin = 1.8 // 80% markup
      break
    case 'schokolade':
      margin = 2.5 // 150% markup
      break
    case 'pfanne':
      margin = 2.0 // 100% markup
      break
    default:
      margin = 2.0
  }

  // Add some variation (±10%)
  const variation = 0.9 + Math.random() * 0.2
  return buyingPrice * margin * variation
}

// Helper to generate transaction notes
function generateTransactionNote(
  type: 'sale' | 'payment',
  productName?: string,
  quantity?: number,
): string {
  if (type === 'sale') {
    const notes = [
      `${quantity}x ${productName} - Rechnung #${
        Math.floor(Math.random() * 9000) + 1000
      }`,
      `Lieferung ${productName} (${quantity} Stück)`,
      `Bestellung ${productName} - Menge: ${quantity}`,
      `${quantity}x ${productName} - Sofortlieferung`,
    ]
    return notes[Math.floor(Math.random() * notes.length)]
  } else {
    const notes = [
      `Rechnung per Überweisung erhalten`,
      `Barzahlung`,
      `PayPal Zahlung`,
      `Banküberweisung eingegangen`,
      `Teilzahlung`,
    ]
    return notes[Math.floor(Math.random() * notes.length)]
  }
}

export async function seedDatabase() {
  console.log('🌱 Starting sophisticated database seeding...')
  console.log('   Creating realistic business scenario for 2025')

  try {
    // 1. Create/verify user
    console.log('\n👤 Creating admin user...')
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, SEED_USER.email),
    })

    let userId: string
    if (existingUser) {
      console.log('   User already exists, using existing user')
      userId = existingUser.id

      // Ensure the seed user's credential password is in better-auth's expected format.
      const hashedPassword = await hashPassword(SEED_USER.password)
      const existingAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, userId),
          eq(account.providerId, 'credential'),
          eq(account.accountId, SEED_USER.email),
        ),
      })

      if (existingAccount) {
        await db
          .update(account)
          .set({ password: hashedPassword })
          .where(eq(account.id, existingAccount.id))
      } else {
        await db.insert(account).values({
          id: nanoid(),
          accountId: SEED_USER.email,
          providerId: 'credential',
          userId,
          password: hashedPassword,
        })
      }
    } else {
      const hashedPassword = await hashPassword(SEED_USER.password)
      const newUserId = nanoid()

      await db.insert(user).values({
        id: newUserId,
        email: SEED_USER.email,
        name: SEED_USER.name,
        emailVerified: true,
      })

      await db.insert(account).values({
        id: nanoid(),
        accountId: SEED_USER.email,
        providerId: 'credential',
        userId: newUserId,
        password: hashedPassword,
      })

      userId = newUserId
      console.log('   ✓ Admin user created')
    }

    const forceSeed =
      process.env.FORCE_SEED === '1' || process.env.FORCE_SEED === 'true'
    if (!forceSeed) {
      const existingProject = await db.query.projects.findFirst({
        where: eq(projects.userId, userId),
      })
      const existingPurchase = await db.query.inventoryPurchases.findFirst({
        where: eq(inventoryPurchases.userId, userId),
      })

      if (existingProject || existingPurchase) {
        console.log(
          '\nℹ️  Seed data already exists for this user; skipping the large seed run.',
        )
        console.log(
          '   (Credential password was ensured/updated.) To reseed everything, run with FORCE_SEED=1.',
        )
        return { userId, success: true, skipped: true }
      }
    }

    // 2. Create/verify entry types
    console.log('\n📝 Creating entry types...')
    await seedEntryTypes()

    const saleType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.key, 'sale'),
    })
    const paymentType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.key, 'payment'),
    })

    if (!saleType || !paymentType) {
      throw new Error('Entry types not found')
    }

    // 3. Create/verify products
    console.log('\n📦 Creating products...')
    await seedProducts()

    const productMap: Record<string, { id: string; name: string }> = {}
    for (const product of SEED_PRODUCTS) {
      const existing = await db.query.products.findFirst({
        where: eq(products.key, product.key),
      })
      if (existing) {
        productMap[product.key] = { id: existing.id, name: existing.name }
      }
    }

    // 4. Create comprehensive inventory purchases
    console.log('\n📥 Creating inventory purchase history (Jan-Oct 2025)...')
    let totalInventoryValue = 0

    for (const [productKey, purchases] of Object.entries(INVENTORY_TIMELINE)) {
      console.log(`\n   ${productMap[productKey].name}:`)

      for (const purchase of purchases) {
        const totalCost = purchase.quantity * purchase.price
        totalInventoryValue += totalCost

        await db.insert(inventoryPurchases).values({
          userId,
          productId: productMap[productKey].id,
          quantity: purchase.quantity.toString(),
          buyingPrice: purchase.price.toString(),
          totalCost: totalCost.toString(),
          purchaseDate: new Date(purchase.date),
          note: purchase.note,
        })

        console.log(
          `   ✓ ${purchase.date}: ${
            purchase.quantity
          } units @ €${purchase.price.toFixed(2)} = €${totalCost.toFixed(2)}`,
        )
        console.log(`      ${purchase.note}`)
      }
    }

    console.log(
      `\n   💰 Total inventory investment: €${totalInventoryValue.toFixed(2)}`,
    )

    // 5. Create customer projects with realistic transactions
    console.log('\n🏢 Creating customer projects and transactions...')

    for (const customer of CUSTOMER_DATA) {
      console.log(`\n   ${customer.name}:`)

      // Create project
      const [newProject] = await db
        .insert(projects)
        .values({
          name: customer.name,
          userId,
        })
        .returning()

      console.log(
        `   ✓ Project created (ID: ${newProject.id.substring(0, 8)}...)`,
      )

      // Create initial balance entry if not zero
      if (customer.initialBalance !== 0) {
        const initialDate = new Date('2024-12-15T10:00:00Z')

        // User-facing convention for seed data:
        // - positive initialBalance => customer owes us (receivable / Schulden)
        // - negative initialBalance => customer has credit (payable / Guthaben)
        // Ledger convention:
        // - sale uses negative price
        // - payment uses positive price
        const initialEntryPrice =
          customer.initialBalance > 0
            ? -customer.initialBalance
            : Math.abs(customer.initialBalance)

        await db.insert(journalEntries).values({
          projectId: newProject.id,
          amount: '1',
          price: initialEntryPrice.toString(),
          typeId: customer.initialBalance > 0 ? saleType.id : paymentType.id,
          productId:
            customer.initialBalance > 0
              ? productMap[customer.buyingPattern].id
              : null,
          note:
            customer.initialBalance > 0
              ? 'Offene Rechnung aus 2024'
              : 'Überzahlung aus 2024 - Guthaben',
          timestamp: initialDate,
        })

        const balanceType =
          customer.initialBalance > 0 ? 'Schulden' : 'Guthaben'
        console.log(
          `   📋 Initial balance: €${Math.abs(customer.initialBalance).toFixed(
            2,
          )} ${balanceType}`,
        )
      }

      // Generate realistic transactions from Jan to Oct 2025
      const transactions: Array<{
        date: Date
        type: 'sale' | 'payment'
        amount?: number
        price?: number
      }> = []

      // Create sales events (2-5 per month)
      for (let month = 0; month < 10; month++) {
        // Jan to Oct
        const salesInMonth = 2 + Math.floor(Math.random() * 4)

        for (let i = 0; i < salesInMonth; i++) {
          const day = 1 + Math.floor(Math.random() * 28)
          const hour = 8 + Math.floor(Math.random() * 10)
          const date = new Date(2025, month, day, hour, 0, 0)

          // Quantity varies by product type
          let quantity: number
          if (customer.buyingPattern === 'blumen') {
            quantity = 5 + Math.floor(Math.random() * 20) // 5-25 flowers
          } else if (customer.buyingPattern === 'schokolade') {
            quantity = 20 + Math.floor(Math.random() * 80) // 20-100 chocolates
          } else {
            quantity = 2 + Math.floor(Math.random() * 8) // 2-10 pans
          }

          // Find the most recent buying price for this product at this date
          const productTimeline =
            INVENTORY_TIMELINE[
              customer.buyingPattern as keyof typeof INVENTORY_TIMELINE
            ]
          let buyingPrice = 0
          for (const purchase of productTimeline) {
            if (new Date(purchase.date) <= date) {
              buyingPrice = purchase.price
            }
          }

          if (buyingPrice > 0) {
            const salePrice = generateSalePrice(
              buyingPrice,
              customer.buyingPattern,
            )
            transactions.push({
              date,
              type: 'sale',
              amount: quantity,
              price: -salePrice, // Negative for customer debt
            })
          }
        }
      }

      // Add payment events based on reliability
      const numPayments = Math.floor(
        transactions.filter(t => t.type === 'sale').length *
          customer.paymentReliability,
      )
      for (let i = 0; i < numPayments; i++) {
        const month = Math.floor(Math.random() * 10)
        const day = 5 + Math.floor(Math.random() * 20)
        const date = new Date(2025, month, day, 12, 0, 0)

        // Payment amount between €50 and €500
        const paymentAmount = 50 + Math.floor(Math.random() * 450)
        transactions.push({
          date,
          type: 'payment',
          amount: 1,
          price: paymentAmount,
        })
      }

      // Sort transactions by date
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

      // Insert transactions
      let salesCount = 0
      let paymentsCount = 0
      let totalSales = 0
      let totalPayments = 0

      for (const transaction of transactions) {
        if (transaction.type === 'sale') {
          await db.insert(journalEntries).values({
            projectId: newProject.id,
            amount: transaction.amount!.toString(),
            price: transaction.price!.toFixed(2),
            typeId: saleType.id,
            productId: productMap[customer.buyingPattern].id,
            note: generateTransactionNote(
              'sale',
              productMap[customer.buyingPattern].name,
              transaction.amount,
            ),
            timestamp: transaction.date,
          })
          salesCount++
          totalSales += transaction.amount! * Math.abs(transaction.price!)
        } else {
          await db.insert(journalEntries).values({
            projectId: newProject.id,
            amount: transaction.amount!.toString(),
            price: transaction.price!.toFixed(2),
            typeId: paymentType.id,
            productId: null,
            note: generateTransactionNote('payment'),
            timestamp: transaction.date,
          })
          paymentsCount++
          totalPayments += transaction.price!
        }
      }

      console.log(
        `   ✓ Created ${salesCount} sales (€${totalSales.toFixed(2)} total)`,
      )
      console.log(
        `   ✓ Created ${paymentsCount} payments (€${totalPayments.toFixed(
          2,
        )} total)`,
      )

      const currentBalance =
        customer.initialBalance + totalSales - totalPayments
      const balanceStatus =
        currentBalance > 0
          ? 'Schulden'
          : currentBalance < 0
          ? 'Guthaben'
          : 'Ausgeglichen'
      console.log(
        `   💳 Current balance: €${Math.abs(currentBalance).toFixed(
          2,
        )} ${balanceStatus}`,
      )
    }

    console.log('\n✅ Sophisticated database seeding completed!')
    console.log('\n📊 Summary:')
    console.log(
      `   • ${CUSTOMER_DATA.length} customers with realistic purchase patterns`,
    )
    console.log(
      `   • ${
        Object.values(INVENTORY_TIMELINE).flat().length
      } inventory purchases showing price evolution`,
    )
    console.log(`   • Transactions spanning Jan-Oct 2025`)
    console.log(`   • Different payment behaviors per customer`)
    console.log(`   • Varied sales quantities and pricing`)

    return {
      userId,
      success: true,
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Run if executed directly (Bun)
const isMain = Boolean((import.meta as unknown as { main?: boolean }).main)

if (isMain) {
  ;(async () => {
    try {
      await seedDatabase()
      console.log('\n🎉 Seeding complete! You can now log in with:')
      console.log(`   Email: ${SEED_USER.email}`)
      console.log(`   Password: ${SEED_USER.password}`)
    } catch (error) {
      console.error('Seeding failed:', error)
    } finally {
      // Close DB connection so the process can exit cleanly
      await client.end({ timeout: 5 })
    }
  })()
}
