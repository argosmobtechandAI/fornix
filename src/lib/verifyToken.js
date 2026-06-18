import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabaseAdmin";

export async function verifyToken(req) {

  const token =
    req.cookies.get?.("token")?.value ||
    req.headers.get("authorization")?.split?.(" ")[1];

  if (!token) throw new Error("Unauthorized: missing token");

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded) throw new Error("Unauthorized: invalid token");

  // Single-device login check (skipped for admins to support simultaneous testing and multi-device management)
  if (decoded.role !== "admin") {
    if (!decoded.session_id || !decoded.sub) {
      throw new Error("Unauthorized: Invalid session token. Please log in again.");
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('current_session_id')
        .eq('id', decoded.sub)
        .single();

    if (error || !user || user.current_session_id !== decoded.session_id) {
      throw new Error("Unauthorized: Session expired. Logged in from another device.");
    }
  }

  return decoded; 
}

export async function ensureAdmin(req) {
  const decoded = await verifyToken(req);
  if (decoded.role !== "admin") throw new Error("Forbidden");
  return decoded;
}

export async function ensureDoctor(req) {
  const decoded = await verifyToken(req);
  if (decoded.role !== "doctor") throw new Error("Forbidden");
  return decoded;
}

// "Student" accounts are stored as role === "user" in this project.
export async function ensureUser(req) {
  const decoded = await verifyToken(req);
  if (decoded.role !== "user") throw new Error("Forbidden");
  return decoded;
}