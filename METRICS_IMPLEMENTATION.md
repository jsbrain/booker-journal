# Dashboard Metrics Feature Implementation

## Overview
This implementation adds comprehensive metrics tracking and inventory management to the Booker Journal application. Users can now track product purchases with buying prices and see detailed profit/revenue metrics for any time period.

## Key Features Implemented

### 1. Database Schema Updates

#### Products Table Enhancement
- Added `defaultBuyingPrice` field (nullable numeric field)
- Allows setting a default buying price per product
- Used as default when creating inventory purchases

#### New Table: inventory_purchases
Tracks all inventory/product purchases with:
- `productId` - Reference to the product
- `quantity` - Amount purchased
- `buyingPrice` - Price per unit at purchase time
- `totalCost` - Calculated (quantity × buyingPrice)
- `purchaseDate` - When the purchase was made
- `note` - Optional notes

### 2. Server Actions

#### Inventory Management (`lib/actions/inventory.ts`)
- `createInventoryPurchase()` - Record new purchases
- `updateInventoryPurchase()` - Update existing purchases
- `getInventoryPurchases()` - List all purchases for a project
- `deleteInventoryPurchase()` - Remove a purchase record
- `getProductInventory()` - Get totals and average buying price

#### Metrics Calculation (`lib/actions/metrics.ts`)
- `getProjectMetrics()` - Calculate metrics for a date range
  - Revenue: Total positive journal entries (sales)
  - Cost: Based on average buying price × quantity sold
  - Profit: Revenue - Cost
  - Product breakdown with individual metrics
- `getCurrentMonthRange()` - Helper for default period selection

#### Product Updates (`lib/actions/products.ts`)
- `updateProductBuyingPrice()` - Set default buying price

### 3. UI Components

#### MetricsDashboard Component
- Date range selector (defaults to current month)
- Key metrics cards:
  - Revenue (green)
  - Cost (orange)
  - Profit (green/red based on value)
  - Activity (entry and purchase counts)
- Product breakdown table showing:
  - Units sold
  - Revenue per product
  - Cost per product
  - Profit per product

#### InventoryList Component
- Inventory summary by product
  - Total quantity
  - Average buying price
  - Total cost
- Purchase history list
- Quick access to add new purchases

#### CreateInventoryPurchaseDialog Component
- Form to record new purchases
- Product selector
- Quantity and buying price inputs
- Date picker for purchase date
- Auto-fills default buying price if set

#### Admin Page Enhancement
- Added "Price" edit button for each product
- Dialog to set default buying price
- Display of current buying price in product list

### 4. Project Detail Page Updates

Added tab navigation:
- **Journal Entries** - Original entry list
- **Metrics** - New metrics dashboard
- **Inventory** - New inventory tracking

## How It Works

### Cost Calculation
1. For each product, the system calculates the average buying price from all inventory purchases
2. When calculating profit, it uses: `(quantity sold × selling price) - (quantity sold × average buying price)`
3. This gives accurate profit even when buying prices vary over time

### Revenue Tracking
- Revenue is calculated from positive journal entries (sales)
- Only entries with positive total (amount × price > 0) count as revenue

### Period Filtering
- All metrics can be filtered by date range
- Default is current month
- Both journal entries and inventory purchases are filtered by the selected period

## Usage Flow

1. **Set Up Products (Admin)**
   - Go to Admin page
   - Set default buying prices for products

2. **Record Inventory Purchases**
   - In project detail, go to "Inventory" tab
   - Click "Add Purchase"
   - Enter quantity and buying price
   - System calculates total cost

3. **Record Sales (Journal Entries)**
   - Use normal entry creation
   - Positive amounts = sales/revenue
   - Negative amounts = expenses

4. **View Metrics**
   - Go to "Metrics" tab
   - Select date range
   - View revenue, cost, profit
   - See breakdown by product

## Technical Details

### Validation
All new operations use TypeBox validation schemas:
- `createInventoryPurchaseInputSchema`
- `updateProductBuyingPriceInputSchema`
- `getMetricsInputSchema`

### Security
- All actions verify project ownership
- Only authenticated users can access inventory
- Admin actions protected

### Data Consistency
- Buying prices stored per purchase (historical accuracy)
- Average calculated on-the-fly for flexibility
- Product deletion prevented if in use
