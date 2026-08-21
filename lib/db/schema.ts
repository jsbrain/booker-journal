import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { nanoid } from '@/lib/utils'

function timestampTz<TName extends string>(name: TName) {
  return timestamp(name, { withTimezone: true })
}

// Better-auth tables
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    role: text('role').default('user').notNull(),
    approved: boolean('approved').default(false).notNull(),
    approvedAt: timestampTz('approved_at'),
    createdAt: timestampTz('created_at').defaultNow().notNull(),
    updatedAt: timestampTz('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('user_approval_created_idx').on(table.approved, table.createdAt),
    uniqueIndex('user_single_admin_idx')
      .on(table.role)
      .where(sql`${table.role} = 'admin'`),
    check('user_role_valid', sql`${table.role} in ('user', 'admin')`),
  ],
)

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestampTz('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestampTz('access_token_expires_at'),
  refreshTokenExpiresAt: timestampTz('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestampTz('expires_at').notNull(),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

// Entry types table - for type of entry (Sale, Payment, etc.)
export const entryTypes = pgTable('entry_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  key: text('key').notNull().unique(), // Internal key like 'sale', 'payment'
  name: text('name').notNull(), // Display name that can be edited
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at').defaultNow().notNull(),
})

// Products table - for product assignment to journal entries
export const products = pgTable('products', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  key: text('key').notNull().unique(), // Internal key like 'cash', 'materials', etc.
  name: text('name').notNull(), // Display name that can be edited
  defaultBuyingPrice: numeric('default_buying_price', {
    precision: 10,
    scale: 2,
  }), // Optional default buying price
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at').defaultNow().notNull(),
})

// Projects table
export const projects = pgTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text('name').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestampTz('created_at').defaultNow().notNull(),
    updatedAt: timestampTz('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('projects_user_created_idx').on(table.userId, table.createdAt),
  ],
)

// Journal entries table
export const journalEntries = pgTable(
  'journal_entries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    typeId: text('type_id')
      .notNull()
      .references(() => entryTypes.id),
    productId: text('product_id').references(() => products.id),
    note: text('note'),
    timestamp: timestampTz('timestamp').defaultNow().notNull(),
    createdAt: timestampTz('created_at').defaultNow().notNull(),
    updatedAt: timestampTz('updated_at').defaultNow().notNull(),
    editHistory: jsonb('edit_history').$type<EditHistoryEntry[]>(),
  },
  (table) => [
    index('journal_entries_project_timestamp_idx').on(
      table.projectId,
      table.timestamp,
    ),
    index('journal_entries_project_type_timestamp_idx').on(
      table.projectId,
      table.typeId,
      table.timestamp,
    ),
    check('journal_entries_amount_positive', sql`${table.amount} > 0`),
  ],
)

// Edit history entry type
export type EditHistoryEntry = {
  editedAt: string
  editedBy: string
  changes: {
    field: string
    oldValue: string | number
    newValue: string | number
  }[]
}

// Inventory purchases table - for tracking buying prices and inventory
// NOTE: Inventory is GLOBAL per admin user, not per project/customer
export const inventoryPurchases = pgTable(
  'inventory_purchases',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    buyingPrice: numeric('buying_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
    totalCost: numeric('total_cost', { precision: 10, scale: 2 }).notNull(),
    note: text('note'),
    purchaseDate: timestampTz('purchase_date').defaultNow().notNull(),
    createdAt: timestampTz('created_at').defaultNow().notNull(),
    updatedAt: timestampTz('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('inventory_purchases_user_date_idx').on(
      table.userId,
      table.purchaseDate,
    ),
    index('inventory_purchases_user_product_idx').on(
      table.userId,
      table.productId,
    ),
    check('inventory_purchases_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'inventory_purchases_buying_price_positive',
      sql`${table.buyingPrice} > 0`,
    ),
  ],
)

// Shared links table for read-only access
export const sharedLinks = pgTable(
  'shared_links',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestampTz('expires_at').notNull(),
    startDate: timestampTz('start_date'),
    endDate: timestampTz('end_date'),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestampTz('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('shared_links_project_created_idx').on(
      table.projectId,
      table.createdAt,
    ),
    index('shared_links_expiry_idx').on(table.expiresAt),
  ],
)

// Short-lived sessions created after a shared-link password is verified.
export const sharedLinkAccessSessions = pgTable(
  'shared_link_access_sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    sharedLinkId: text('shared_link_id')
      .notNull()
      .references(() => sharedLinks.id, { onDelete: 'cascade' }),
    accessTokenHash: text('access_token_hash').notNull(),
    expiresAt: timestampTz('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestampTz('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('shared_link_access_lookup_idx').on(
      table.sharedLinkId,
      table.accessTokenHash,
      table.expiresAt,
    ),
    index('shared_link_access_expiry_idx').on(table.expiresAt),
  ],
)

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  entries: many(journalEntries),
  sharedLinks: many(sharedLinks),
}))

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  project: one(projects, {
    fields: [journalEntries.projectId],
    references: [projects.id],
  }),
  type: one(entryTypes, {
    fields: [journalEntries.typeId],
    references: [entryTypes.id],
  }),
  product: one(products, {
    fields: [journalEntries.productId],
    references: [products.id],
  }),
}))

export const sharedLinksRelations = relations(sharedLinks, ({ one }) => ({
  project: one(projects, {
    fields: [sharedLinks.projectId],
    references: [projects.id],
  }),
}))

export const sharedLinkAccessSessionsRelations = relations(
  sharedLinkAccessSessions,
  ({ one }) => ({
    sharedLink: one(sharedLinks, {
      fields: [sharedLinkAccessSessions.sharedLinkId],
      references: [sharedLinks.id],
    }),
  }),
)

export const entryTypesRelations = relations(entryTypes, ({ many }) => ({
  entries: many(journalEntries),
}))

export const productsRelations = relations(products, ({ many }) => ({
  entries: many(journalEntries),
  inventoryPurchases: many(inventoryPurchases),
}))

export const inventoryPurchasesRelations = relations(
  inventoryPurchases,
  ({ one }) => ({
    user: one(user, {
      fields: [inventoryPurchases.userId],
      references: [user.id],
    }),
    product: one(products, {
      fields: [inventoryPurchases.productId],
      references: [products.id],
    }),
  }),
)

export const userRelations = relations(user, ({ many }) => ({
  inventoryPurchases: many(inventoryPurchases),
}))
