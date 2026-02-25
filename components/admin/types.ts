export type Product = {
  id: string
  key: string
  name: string
  defaultBuyingPrice: string | null
  createdAt: Date
  updatedAt: Date
}

export type ActiveSharedLink = {
  id: string
  projectId: string
  projectName: string
  token: string
  expiresAt: Date
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  encrypted: boolean
}
