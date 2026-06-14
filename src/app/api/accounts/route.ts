import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

export async function GET() {
  await ensureSeedData();
  const accounts = await prisma.connectedAccount.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(accounts.map((account) => serializeDates(account)));
}
