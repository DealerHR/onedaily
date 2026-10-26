import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SaveOutlineRequest {
  title: string;
  description: string;
  duration: string;
  prerequisites: string;
  target_audience: string;
  tone: string;
  learning_objectives: string;
  pdf_content?: string;
  modules: Array<{
    title: string;
    description: string;
    order_index: number;
    lessons: Array<{
      title: string;
      description: string;
      order_index: number;
    }>;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: SaveOutlineRequest = await req.json();

    const { data: canCreateData, error: canCreateError } = await supabaseAdmin
      .rpc("can_create_course", { user_id: user.id });

    if (canCreateError) {
      console.error("Error checking course creation permission:", canCreateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify course creation permission" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!canCreateData) {
      return new Response(
        JSON.stringify({
          error: "Course limit reached",
          message: "You have reached the free plan limit of 2 courses. Please contact sales to upgrade.",
          upgrade_required: true
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: courseData, error: courseError } = await supabaseAdmin
      .from("courses")
      .insert({
        user_id: user.id,
        title: requestData.title,
        description: requestData.description,
        duration: requestData.duration,
        prerequisites: requestData.prerequisites || '',
        tone: requestData.tone,
        onboarding_email: `Welcome to ${requestData.title}!`,
        conclusion_email: `Congratulations on completing ${requestData.title}!`,
        status: 'draft',
        is_active: false,
        pdf_content: requestData.pdf_content || null,
      })
      .select()
      .single();

    if (courseError) throw courseError;

    for (const module of requestData.modules) {
      const { data: moduleData, error: moduleError } = await supabaseAdmin
        .from("course_modules")
        .insert({
          course_id: courseData.id,
          title: module.title,
          description: module.description,
          order_index: module.order_index,
          completion_summary: null,
          next_module_preview: null,
        })
        .select()
        .single();

      if (moduleError) throw moduleError;

      for (const lesson of module.lessons) {
        const { error: lessonError } = await supabaseAdmin
          .from("module_lessons")
          .insert({
            module_id: moduleData.id,
            title: lesson.title,
            content: lesson.description,
            learning_objectives: [],
            order_index: lesson.order_index,
            youtube_video_url: null,
            youtube_video_title: null,
            email_subject: lesson.title,
            email_content: lesson.description,
            content_generated_at: null,
          });

        if (lessonError) throw lessonError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        course_id: courseData.id,
        message: `Course outline saved! Now generate content for each lesson.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in save-course-outline:", error);
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
