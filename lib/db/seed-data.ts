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
 * - A small deterministic metrics verification dataset (Nov 2025–Jan 2026)
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
import { and, eq, inArray } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { nanoid } from '@/lib/utils'
import { buildOpeningBalanceEntry } from '@/lib/domain/projects'

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

function parseBooleanEnv(name: string): boolean {
  const raw = (process.env[name] || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

const METRICS_SCENARIO = {
  product: {
    key: 'metrics_scenario_flower',
    name: 'Metrics Scenario Flower',
  },
  project: {
    name: 'Metrics Scenario Customer',
  },
  purchases: [
    {
      purchaseDate: '2025-11-15T10:00:00Z',
      quantity: 100,
      buyingPrice: 1.0,
      note: 'Scenario: 100 @ 1.00 (Nov)',
    },
    {
      purchaseDate: '2026-01-10T10:00:00Z',
      quantity: 100,
      buyingPrice: 2.0,
      note: 'Scenario: 100 @ 2.00 (Jan)',
    },
  ],
  sales: [
    {
      timestamp: '2025-12-05T12:00:00Z',
      amount: 50,
      price: -3.0,
      note: 'Scenario: sell 50 @ -3.00 (Dec)',
    },
    {
      timestamp: '2026-01-12T12:00:00Z',
      amount: 50,
      price: -3.0,
      note: 'Scenario: sell 50 @ -3.00 (Jan)',
    },
  ],
}

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
      date: '2025-01-01T10:00:00Z',
      quantity: 50,
      price: 45.0,
      note: 'Initial stock - Winter flowers',
    },
    {
      date: '2025-04-15T10:00:00Z',
      quantity: 100,
      price: 42.5,
      note: 'Spring restocking at better price',
    },
    {
      date: '2025-09-01T10:00:00Z',
      quantity: 200,
      price: 40.0,
      note: 'Large fall order with volume discount',
    },
  ],
  schokolade: [
    {
      date: '2025-01-10T10:00:00Z',
      quantity: 500,
      price: 2.2,
      note: 'New Year promotional stock',
    },
    {
      date: '2025-03-20T10:00:00Z',
      quantity: 300,
      price: 2.1,
      note: 'Easter season restocking',
    },
    {
      date: '2025-06-05T10:00:00Z',
      quantity: 400,
      price: 1.95,
      note: 'Summer sale stock at reduced price',
    },
    {
      date: '2025-10-15T10:00:00Z',
      quantity: 600,
      price: 2.0,
      note: 'Halloween/Christmas preparation',
    },
  ],
  pfanne: [
    {
      date: '2025-01-05T10:00:00Z',
      quantity: 80,
      price: 5.0,
      note: 'New supplier - testing quality',
    },
    {
      date: '2025-05-10T10:00:00Z',
      quantity: 150,
      price: 4.5,
      note: 'Switched to reliable supplier',
    },
    {
      date: '2025-08-20T10:00:00Z',
      quantity: 200,
      price: 4.2,
      note: 'Negotiated better contract terms',
    },
  ],
}

function getSeededProjectNames(): string[] {
  return [
    ...CUSTOMER_DATA.map((customer) => customer.name),
    METRICS_SCENARIO.project.name,
  ]
}

function getSeededPurchaseNotes(): string[] {
  return [
    ...Object.values(INVENTORY_TIMELINE)
      .flat()
      .map((purchase) => purchase.note),
    ...METRICS_SCENARIO.purchases.map((purchase) => purchase.note),
  ]
}

