import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function supabaseServer() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: CookieToSet[]) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookies are read-only there.
          // Middleware will refresh the session instead.
        }
      },
    },
  });
}

export async function getSessionUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
