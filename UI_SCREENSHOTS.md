# UI Screenshots - Dashboard Metrics Feature

## Overview
This document describes the new UI elements added for the dashboard metrics feature.

## 1. Project Detail Page - Tab Navigation

The project detail page now has three tabs:

```
┌─────────────────────────────────────────────────────────┐
│  Project Name                          [Share] [Delete] │
├─────────────────────────────────────────────────────────┤
│  Current Balance: €1,234.56          Total Entries: 42  │
├─────────────────────────────────────────────────────────┤
│  [Journal Entries] [📈 Metrics] [📦 Inventory]         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tab content appears here...                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 2. Metrics Dashboard Tab

### Date Range Selector
```
┌─────────────────────────────────────────────────────────┐
│  Period Selection                                        │
│  Choose the date range for metrics                      │
├─────────────────────────────────────────────────────────┤
│  Start Date: [2025-10-01]    End Date: [2025-10-31]    │
└─────────────────────────────────────────────────────────┘
```

### Key Metrics Cards
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Revenue   💰│ │  Cost      🛒│ │  Profit    📊│ │  Activity  📦│
│              │ │              │ │              │ │              │
│  €5,432.10   │ │  €3,210.50   │ │  €2,221.60   │ │     42       │
│  ────────────│ │  ────────────│ │  ────────────│ │  ────────────│
│  Total sales │ │  Cost of     │ │  Profit      │ │  12 purchases│
│  in period   │ │  goods sold  │ │  margin: 41% │ │  made        │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Product Breakdown
```
┌─────────────────────────────────────────────────────────┐
│  Product Breakdown                                       │
│  Detailed metrics by product                            │
├─────────────────────────────────────────────────────────┤
│  Product A                            12.50 units sold  │
│  Revenue: €625.00  Cost: €375.00  Profit: €250.00      │
│─────────────────────────────────────────────────────────│
│  Product B                            25.00 units sold  │
│  Revenue: €1,250.00  Cost: €750.00  Profit: €500.00    │
└─────────────────────────────────────────────────────────┘
```

## 3. Inventory Tab

### Inventory Summary
```
┌─────────────────────────────────────────────────────────┐
│  Inventory Summary                    [+ Add Purchase]  │
│  Total inventory by product                             │
├─────────────────────────────────────────────────────────┤
│  Product A                             150.00 units     │
│  Avg. price: €30.00                 Total: €4,500.00   │
│─────────────────────────────────────────────────────────│
│  Product B                             200.00 units     │
│  Avg. price: €50.00                 Total: €10,000.00  │
└─────────────────────────────────────────────────────────┘
```

### Purchase History
```
┌─────────────────────────────────────────────────────────┐
│  Purchase History                                        │
│  All inventory purchases                                │
├─────────────────────────────────────────────────────────┤
│  Product A • Oct 15, 2025                      [🗑️]     │
│  Optional purchase note                                 │
│  Quantity: 50.00 × €29.50                               │
│                                        €1,475.00        │
│─────────────────────────────────────────────────────────│
│  Product B • Oct 10, 2025                      [🗑️]     │
│  Quantity: 100.00 × €48.00                              │
│                                        €4,800.00        │
└─────────────────────────────────────────────────────────┘
```

## 4. Add Inventory Purchase Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Add Inventory Purchase                        [✕]      │
│  Record a purchase of inventory/materials for cost      │
│  tracking                                               │
├─────────────────────────────────────────────────────────┤
│  Product:           [Select a product ▼]                │
│                                                         │
│  Quantity:          [100____________]                   │
│                                                         │
│  Buying Price       [50.00__________]                   │
│  (per unit)                                             │
│                                                         │
│  Purchase Date:     [2025-10-24_____]                   │
│                                                         │
│  Note (optional):   [Supplier XYZ___]                   │
│                                                         │
│                     [Cancel] [Create Purchase]          │
└─────────────────────────────────────────────────────────┘
```

## 5. Admin Page - Product Management

### Product List with Buying Prices
```
┌─────────────────────────────────────────────────────────┐
│  Products                              [+ New Product]  │
│  Manage product types for journal entries               │
├─────────────────────────────────────────────────────────┤
│  Product A (product_a)                                  │
│  Created Oct 1, 2025 • Default buying price: €30.00    │
│                    [✏️ Name] [✏️ Price] [🗑️]            │
│─────────────────────────────────────────────────────────│
│  Product B (product_b)                                  │
│  Created Oct 1, 2025 • Default buying price: Not set   │
│                    [✏️ Name] [✏️ Price] [🗑️]            │
└─────────────────────────────────────────────────────────┘
```

### Edit Buying Price Dialog
```
┌─────────────────────────────────────────────────────────┐
│  Edit Default Buying Price                     [✕]      │
│  Set the default buying price for this product (used    │
│  as default in inventory purchases)                     │
├─────────────────────────────────────────────────────────┤
│  Default Buying Price:  [30.50__________]               │
│                                                         │
│  This price will be used as the default when adding     │
│  inventory purchases                                    │
│                                                         │
│                         [Cancel] [Save Price]           │
└─────────────────────────────────────────────────────────┘
```

## Color Scheme

- **Revenue**: Green (positive, income)
- **Cost**: Orange (expense, but necessary)
- **Profit**: 
  - Green when positive
  - Red when negative
- **Borders**: Subtle gray
- **Text**: Dark for primary, muted for secondary

## Icons Used

- 💰 Revenue / Money
- 🛒 Cost / Shopping Cart
- 📊 Profit / Trending Up/Down
- 📦 Activity / Package
- ✏️ Edit
- 🗑️ Delete
- ✕ Close
- ▼ Dropdown

## Interaction Flow

1. **User navigates to project detail page**
   - Sees three tabs: Entries, Metrics, Inventory

2. **User clicks "Metrics" tab**
   - Dashboard loads with current month data
   - User can adjust date range
   - Metrics recalculate on date change

3. **User clicks "Inventory" tab**
   - Sees summary of all inventory
   - Sees purchase history
   - Can add new purchases

4. **User clicks "Add Purchase"**
   - Dialog opens
   - Selects product (auto-fills default buying price if set)
   - Enters quantity and price
   - Submits
   - List refreshes

5. **User goes to Admin page**
   - Sees all products with buying prices
   - Can set/update default buying prices
   - These defaults appear when creating purchases