async function clearExistingSeedDataForUser(userId: string) {
  console.log(
    '\n🧹 FORCE_SEED enabled: cleaning previously seeded demo data...',
  )

  const seededProjectNames = getSeededProjectNames()
  const seededProjects = await db.query.projects.findMany({
    where: and(
      eq(projects.userId, userId),
      inArray(projects.name, seededProjectNames),
    ),
  })

  if (seededProjects.length > 0) {
    const projectIds = seededProjects.map((project) => project.id)
    await db.delete(projects).where(inArray(projects.id, projectIds))
    console.log(`   Removed ${seededProjects.length} seeded project(s)`) // cascade deletes journal entries/shared links
  }

  const seededNotes = getSeededPurchaseNotes()
  if (seededNotes.length > 0) {
    await db
      .delete(inventoryPurchases)
      .where(
        and(
          eq(inventoryPurchases.userId, userId),
          inArray(inventoryPurchases.note, seededNotes),
        ),
      )
    console.log('   Removed seeded inventory timeline purchases')
  }
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

async function seedMetricsVerificationData(params: {
  userId: string
  saleTypeId: string
}) {
  const { userId, saleTypeId } = params

  // Ensure scenario product exists
  const existingScenarioProduct = await db.query.products.findFirst({
    where: eq(products.key, METRICS_SCENARIO.product.key),
  })

  const scenarioProductId = existingScenarioProduct
    ? existingScenarioProduct.id
    : (
        await db
          .insert(products)
          .values({
            key: METRICS_SCENARIO.product.key,
            name: METRICS_SCENARIO.product.name,
          })
          .returning()
      )[0].id

  // Ensure scenario project exists
  const existingScenarioProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.userId, userId),
      eq(projects.name, METRICS_SCENARIO.project.name),
    ),
  })

  const scenarioProjectId = existingScenarioProject
    ? existingScenarioProject.id
    : (
        await db
          .insert(projects)
          .values({
            name: METRICS_SCENARIO.project.name,
            userId,
          })
          .returning()
      )[0].id

  // Insert purchases (idempotent-ish: skip if same note already exists)
  for (const p of METRICS_SCENARIO.purchases) {
    const exists = await db.query.inventoryPurchases.findFirst({
      where: and(
        eq(inventoryPurchases.userId, userId),
        eq(inventoryPurchases.productId, scenarioProductId),
        eq(inventoryPurchases.note, p.note),
      ),
    })

    if (exists) continue

    const totalCost = p.quantity * p.buyingPrice
    await db.insert(inventoryPurchases).values({
      userId,
      productId: scenarioProductId,
      quantity: p.quantity.toString(),
      buyingPrice: p.buyingPrice.toFixed(2),
      totalCost: totalCost.toFixed(2),
      purchaseDate: new Date(p.purchaseDate),
      note: p.note,
    })
  }

  // Insert sales (idempotent-ish: skip if same note already exists)
  for (const s of METRICS_SCENARIO.sales) {
    const exists = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.projectId, scenarioProjectId),
        eq(journalEntries.typeId, saleTypeId),
        eq(journalEntries.note, s.note),
      ),
    })

    if (exists) continue

    await db.insert(journalEntries).values({
      projectId: scenarioProjectId,
      amount: s.amount.toString(),
      price: s.price.toFixed(2),
      typeId: saleTypeId,
      productId: scenarioProductId,
      note: s.note,
      timestamp: new Date(s.timestamp),
    })
  }

  console.log('\n🧪 Metrics verification dataset:')
  console.log(`   Project: ${METRICS_SCENARIO.project.name}`)
  console.log(`   Product: ${METRICS_SCENARIO.product.name}`)
  console.log('   Suggested checks in UI:')
  console.log(
    '   - Date range 2025-12-01 → 2025-12-31: revenue ≈ 150, cost ≈ 50, profit ≈ 100',
  )
  console.log(
    '   - Date range 2026-01-01 → 2026-01-31: revenue ≈ 150, cost ≈ 83.33, profit ≈ 66.67',
  )
  console.log(
    '   - Date range 2025-12-01 → 2026-01-31: revenue ≈ 300, cost ≈ 133.33, profit ≈ 166.67',
  )
}

// Helper to generate realistic sale prices based on buying price
function generateSalePrice(
  buyingPrice: number,
  productKey: string,
  variationIndex: number,
): number {
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

  // Deterministic variation (0.90 - 1.10)
  const variation = 0.9 + (variationIndex % 21) / 100
  return buyingPrice * margin * variation
}

