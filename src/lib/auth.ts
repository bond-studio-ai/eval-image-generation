import { auth } from "@clerk/nextjs/server";
import { isLocalAuthBypassEnabled } from "./local-auth-bypass";

export async function authenticatedUserId(): Promise<string | null> {
  if (isLocalAuthBypassEnabled()) return "local-dev-user";
  const { userId } = await auth();
  return userId;
}
