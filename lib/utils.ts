import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { customAlphabet } from "nanoid"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NOTE: Removed `-` for easier copy-pasting.
const urlAlphabet =
  'useandom26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

/** Default size: 24 */
export const nanoid = customAlphabet(urlAlphabet, 24);

/**
 * Generate a 12 character serial number / id.
 * @returns A 12-character serial number.
 */
export const generateSerialNumber = () => {
  return `${nanoid(12)}`;
};