// Helper to generate transaction notes
function generateTransactionNote(
  type: 'sale' | 'payment',
  index: number,
  productName?: string,
  quantity?: number,
): string {
  if (type === 'sale') {
    const notes = [
      `${quantity}x ${productName} - Rechnung #${1000 + (index % 9000)}`,
      `Lieferung ${productName} (${quantity} Stück)`,
      `Bestellung ${productName} - Menge: ${quantity}`,
      `${quantity}x ${productName} - Sofortlieferung`,
    ]
    return notes[index % notes.length]
  } else {
    const notes = [
      `Rechnung per Überweisung erhalten`,
      `Barzahlung`,
      `PayPal Zahlung`,
      `Banküberweisung eingegangen`,
      `Teilzahlung`,
    ]
    return notes[index % notes.length]
  }
}

function getSalesInMonth(month: number, customerIndex: number): number {
  return 2 + ((month + customerIndex) % 4)
}

function getSaleDate(
  month: number,
  saleIndex: number,
  customerIndex: number,
): Date {
  const day = 1 + ((month * 7 + saleIndex * 5 + customerIndex * 3) % 28)
  const hour = 8 + ((saleIndex + month + customerIndex) % 10)
  return new Date(Date.UTC(2025, month, day, hour, 0, 0))
}

function getSaleQuantity(
  buyingPattern: BuyingPattern,
  month: number,
  saleIndex: number,
  customerIndex: number,
): number {
  if (buyingPattern === 'blumen') {
    return 5 + ((month * 3 + saleIndex * 2 + customerIndex) % 20)
  }

  if (buyingPattern === 'schokolade') {
    return 20 + ((month * 11 + saleIndex * 7 + customerIndex * 5) % 80)
  }

  return 2 + ((month * 2 + saleIndex + customerIndex) % 8)
}

function getPaymentDate(paymentIndex: number, customerIndex: number): Date {
  const month = (paymentIndex + customerIndex * 2) % 10
  const day = 5 + ((paymentIndex * 3 + customerIndex) % 20)
  return new Date(Date.UTC(2025, month, day, 12, 0, 0))
}

function getPaymentAmount(paymentIndex: number, customerIndex: number): number {
  return 50 + ((paymentIndex * 37 + customerIndex * 29) % 450)
}

