/**
 * Resolve the public-facing origin of the site.
 *
 * Render (and most reverse proxies) forward to the Node app on a localhost
 * port, so `request.url` and `request.headers.host` show the internal host.
 * The proxy injects `x-forwarded-host` / `x-forwarded-proto` with the public
 * values — read those, and let an env var override.
 */

function trim(url: string): string {
  return url.replace(/\/+$/, "");
}

export function siteUrlFromRequest(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return trim(env);

  const proto =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;

  return `${proto}://${host}`;
}

/** For use in the browser (client components). */
export function siteUrlBrowser(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return trim(env);
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
