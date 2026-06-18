import { supabase } from "@/lib/supabaseAdmin";

// Admin API: manage countries and colleges, including CSV bulk upload
// POST: create/update country or college
// GET: list countries with colleges
// DELETE: delete country or college
// BULK CSV: POST with action="bulk_csv" and text/csv payload in body

/**
 * Parse a CSV line respecting quoted fields.
 * Handles commas inside double-quoted values correctly.
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function GET() {
  try {
    const { data: countries, error } = await supabase
      .from("countries")
      .select("id, name, code, courses_csv, created_at, updated_at, colleges:colleges(id, name, city, type)")
      .order("name", { ascending: true });
    if (error) throw error;

    return Response.json({ success: true, data: countries || [] }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // BULK CSV upload: text/csv in body
    if (contentType.includes("text/csv")) {
      const csvText = await req.text();
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        return Response.json(
          { success: false, error: "CSV must include header and at least one row" },
          { status: 400 },
        );
      }

      const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
      const idxCountry = header.indexOf("country");
      const idxCode = header.indexOf("code");
      const idxCourses = header.indexOf("courses");
      const idxCollege = header.indexOf("college");
      const idxCity = header.indexOf("city");
      const idxType = header.indexOf("type");

      if (idxCountry === -1 || idxCollege === -1) {
        return Response.json(
          { success: false, error: "CSV must have at least 'country' and 'college' columns" },
          { status: 400 },
        );
      }

      const countryCache = new Map();

      for (let i = 1; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw.trim()) continue;
        const cols = parseCSVLine(raw);

        const countryName = cols[idxCountry]?.trim();
        const countryCode = idxCode >= 0 ? cols[idxCode]?.trim() || null : null;
        const rawCourses = idxCourses >= 0 ? cols[idxCourses]?.trim() || null : null;
        // Normalize courses: support both pipe (|) and comma (,) separators from CSV
        const coursesCsv = rawCourses
          ? rawCourses.split(/[|,]/).map(s => s.trim()).filter(Boolean).join(", ")
          : null;
        const collegeName = cols[idxCollege]?.trim();
        const city = idxCity >= 0 ? cols[idxCity]?.trim() || null : null;
        const type = idxType >= 0 ? cols[idxType]?.trim().toLowerCase() || null : null;

        if (!countryName || !collegeName) continue;

        const cacheKey = countryName.toLowerCase();
        let countryId = countryCache.get(cacheKey);

        if (!countryId) {
          const { data: existing, error: cErr } = await supabase
            .from("countries")
            .select("id, courses_csv")
            .ilike("name", countryName)
            .single();

          if (!cErr && existing) {
            countryId = existing.id;
            let mergedCourses = existing.courses_csv || "";
            if (coursesCsv) {
              const all = (mergedCourses ? mergedCourses.split(",") : [])
                .concat(coursesCsv.split(","))
                .map((s) => s.trim())
                .filter((s) => !!s);
              const uniq = Array.from(new Set(all));
              mergedCourses = uniq.join(", ");

              await supabase
                .from("countries")
                .update({ code: countryCode || existing.code, courses_csv: mergedCourses })
                .eq("id", existing.id);
            }
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from("countries")
              .insert({ name: countryName, code: countryCode, courses_csv: coursesCsv })
              .select("id")
              .single();
            if (insErr) throw insErr;
            countryId = inserted.id;
          }

          countryCache.set(cacheKey, countryId);
        }

        if (!countryId) continue;

        const { data: existingCollege } = await supabase
          .from("colleges")
          .select("id")
          .eq("country_id", countryId)
          .ilike("name", collegeName)
          .single();

        if (existingCollege) continue;

        await supabase.from("colleges").insert({
          country_id: countryId,
          name: collegeName,
          city: city,
          type: type === "university" ? "university" : type === "college" ? "college" : null,
        });
      }

      return Response.json({ success: true }, { status: 200 });
    }

    // JSON body for single create/update/delete
    const body = await req.json();
    const { action } = body || {};

    if (action === "create_country") {
      const { name, code = null, courses_csv = null } = body;
      if (!name) {
        return Response.json(
          { success: false, error: "name is required" },
          { status: 400 },
        );
      }
      const { data: inserted, error } = await supabase
        .from("countries")
        .insert({ name, code, courses_csv })
        .select("*")
        .single();
      if (error) throw error;
      return Response.json({ success: true, country: inserted }, { status: 200 });
    }

    if (action === "update_country") {
      const { id, name, code = null, courses_csv = null } = body;
      if (!id || !name) {
        return Response.json(
          { success: false, error: "id and name are required" },
          { status: 400 },
        );
      }

      const { data: updated, error } = await supabase
        .from("countries")
        .update({ name, code, courses_csv })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return Response.json({ success: true, country: updated }, { status: 200 });
    }

    if (action === "create_college") {
      const { country_id, name, city = null, type = null } = body;
      if (!country_id || !name) {
        return Response.json(
          { success: false, error: "country_id and name are required" },
          { status: 400 },
        );
      }
      const { data: inserted, error } = await supabase
        .from("colleges")
        .insert({ country_id, name, city, type })
        .select("*")
        .single();
      if (error) throw error;
      return Response.json({ success: true, college: inserted }, { status: 200 });
    }

    if (action === "update_college") {
      const { id, country_id, name, city = null, type = null } = body;
      if (!id || !country_id || !name) {
        return Response.json(
          { success: false, error: "id, country_id and name are required" },
          { status: 400 },
        );
      }
      const { data: updated, error } = await supabase
        .from("colleges")
        .update({ country_id, name, city, type })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return Response.json({ success: true, college: updated }, { status: 200 });
    }

    if (action === "bulk_delete_countries") {
      const { ids } = body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json(
          { success: false, error: "ids array is required" },
          { status: 400 },
        );
      }
      const { error } = await supabase.from("countries").delete().in("id", ids);
      if (error) throw error;
      return Response.json({ success: true, deleted: ids.length }, { status: 200 });
    }

    if (action === "delete_country") {
      const { id } = body;
      if (!id) {
        return Response.json(
          { success: false, error: "id is required" },
          { status: 400 },
        );
      }
      const { error } = await supabase.from("countries").delete().eq("id", id);
      if (error) throw error;
      return Response.json({ success: true }, { status: 200 });
    }

    if (action === "delete_college") {
      const { id } = body;
      if (!id) {
        return Response.json(
          { success: false, error: "id is required" },
          { status: 400 },
        );
      }
      const { error } = await supabase.from("colleges").delete().eq("id", id);
      if (error) throw error;
      return Response.json({ success: true }, { status: 200 });
    }

    return Response.json(
      { success: false, error: "Unknown or missing action" },
      { status: 400 },
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
