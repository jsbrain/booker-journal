/**
 * Validation utilities using TypeBox
 */

import { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/**
 * Validates data against a TypeBox schema
 * @param schema - TypeBox schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws Error with validation details if validation fails
 */
export function validate<T extends TSchema>(schema: T, data: unknown): unknown {
  const errors = [...Value.Errors(schema, data)];
  
  if (errors.length > 0) {
    const errorMessages = errors.map(
      (error) => `${error.path}: ${error.message}`
    );
    throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
  }
  
  return data;
}

/**
 * Validates data against a TypeBox schema and returns validation result
 * @param schema - TypeBox schema to validate against
 * @param data - Data to validate
 * @returns Object with success status and either data or errors
 */
export function validateSafe<T extends TSchema>(
  schema: T,
  data: unknown
): { success: true; data: unknown } | { success: false; errors: string[] } {
  const errors = [...Value.Errors(schema, data)];
  
  if (errors.length > 0) {
    const errorMessages = errors.map(
      (error) => `${error.path}: ${error.message}`
    );
    return { success: false, errors: errorMessages };
  }
  
  return { success: true, data };
}
