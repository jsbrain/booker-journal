import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booker Journal",
  description: "A simple login and dashboard example with Next.js 16, shadcn-ui, and better-auth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
