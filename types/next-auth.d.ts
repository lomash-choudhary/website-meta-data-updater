// lib/auth.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
  interface JWT {
    accessToken?: string;
  }
}

// Validate environment variables
if (!process.env.GITHUB_CLIENT_ID) throw new Error("Missing GITHUB_CLIENT_ID");
if (!process.env.GITHUB_CLIENT_SECRET)
  throw new Error("Missing GITHUB_CLIENT_SECRET");
if (!process.env.NEXTAUTH_SECRET) throw new Error("Missing NEXTAUTH_SECRET");
