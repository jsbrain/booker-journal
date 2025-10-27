import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export default async function Home() {
  // Check if user is already logged in
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    // User is logged in, redirect to dashboard
    redirect("/dashboard")
  }

  // User is not logged in, redirect to login
  redirect("/login")
}
