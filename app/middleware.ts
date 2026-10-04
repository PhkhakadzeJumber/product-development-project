import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// MVP: auth lives in localStorage (client). Middleware only guards that
// protected paths exist; full role checks happen in useRequireRole + backend 403s.
const PUBLIC = ["/", "/login", "/register/patient"];
export function middleware(req: NextRequest) {
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
