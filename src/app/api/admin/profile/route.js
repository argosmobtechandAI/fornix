import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabaseAdmin";
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
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "admin") {
            return NextResponse.json({ success: false, error: "Forbidden: Admins only" }, { status: 403 });
        }

        const url = new URL(req.url);
        if (url.searchParams.get("logs") === "true") {
            const { data: logs, error: logsErr } = await supabase
                .from("admin_audit_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);
            
            return NextResponse.json({ success: true, data: logs || [] });
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("full_name, email")
            .eq("id", decoded.sub)
            .single();

        if (error || !user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: user });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status: 401 });
    }
}

export async function PUT(req) {
    try {
        const token = getToken(req);
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "admin") {
            return NextResponse.json({ success: false, error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { full_name, email, password } = body;

        let updatePayload = {
            updated_at: new Date().toISOString()
        };

        let detailsArr = [];

        if (full_name) {
            updatePayload.full_name = full_name;
            detailsArr.push("Name updated");
        }

        if (email && email.trim().length > 0) {
            updatePayload.email = email.trim();
            detailsArr.push(`Email updated to ${email.trim()}`);
        }

        // Only update password if provided
        if (password && password.trim().length > 0) {
            const password_hash = await bcrypt.hash(password, 10);
            updatePayload.password_hash = password_hash;
            detailsArr.push("Password updated");
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", decoded.sub)
            .select("full_name, email")
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
        }

        // Insert audit log
        try {
            const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
            await supabase.from("admin_audit_logs").insert([{
                admin_id: decoded.sub,
                admin_email: (email || decoded.email || updatedUser?.email || "admin").trim(),
                action: (password && password.trim().length > 0) ? "UPDATED_CREDENTIALS" : "UPDATED_PROFILE",
                details: detailsArr.length > 0 ? detailsArr.join(", ") : "Profile reviewed",
                ip_address: ip
            }]);
        } catch (logErr) {
            console.warn("Audit log insert warning:", logErr);
        }

        return NextResponse.json({ success: true, message: "Profile updated successfully", data: updatedUser });

    } catch (err) {
        return NextResponse.json({ success: false, error: err.message || "Update failed" }, { status: 500 });
    }
}
