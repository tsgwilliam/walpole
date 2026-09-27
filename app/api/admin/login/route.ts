import { adminCookieName, adminPassword, passwordMatches, signSession } from "@/lib/auth";
import { redirectBack } from "@/lib/redirect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!adminPassword()) {
    return redirectBack(request, "/admin?error=unset");
  }
  if (!passwordMatches(password)) {
    return redirectBack(request, "/admin?error=1");
  }
  const response = redirectBack(request, "/admin");
  response.cookies.set(adminCookieName(), signSession(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
