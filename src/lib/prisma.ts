import path from "path";
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Resolve DATABASE_URL to an ABSOLUTE path. A relative `file:./prisma/dev.db`
// is re-resolved by Prisma relative to the schema directory (prisma/),
// producing a stray `prisma/prisma/dev.db`. Anchoring to cwd avoids that and
// works identically in local dev (repo root) and Docker (`/app`).
if (!process.env.DATABASE_URL) {
  const dbFile = path.join(process.cwd(), "prisma", "dev.db");
  process.env.DATABASE_URL = `file:${dbFile}`;
}

export const prisma =
  (() => {
    const existing = globalThis.prisma;

    // In dev hot-reload, recreate client when cached instance predates schema changes.
    if (existing && typeof (existing as unknown as { systemSetting?: unknown }).systemSetting !== "undefined") {
      return existing;
    }

    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  })();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
