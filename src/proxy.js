import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

function addCors(req, res) {
  const origin = req.headers.get("origin") || "*";
  // Dynamic fallback: Echo back request origin if no static override is defined
  const allowOrigin = process.env.NEXT_PUBLIC_CORS_ALLOW_ORIGIN && process.env.NEXT_PUBLIC_CORS_ALLOW_ORIGIN !== "*"
    ? process.env.NEXT_PUBLIC_CORS_ALLOW_ORIGIN
    : origin;

  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    req.headers.get("access-control-request-headers") || "Content-Type, Authorization, X-Requested-With, Accept"
  );
  return res;
}

export function proxy(request) {
  const url = request.nextUrl.pathname;
  const method = request.method;
  const token =
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.split(" ")[1];

  // Open CORS for all /api/v1 routes
  if (url.startsWith("/api/v1")) {
    if (method === "OPTIONS") {
      const res = addCors(request, new NextResponse(null, { status: 204 }));
      return res;
    }
    const res = addCors(request, NextResponse.next());
    return res;
  }

  try {
    const decoded = token ? jwtDecode(token) : null;
    const role = decoded?.role ? String(decoded.role).toLowerCase() : null;

    if (
      url.startsWith("/admin") &&
      !url.startsWith("/admin/login") &&
      !url.startsWith("/admin/setup")
    ) {
      if (!role || role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }

    if (url.startsWith("/doctor") && !url.startsWith("/doctor/login")) {
      if (!role || role !== "doctor") {
        return NextResponse.redirect(new URL("/doctor/login", request.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Proxy auth error:", err?.message || err);

    if (url.startsWith("/admin") && !url.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (url.startsWith("/doctor") && !url.startsWith("/doctor/login")) {
      return NextResponse.redirect(new URL("/doctor/login", request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/v1/:path*", "/admin/:path*", "/doctor/:path*"],
};
