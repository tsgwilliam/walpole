import { adminCookieName } from "@/lib/auth";
import { redirectBack } from "@/lib/redirect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = redirectBack(request, "/admin");
  response.cookies.set(adminCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
