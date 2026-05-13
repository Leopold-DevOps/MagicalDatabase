"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isThemeId } from "@/lib/themes";

const COOKIE_NAME = "theme";
const ROTATE_COOKIE = "theme_rotate";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setTheme(themeId: string): Promise<void> {
  const store = await cookies();
  if (themeId === "auto") {
    store.set(ROTATE_COOKIE, "1", { path: "/", maxAge: ONE_YEAR });
    store.delete(COOKIE_NAME);
  } else if (isThemeId(themeId)) {
    store.set(COOKIE_NAME, themeId, { path: "/", maxAge: ONE_YEAR });
    store.delete(ROTATE_COOKIE);
  }
  revalidatePath("/", "layout");
}
