import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureAdmin(req);
    const {id} = await params;
    
    const { data, error } = await supabase
      .from("subjects")
      .select(`
        *,
        courses (id, name)
      `)
      .eq("id", id)
      .single();
      
    if (error) throw error;
    
    // Transform data to include course info
    const transformedData = {
      ...data,
      course: data.courses,
      courses: undefined // Remove the nested array
    };
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: transformedData 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const {id} = await params;
    const body = await req.json();
    
    const { 
      name, 
      description, 
      course_id,
      is_active 
    } = body;
    
    // Validate required fields
    if (!name) throw new Error("Subject name is required");
    if (!course_id) throw new Error("Course ID is required");
    
    const updates = { 
      updated_by: admin.sub || admin.id || null, 
      updated_at: new Date().toISOString() 
    };
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (course_id !== undefined) updates.course_id = course_id;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        courses (id, name)
      `)
      .single();
      
    if (error) throw error;
    
    // Transform data to include course info
    const transformedData = {
      ...data,
      course: data.courses,
      courses: undefined
    };
    
    return new Response(JSON.stringify({ 
      success: true, 
      subject: transformedData 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Subject PUT error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const {id} = await params;
    
    const { data: existingSubject, error: fetchError } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("id", id)
      .single();
      
    if (fetchError) throw new Error("Subject not found");
   
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id")
      .eq("subject_id", id)
      .limit(1);
      
    if (chaptersError) {
      console.warn("Error checking chapters:", chaptersError);
    }
    
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Subject "${existingSubject.name}" deleted successfully` 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Subject DELETE error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}