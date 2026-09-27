import { NextResponse } from "next/server";

/** Redirect using the browser's Host, not the bind address inside request.url. */
export function redirectBack(request: Request, path: string) {
  const current = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? current.protocol.replace(/:$/, "");
  const base = host ? `${proto}://${host}` : current.origin;
  return NextResponse.redirect(new URL(path, base), 303);
}
