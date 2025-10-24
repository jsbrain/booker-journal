# UI Changes Overview

## Dark Mode
The entire application now runs in enforced dark mode with a dark background, light text, and properly themed components.

## Dashboard Page (`/dashboard`)
**New Elements:**
- **Admin Button**: Added next to the "Sign Out" button in the header with a Settings icon
  - Links to `/dashboard/admin` for product management

## Admin Panel (`/dashboard/admin`)
**New Page:** Accessible via the Admin link in the dashboard header

**Features:**
- Header with back button to dashboard
- "Product Management" title and description
- "New Product" button to create products
- List of all products displayed as cards showing:
  - Product name and key
  - Creation date
  - Edit button (pencil icon)
  - Delete button (trash icon)

**Dialogs:**
1. Create Product Dialog
   - Key field (lowercase letters and underscores only)
   - Display name field
   - Create/Cancel buttons

2. Edit Product Dialog
   - Display name field (editable)
   - Save/Cancel buttons

## Project Detail Page (`/dashboard/projects/[id]`)
**New Elements:**

1. **Edit Button on Each Entry**
   - Pencil icon button next to the delete button
   - Opens Edit Entry dialog

2. **Edited Badge**
   - Shows "Edited (n)" where n is the number of edits
   - Appears on entries that have been modified
   - Includes History icon
   - Click to view full edit history

3. **Edit Entry Dialog**
   - Pre-filled form with current values
   - Fields: Product dropdown, Amount, Price, Note
   - Save Changes/Cancel buttons

4. **Edit History Dialog**
   - Shows chronological list of all edits
   - Each edit displays:
     - Edit number (e.g., "Edit #2")
     - Timestamp (formatted date/time)
     - List of changed fields with old → new values
   - Border accent on left side for visual hierarchy

## Entry Creation (`create-entry-dialog.tsx`)
**Updated:**
- Label changed from "Type" to "Product"
- Dropdown now shows products instead of entry types
- Includes new "Cash" option

## Shared Link Page (`/shared/[token]`)
**Updated:**
- Displays product names instead of entry types
- Maintains read-only view with dark mode theme

## Color Scheme (Dark Mode)
- Background: Dark blue-gray
- Foreground: Light gray/white
- Primary: Light blue
- Cards: Slightly lighter dark background
- Borders: Subtle gray
- Success (positive amounts): Green
- Error (negative amounts): Red
- Muted text: Gray

## Icons Used
- Settings (gear) - Admin panel access
- Edit2 (pencil) - Edit entry
- History (clock with arrow) - Edit history badge
- Plus - Create new items
- Trash2 - Delete items
- ArrowLeft - Back navigation
- Share2 - Share project
- LogOut - Sign out

## Typography
- Headers: Bold, larger font
- Body text: Regular weight
- Muted text: Smaller, gray color
- Product/entry names: Medium weight
- Amounts: Bold, color-coded (green/red)

## Layout
- Responsive grid for project cards (1/2/3 columns)
- Card-based design throughout
- Consistent padding and spacing
- Dialogs centered with backdrop
- Header fixed at top with border bottom

## Interactive Elements
- Buttons change opacity on hover
- Cards have hover state with accent background
- Dialogs slide in smoothly
- Form inputs have focus states
- All interactions follow shadcn/ui patterns

## Accessibility
- Proper semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
