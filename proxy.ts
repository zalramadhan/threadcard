import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";
import { supabaseConfigured } from "@/lib/supabase/admin";

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="threadcard", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export async function proxy(request: NextRequest) {
  const username = process.env.THREADCARD_USER || "threadcard";
  const password = process.env.THREADCARD_PASSWORD || "";

  if (password) {
    const header = request.headers.get("authorization");
    let allowed = false;
    if (header?.startsWith("Basic ")) {
      try {
        const decoded = atob(header.slice(6));
        const separator = decoded.indexOf(":");
        if (separator >= 0) {
          const user = decoded.slice(0, separator);
          const entered = decoded.slice(separator + 1);
          allowed =
            constantTimeEqual(user, username) &&
            constantTimeEqual(entered, password);
        }
      } catch {
        // Malformed credentials fall through to 401.
      }
    }
    if (!allowed) return unauthorized();
  }

  if (!supabaseConfigured()) return NextResponse.next();
  return refreshSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
