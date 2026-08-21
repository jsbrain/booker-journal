import { Type } from '@sinclair/typebox'

export const createProjectInputSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  initialAmount: Type.Number(),
})

export const createEntryInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  amount: Type.Number({ exclusiveMinimum: 0 }),
  price: Type.Number(),
  typeId: Type.String({ minLength: 1 }),
  productId: Type.Optional(Type.String({ minLength: 1 })),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
  timestamp: Type.Optional(Type.String()),
})

export const updateEntryInputSchema = Type.Object({
  entryId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  amount: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  price: Type.Optional(Type.Number()),
  typeId: Type.Optional(Type.String({ minLength: 1 })),
  productId: Type.Optional(
    Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  ),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
})

export const createProductInputSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 100, pattern: '^[a-z_]+$' }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
})

export const updateProductInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
  newName: Type.String({ minLength: 1, maxLength: 255 }),
})

export const updateProductBuyingPriceInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
  defaultBuyingPrice: Type.Number({ minimum: 0 }),
})

export const createInventoryPurchaseInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
  quantity: Type.Number({ exclusiveMinimum: 0 }),
  buyingPrice: Type.Number({ exclusiveMinimum: 0 }),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
  purchaseDate: Type.Optional(Type.String()),
})

export const deleteInventoryPurchaseInputSchema = Type.Object({
  purchaseId: Type.String({ minLength: 1 }),
})

export const getMetricsInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  startDate: Type.String(),
  endDate: Type.String(),
})

export const createSharedLinkInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 6, maxLength: 256 }),
  expiresInDays: Type.Optional(Type.Integer({ minimum: 1, maximum: 365 })),
  expiresInHours: Type.Optional(Type.Integer({ minimum: 1, maximum: 8760 })),
  startDate: Type.Optional(Type.String()),
  endDate: Type.Optional(Type.String()),
})

export const sharedLinkTokenSchema = Type.Object({
  token: Type.String({ minLength: 1, maxLength: 128 }),
})

export const sharedLinkUnlockInputSchema = Type.Object({
  token: Type.String({ minLength: 1, maxLength: 128 }),
  password: Type.String({ minLength: 1, maxLength: 256 }),
})

export const sharedLinkDataAccessSchema = Type.Object({
  token: Type.String({ minLength: 1, maxLength: 128 }),
  accessToken: Type.Optional(Type.String({ minLength: 1, maxLength: 256 })),
})

export const sharedLinkEncryptedDataInputSchema = Type.Object({
  publicKey: Type.String({ minLength: 1, maxLength: 4096 }),
})

export const deleteProjectInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
})

export const deleteEntryInputSchema = Type.Object({
  entryId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
})

export const deleteSharedLinkInputSchema = Type.Object({
  linkId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
})

export const deleteProductInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
})

export const approveUserInputSchema = Type.Object({
  userId: Type.String({ minLength: 1 }),
})

export const getProjectInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
})
