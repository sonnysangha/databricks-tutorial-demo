import "server-only";
import { headers } from "next/headers";

// This is a private team demo. Databricks Apps authenticates at its ingress.
// Local access must be explicitly enabled and is restricted to a loopback host.
export async function requireAppAccess() {
  const h = await headers();
  if (process.env.DATABRICKS_APP_NAME) {
    const identity = h.get("x-forwarded-email");
    if (identity) return identity;
  } else if (process.env.LOCAL_DEMO_MODE === "true" &&
      /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h.get("host") ?? "")) {
    return "local-demo";
  }
  throw new Error("Sign in to the team app to continue.");
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  const host = request.headers.get("host");
  const localDemo = !process.env.DATABRICKS_APP_NAME && process.env.LOCAL_DEMO_MODE === "true";
  // Local demos can change ports. Require the browser's origin to match the
  // actual loopback host, rather than a stale deployed-origin setting.
  if (localDemo &&
      /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host ?? "") &&
      (origin === `http://${host}` || origin === `https://${host}`)) return;
  // Next's internal request URL may use localhost behind the loopback/proxy host.
  if (localDemo || !origin || (expected ? origin !== expected :
      new URL(origin).host !== request.headers.get("host")))
    throw new Error("This page's address could not be verified. Reopen Submit feedback from the navigation and try again.");
}