export async function seedDatabase() {
  const forceSeed = parseBooleanEnv('FORCE_SEED')

  console.log('🌱 Starting sophisticated database seeding...')
  console.log(
    '   Creating realistic business scenario for 2025 (+ metrics verification dataset)',
  )

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

      await db
        .update(user)
        .set({
          role: 'admin',
          approved: true,
          approvedAt: existingUser.approvedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))

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
        role: 'admin',
        approved: true,
        approvedAt: new Date(),
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

    if (forceSeed) {
      await clearExistingSeedDataForUser(userId)
    }

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
    const refundType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.key, 'refund'),
    })
    const adjustmentType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.key, 'adjustment'),
    })

    if (!saleType || !paymentType || !refundType || !adjustmentType) {
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

    // Add a deterministic dataset for verifying date-range COGS behavior.
    await seedMetricsVerificationData({ userId, saleTypeId: saleType.id })

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

    for (const [customerIndex, customer] of CUSTOMER_DATA.entries()) {
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
        const openingEntry = buildOpeningBalanceEntry(customer.initialBalance)

        if (!openingEntry) {
          throw new Error('Expected a non-zero opening balance entry')
        }

        await db.insert(journalEntries).values({
          projectId: newProject.id,
          ...openingEntry,
          typeId: adjustmentType.id,
          productId: null,
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
        type: 'sale' | 'payment' | 'refund' | 'adjustment'
        amount?: number
        price?: number
      }> = []

      // Create sales events (2-5 per month)
      for (let month = 0; month < 10; month++) {
        // Jan to Oct
        const salesInMonth = getSalesInMonth(month, customerIndex)

        for (let i = 0; i < salesInMonth; i++) {
          const date = getSaleDate(month, i, customerIndex)
          const quantity = getSaleQuantity(
            customer.buyingPattern,
            month,
            i,
            customerIndex,
          )

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
              customerIndex * 1000 + month * 10 + i,
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
        transactions.filter((t) => t.type === 'sale').length *
          customer.paymentReliability,
      )
      for (let i = 0; i < numPayments; i++) {
        const date = getPaymentDate(i, customerIndex)
        const paymentAmount = getPaymentAmount(i, customerIndex)
        transactions.push({
          date,
          type: 'payment',
          amount: 1,
          price: paymentAmount,
        })
      }

      const refundsToAdd = 1 + ((customerIndex + 1) % 3)
      for (let i = 0; i < refundsToAdd; i++) {
        const month = (customerIndex * 3 + 2 + i * 2) % 10
        const day = 3 + ((customerIndex * 7 + i * 5) % 23)
        transactions.push({
          date: new Date(Date.UTC(2025, month, day, 11, 0, 0)),
          type: 'refund',
          amount: 1,
          price: 15 + ((customerIndex * 17 + i * 13) % 76),
        })
      }

      const adjustmentsToAdd = 1 + ((customerIndex + 2) % 3)
      for (let i = 0; i < adjustmentsToAdd; i++) {
        const month = (customerIndex * 4 + 1 + i * 3) % 10
        const day = 4 + ((customerIndex * 11 + i * 7) % 23)
        const sign = (customerIndex + i) % 2 === 0 ? -1 : 1
        transactions.push({
          date: new Date(Date.UTC(2025, month, day, 14, 0, 0)),
          type: 'adjustment',
          amount: 1,
          price: sign * (10 + ((customerIndex * 19 + i * 11) % 61)),
        })
      }

      // Sort transactions by date
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

      // Insert transactions
      let salesCount = 0
      let paymentsCount = 0
      let refundsCount = 0
      let adjustmentsCount = 0
      let totalSales = 0
      let totalPayments = 0
      let saleNoteIndex = 0
      let paymentNoteIndex = 0

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
              saleNoteIndex,
              productMap[customer.buyingPattern].name,
              transaction.amount,
            ),
            timestamp: transaction.date,
          })
          saleNoteIndex++
          salesCount++
          totalSales += transaction.amount! * Math.abs(transaction.price!)
        } else if (transaction.type === 'payment') {
          await db.insert(journalEntries).values({
            projectId: newProject.id,
            amount: transaction.amount!.toString(),
            price: transaction.price!.toFixed(2),
            typeId: paymentType.id,
            productId: null,
            note: generateTransactionNote('payment', paymentNoteIndex),
            timestamp: transaction.date,
          })
          paymentNoteIndex++
          paymentsCount++
          totalPayments += transaction.price!
        } else if (transaction.type === 'refund') {
          await db.insert(journalEntries).values({
            projectId: newProject.id,
            amount: transaction.amount!.toString(),
            price: transaction.price!.toFixed(2),
            typeId: refundType.id,
            productId: null,
            note: 'Kulanz-Rückerstattung',
            timestamp: transaction.date,
          })
          refundsCount++
        } else {
          await db.insert(journalEntries).values({
            projectId: newProject.id,
            amount: transaction.amount!.toString(),
            price: transaction.price!.toFixed(2),
            typeId: adjustmentType.id,
            productId: null,
            note: 'Saldoanpassung',
            timestamp: transaction.date,
          })
          adjustmentsCount++
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
      if (refundsCount > 0) {
        console.log(`   ✓ Created ${refundsCount} refunds`)
      }
      if (adjustmentsCount > 0) {
        console.log(`   ✓ Created ${adjustmentsCount} adjustments`)
      }

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
    console.log(`   • Transactions spanning Jan 2025–Jan 2026`)
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
      if (process.env.SHOW_SEED_CREDENTIALS === 'true') {
        console.log(`   Password: ${SEED_USER.password}`)
      } else {
        console.log(
          '   Password: [hidden] (set SHOW_SEED_CREDENTIALS=true to print)',
        )
      }
    } catch (error) {
      console.error('Seeding failed:', error)
    } finally {
      // Close DB connection so the process can exit cleanly
      await client.end({ timeout: 5 })
    }
  })()
}
