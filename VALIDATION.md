# Validation Architecture

This document describes the validation architecture used in the Booker Journal application.

## Overview

The validation system follows a strict, unidirectional flow to ensure consistency between database schema, validation rules, and TypeScript types:

```
Drizzle Schemas → TypeBox Schemas → Extended Schemas → Inferred Types → Validation
```

## Flow Details

### 1. Drizzle Schemas (Source of Truth)

All data structures start with Drizzle ORM schemas defined in `lib/db/schema.ts`. These schemas define:
- Database tables
- Column types and constraints
- Relations between tables

**Example:**
```typescript
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 2. TypeBox Derivation

Using the `drizzle-typebox` plugin, TypeBox schemas are automatically derived from Drizzle schemas in `lib/db/validation.ts`:

**Example:**
```typescript
import { createSelectSchema, createInsertSchema } from "drizzle-typebox";
import { projects } from "./schema";

export const selectProjectSchema = createSelectSchema(projects);
export const insertProjectSchema = createInsertSchema(projects);
```

### 3. Extended Schemas

Base TypeBox schemas are extended or merged for specific API validation needs:

**Example:**
```typescript
import { Type } from "@sinclair/typebox";

export const createProjectInputSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  initialAmount: Type.Number(),
});
```

### 4. Type Inference

TypeScript types are inferred from TypeBox schemas using the `Static` utility:

**Example:**
```typescript
import { Static } from "@sinclair/typebox";

export type CreateProjectInput = Static<typeof createProjectInputSchema>;
```

### 5. Validation in Server Actions

All server actions validate inputs before processing using the `validate()` utility:

**Example:**
```typescript
import { validate } from "@/lib/db/validate";
import { createProjectInputSchema } from "@/lib/db/validation";

export async function createProject(name: string, initialAmount: number) {
  // Validate input
  validate(createProjectInputSchema, { name, initialAmount });
  
  // ... rest of the logic
}
```

## Validation Utilities

### `validate(schema, data)`

Validates data against a TypeBox schema and throws an error if validation fails.

**Usage:**
```typescript
validate(createProjectInputSchema, { name, initialAmount });
```

**Error Format:**
```
Error: Validation failed: /name: Expected string, /initialAmount: Expected number
```

### `validateSafe(schema, data)`

Validates data and returns a result object instead of throwing:

**Usage:**
```typescript
const result = validateSafe(createProjectInputSchema, data);
if (!result.success) {
  console.error(result.errors);
} else {
  const validData = result.data;
}
```

## Available Validation Schemas

### Project Schemas
- `createProjectInputSchema` - Validates project creation input
- `updateProjectInputSchema` - Validates project updates
- `getProjectInputSchema` - Validates project ID for retrieval
- `deleteProjectInputSchema` - Validates project deletion

### Journal Entry Schemas
- `createEntryInputSchema` - Validates journal entry creation
- `deleteEntryInputSchema` - Validates entry deletion

### Entry Type Schemas
- `createEntryTypeInputSchema` - Validates entry type creation
- `updateEntryTypeInputSchema` - Validates entry type updates

### Shared Link Schemas
- `createSharedLinkInputSchema` - Validates shared link creation
- `deleteSharedLinkInputSchema` - Validates shared link deletion
- `sharedLinkTokenSchema` - Validates shared link token format

## Validation Rules

### Project Creation
- `name`: String, 1-255 characters
- `initialAmount`: Number (can be positive or negative)

### Journal Entry Creation
- `projectId`: Integer, minimum 1
- `amount`: Number
- `price`: Number
- `typeId`: Integer, minimum 1
- `note`: Optional string, max 1000 characters

### Entry Type Creation
- `key`: String, 1-100 characters, lowercase with underscores only (pattern: `^[a-z_]+$`)
- `name`: String, 1-255 characters

### Shared Link Creation
- `projectId`: Integer, minimum 1
- `expiresInDays`: Integer, 1-365 days

## Benefits of This Architecture

1. **Single Source of Truth**: Database schema drives all validation
2. **Type Safety**: TypeScript types are guaranteed to match validation schemas
3. **DRY Principle**: No duplication between database schema and validation
4. **Automatic Synchronization**: Changes to Drizzle schema automatically propagate to TypeBox
5. **Clear Error Messages**: Validation errors include field paths and descriptions
6. **Runtime Safety**: All inputs are validated at runtime before database operations

## Best Practices

1. **Never modify TypeBox base schemas directly** - Always derive from Drizzle schemas
2. **Extend, don't replace** - Create new schemas by extending or merging base schemas
3. **Validate early** - Always validate at the beginning of server actions
4. **Use appropriate schemas** - Choose between insert/select schemas based on operation
5. **Keep schemas focused** - Create specific schemas for each API endpoint
6. **Document validation rules** - Add comments for complex validation logic

## Testing Validation

To test validation, you can use the validation utilities directly:

```typescript
import { validate } from "@/lib/db/validate";
import { createProjectInputSchema } from "@/lib/db/validation";

// Valid input
validate(createProjectInputSchema, { 
  name: "My Project", 
  initialAmount: 100 
}); // No error

// Invalid input
validate(createProjectInputSchema, { 
  name: "", 
  initialAmount: "not a number" 
}); // Throws validation error
```

## Adding New Validation

To add validation for a new entity:

1. **Create Drizzle schema** in `lib/db/schema.ts`
2. **Generate TypeBox schemas** in `lib/db/validation.ts`:
   ```typescript
   export const selectMyEntitySchema = createSelectSchema(myEntity);
   export const insertMyEntitySchema = createInsertSchema(myEntity);
   ```
3. **Create extended schemas** for specific operations:
   ```typescript
   export const createMyEntityInputSchema = Type.Object({
     // ... specific validation rules
   });
   ```
4. **Infer types**:
   ```typescript
   export type CreateMyEntityInput = Static<typeof createMyEntityInputSchema>;
   ```
5. **Use in server actions**:
   ```typescript
   validate(createMyEntityInputSchema, input);
   ```

## Troubleshooting

### Validation Error Not Clear
Check the error message format: `path: message`. The path shows which field failed.

### Type Mismatch
Ensure TypeBox schema matches the inferred type. Use `Static<typeof schema>` consistently.

### Schema Out of Sync
After changing Drizzle schema, rebuild the project to regenerate TypeBox schemas.

### Complex Validation
For complex cross-field validation, extend schemas or create custom validators.

## References

- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [drizzle-typebox Plugin](https://orm.drizzle.team/docs/typebox)
- [Drizzle ORM Schema](https://orm.drizzle.team/docs/sql-schema-declaration)
