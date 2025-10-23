# API Documentation

This document describes the server actions available in the Booker Journal application.

## Project Management

### `createProject(name: string, initialAmount: number)`
Creates a new project with an initial journal entry.

**Parameters:**
- `name`: Project name
- `initialAmount`: Initial balance (negative for debt, positive for credit)

**Returns:** Created project object

**Example:**
```typescript
const project = await createProject("Customer Account", -100)
```

---

### `getProjects()`
Retrieves all projects for the current user.

**Returns:** Array of projects with their latest entry

**Example:**
```typescript
const projects = await getProjects()
```

---

### `getProject(projectId: number)`
Gets a single project by ID.

**Parameters:**
- `projectId`: Project ID

**Returns:** Project object

**Throws:** Error if project not found or user is not authorized

---

### `deleteProject(projectId: number)`
Deletes a project and all its entries.

**Parameters:**
- `projectId`: Project ID

**Returns:** Success object

**Throws:** Error if project not found or user is not authorized

---

## Journal Entry Management

### `createEntry(projectId: number, amount: number, price: number, typeId: number, note?: string)`
Creates a new journal entry.

**Parameters:**
- `projectId`: Project ID
- `amount`: Quantity/amount
- `price`: Price per unit (negative for expenses, positive for income)
- `typeId`: Entry type ID
- `note`: Optional note

**Returns:** Created entry object

**Example:**
```typescript
const entry = await createEntry(1, 5, -20, 1, "Purchased 5 items")
// This creates an entry worth -100 (5 × -20)
```

---

### `getEntries(projectId: number)`
Gets all entries for a project.

**Parameters:**
- `projectId`: Project ID

**Returns:** Array of entries with type information

---

### `getProjectBalance(projectId: number)`
Calculates the current balance for a project.

**Parameters:**
- `projectId`: Project ID

**Returns:** Balance as a number (sum of amount × price for all entries)

**Example:**
```typescript
const balance = await getProjectBalance(1)
console.log(`Current balance: ${balance}`) // -150.50
```

---

### `deleteEntry(entryId: number, projectId: number)`
Deletes a journal entry.

**Parameters:**
- `entryId`: Entry ID
- `projectId`: Project ID

**Returns:** Success object

---

## Entry Type Management

### `getEntryTypes()`
Gets all entry types.

**Returns:** Array of entry types

**Example:**
```typescript
const types = await getEntryTypes()
// [{ id: 1, key: "purchase", name: "Purchase" }, ...]
```

---

### `updateEntryTypeName(typeId: number, newName: string)`
Updates the display name of an entry type.

**Parameters:**
- `typeId`: Entry type ID
- `newName`: New display name

**Returns:** Success object

**Example:**
```typescript
await updateEntryTypeName(1, "Compra") // Rename "Purchase" to Spanish
```

---

### `createEntryType(key: string, name: string)`
Creates a new entry type.

**Parameters:**
- `key`: Internal key (used for programmatic reference)
- `name`: Display name

**Returns:** Created entry type object

---

## Shared Link Management

### `createSharedLink(projectId: number, expiresInDays: number)`
Creates a shareable link for read-only access.

**Parameters:**
- `projectId`: Project ID
- `expiresInDays`: Number of days until expiration

**Returns:** Created link object with token

**Example:**
```typescript
const link = await createSharedLink(1, 7)
const url = `${window.location.origin}/shared/${link.token}`
```

---

### `getSharedLinks(projectId: number)`
Gets all shared links for a project.

**Parameters:**
- `projectId`: Project ID

**Returns:** Array of shared links

---

### `deleteSharedLink(linkId: number, projectId: number)`
Deletes a shared link.

**Parameters:**
- `linkId`: Link ID
- `projectId`: Project ID

**Returns:** Success object

---

### `validateSharedLink(token: string)`
Validates a shared link token (no authentication required).

**Parameters:**
- `token`: Link token

**Returns:** Link object with project information, or null if invalid/expired

---

### `getProjectBySharedLink(token: string)`
Gets project data via a shared link (no authentication required).

**Parameters:**
- `token`: Link token

**Returns:** Object containing project, entries, and balance

**Throws:** Error if link is invalid or expired

**Example:**
```typescript
const data = await getProjectBySharedLink(token)
console.log(`Project: ${data.project.name}`)
console.log(`Balance: ${data.balance}`)
console.log(`Entries: ${data.entries.length}`)
```

---

## Authentication

All actions (except shared link validation) require authentication. The user session is automatically validated using better-auth.

**Authentication Error:** Throws "Unauthorized" if no valid session exists.

**Authorization Error:** Throws "Project not found or unauthorized" if user tries to access a project they don't own.

---

## Error Handling

All server actions use try-catch blocks and return appropriate error messages. Common errors:

- **"Unauthorized"**: User is not logged in
- **"Project not found"**: Project doesn't exist or user doesn't have access
- **"Invalid or expired link"**: Shared link is not valid or has expired
- **Type validation errors**: Invalid numeric inputs or missing required fields

---

## Usage in Client Components

Server actions can be called directly from client components:

```typescript
"use client"

import { createProject } from "@/lib/actions/projects"
import { useState } from "react"

export function CreateProjectButton() {
  const [loading, setLoading] = useState(false)
  
  const handleCreate = async () => {
    setLoading(true)
    try {
      await createProject("New Project", -100)
      // Handle success
    } catch (error) {
      console.error("Failed to create project:", error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button onClick={handleCreate} disabled={loading}>
      Create Project
    </button>
  )
}
```

---

## Database Transactions

All operations that modify multiple tables use proper transaction handling to ensure data consistency. If any part fails, the entire operation is rolled back.
