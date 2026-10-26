import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteCourseRequest {
  course_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: DeleteCourseRequest = await req.json();

    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("user_id")
      .eq("id", requestData.course_id)
      .maybeSingle();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (course.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to delete this campaign" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: modules } = await supabaseAdmin
      .from("course_modules")
      .select("id")
      .eq("course_id", requestData.course_id);

    if (modules && modules.length > 0) {
      const moduleIds = modules.map(m => m.id);

      await supabaseAdmin
        .from("module_lessons")
        .delete()
        .in("module_id", moduleIds);

      await supabaseAdmin
        .from("course_modules")
        .delete()
        .eq("course_id", requestData.course_id);
    }

    const { data: enrollments } = await supabaseAdmin
      .from("course_enrollments")
      .select("id")
      .eq("course_id", requestData.course_id);

    if (enrollments && enrollments.length > 0) {
      const enrollmentIds = enrollments.map(e => e.id);

      await supabaseAdmin
        .from("lesson_deliveries")
        .delete()
        .in("enrollment_id", enrollmentIds);

      await supabaseAdmin
        .from("course_enrollments")
        .delete()
        .eq("course_id", requestData.course_id);
    }

    const { error: deleteCourseError } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", requestData.course_id);

    if (deleteCourseError) throw deleteCourseError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Campaign deleted successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in delete-course:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
