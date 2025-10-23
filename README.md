# Booker Journal

A modern authentication example built with Next.js 16, shadcn-ui, and better-auth.

## Features

- 🔐 Email/password authentication with better-auth
- 🎨 Beautiful UI components from shadcn-ui
- 🚀 Next.js 16 with App Router and Turbopack
- 📱 Responsive design with Tailwind CSS v4
- 🔒 Protected routes with session management
- 💾 SQLite database for user storage

## Tech Stack

- **Framework:** Next.js 16.0.0
- **UI Library:** shadcn-ui (Radix UI primitives)
- **Authentication:** better-auth 1.3.29
- **Database:** SQLite (better-sqlite3)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jsbrain/booker-journal.git
cd booker-journal
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory (optional - defaults are provided):
```env
BETTER_AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run database migrations:
```bash
npx @better-auth/cli migrate
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Sign Up
1. Navigate to the home page (automatically redirects to login)
2. Click "Sign up" to create a new account
3. Enter your name, email, and password
4. Click "Sign Up" to create your account

### Sign In
1. Enter your email and password
2. Click "Sign In"
3. You'll be redirected to the dashboard

### Dashboard
- View your profile information
- See statistics (placeholder data)
- Access quick actions
- Sign out to return to the login page

## Project Structure

```
booker-journal/
├── app/
│   ├── api/auth/[...all]/  # Better-auth API routes
│   ├── dashboard/          # Protected dashboard page
│   ├── login/              # Login/signup page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (redirects to login)
├── components/ui/          # shadcn-ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── label.tsx
├── lib/
│   ├── auth.ts             # Better-auth configuration
│   ├── auth-client.ts      # Auth client for frontend
│   └── utils.ts            # Utility functions
└── auth.db                 # SQLite database (generated)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Screenshots

### Login Page
![Login Page](https://github.com/user-attachments/assets/8b9f1416-95a5-48a8-99dd-8d2b6fd52d6a)

### Sign Up Page
![Sign Up Page](https://github.com/user-attachments/assets/e1e8d230-c0cd-4d24-87dc-06c12c912514)

### Dashboard
![Dashboard](https://github.com/user-attachments/assets/98138612-f152-46a9-9417-3230296d3692)

## Security

- Passwords are securely hashed using better-auth's built-in encryption
- Session tokens are stored securely
- Environment variables used for sensitive configuration
- Database file excluded from version control

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn-ui Documentation](https://ui.shadcn.com)
- [better-auth Documentation](https://www.better-auth.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

This project is open source and available under the MIT License.
