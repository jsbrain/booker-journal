# User Guide: Understanding the Journal System

## What is a Journal?

In Booker Journal, a **journal** is a simple accounting ledger that tracks money flow between you (the business) and a customer or project. It works like a traditional accounting journal where:

- **Negative amounts** represent debt or money owed to you
- **Positive amounts** represent payments or credits

## How It Works

### Creating a Project

1. Log in to your dashboard
2. Click "New Project"
3. Enter a project name (e.g., "Customer: John Doe")
4. Set the initial amount:
   - Use **negative** if the customer owes you money (e.g., -100 for €100 debt)
   - Use **positive** if you owe the customer (e.g., 100 for €100 credit)

### Understanding Balance

The **balance** is automatically calculated by summing all entries:
- **Negative balance**: Customer owes you money (debt)
- **Zero balance**: Account is settled
- **Positive balance**: You owe the customer (overpayment/credit)

### Example Scenario

**Customer buys items on credit:**

1. Initial entry: **-100** (customer owes €100)
2. Customer buys more items: **-50** (5 items × €-10 each)
3. **Current balance: -150** (customer owes €150)
4. Customer makes partial payment: **+100** (paid €100)
5. **Final balance: -50** (customer still owes €50)

### Entry Types

Each entry must have a type to categorize the transaction:

- **Purchase**: Customer buys items/services (usually negative)
- **Payment**: Customer makes a payment (usually positive)
- **Refund**: Return or refund issued (depends on direction)
- **Adjustment**: Manual balance adjustments

You can rename these types to match your business needs.

### Creating Entries

1. Open a project
2. Click "New Entry"
3. Select the type (Purchase, Payment, etc.)
4. Enter **amount** (quantity of items)
5. Enter **price** per unit:
   - **Negative** for expenses/purchases (e.g., -10 for €10 per item)
   - **Positive** for payments/income (e.g., 50 for €50 received)
6. Add an optional note
7. The total is calculated as: **amount × price**

### Examples

**Customer buys 3 items at €15 each:**
- Amount: 3
- Price: -15
- Total: -45 (adds to their debt)

**Customer pays €100:**
- Amount: 1
- Price: 100
- Total: +100 (reduces their debt)

**Refund 2 items at €15 each:**
- Amount: 2
- Price: 15
- Total: +30 (reduces their debt)

## Sharing Project Access

You can give customers read-only access to their journal:

1. Open the project
2. Click "Share"
3. Set how many days the link should be valid (e.g., 7 days)
4. Click "Create Link"
5. Copy the link and send it to the customer

The customer can view:
- Current balance
- Full transaction history
- Timestamps and notes for each entry

They **cannot**:
- Make new entries
- Edit existing entries
- Delete anything

### Managing Shared Links

- You can create multiple links with different expiration dates
- Links automatically expire after the set time
- You can manually delete links at any time
- Expired links cannot be used

## Tips for Success

### For Debt Tracking
Start with a negative initial amount (what they owe):
```
Initial: -500 (customer owes €500)
Payment: +200 (paid €200)
Balance: -300 (still owes €300)
```

### For Credit/Prepayment Tracking
Start with a positive initial amount (what you owe):
```
Initial: +1000 (customer prepaid €1000)
Service: -250 (used €250 of credit)
Balance: +750 (€750 credit remaining)
```

### Best Practices

1. **Add notes** to entries for clarity
2. **Share links** with customers so they can track their own balance
3. **Use consistent entry types** for better organization
4. **Check balance regularly** to ensure accuracy
5. **Set reasonable expiration times** for shared links (7-30 days)

## Common Questions

**Q: What if I make a mistake?**
A: Currently, you need to create a correcting entry. For example, if you entered -100 by mistake, create an entry of +100 to cancel it out.

**Q: Can I edit entry types?**
A: Yes! You can change the display names of entry types to match your business language.

**Q: Can customers make entries?**
A: No. Shared links are strictly read-only. Only you (as the admin) can create entries.

**Q: What happens when a shared link expires?**
A: The link stops working immediately after the expiration time. The customer will see an "Invalid or expired link" message.

**Q: Can I have multiple projects?**
A: Yes! You can create as many projects as you need, each with its own independent journal.

**Q: How do I know what a customer owes?**
A: Look at the balance:
- Negative balance = they owe you
- Positive balance = you owe them
- Zero = all settled

## Support

For issues or questions, please refer to:
- [README.md](README.md) - General setup and usage
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database configuration
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Technical details
