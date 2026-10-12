import { getServerSession } from "next-auth";
import { authOptions, getAuthConfiguration } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionUserId(): Promise<string | null> {
  if (!getAuthConfiguration().enabled) return null;
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  return id ? prisma.user.findUnique({ where: { id } }) : null;
}
