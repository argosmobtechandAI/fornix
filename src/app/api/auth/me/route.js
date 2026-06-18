import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

function getToken(req) {
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.split("; ").find((c) => c.startsWith("token="));
  return match ? match.split("=")[1] : null;
}

export async function GET(req) {
  try {
    const token = getToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.json({
      success: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        university_id: decoded.university_id || null,
        academic_year: decoded.academic_year || null,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
