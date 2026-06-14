import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
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
