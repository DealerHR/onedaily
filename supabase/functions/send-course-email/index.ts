import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendCourseRequest {
  courseId: string;
  recipientEmail: string;
  recipientName: string;
  resendApiKey: string;
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

    const { courseId, recipientEmail, recipientName, resendApiKey }: SendCourseRequest = await req.json();

    if (!courseId || !recipientEmail || !resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single();

    if (!course) {
      return new Response(
        JSON.stringify({ error: "Course not found or unauthorized" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: modules } = await supabaseAdmin
      .from("course_modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    const modulesWithLessons = await Promise.all(
      (modules || []).map(async (module) => {
        const { data: lessons } = await supabaseAdmin
          .from("module_lessons")
          .select("*")
          .eq("module_id", module.id)
          .order("order_index");

        const lessonsWithAssignments = await Promise.all(
          (lessons || []).map(async (lesson) => {
            const { data: assignments } = await supabaseAdmin
              .from("lesson_assignments")
              .select("*")
              .eq("lesson_id", lesson.id)
              .order("order_index");

            return { ...lesson, assignments: assignments || [] };
          })
        );

        return { ...module, lessons: lessonsWithAssignments };
      })
    );

    const emailHtml = generateCourseEmail(course, modulesWithLessons, recipientName);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OneDaily <courses@yourdomain.com>",
        to: [recipientEmail],
        subject: `Course Assignment: ${course.title}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);

      await supabaseAdmin
        .from("course_assignments")
        .insert({
          course_id: courseId,
          assigned_by: user.id,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          status: "failed",
        });

      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: errorData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabaseAdmin
      .from("course_assignments")
      .insert({
        course_id: courseId,
        assigned_by: user.id,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({ success: true, message: "Course sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in send-course-email:", error);
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

function generateCourseEmail(course: any, modules: any[], recipientName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #1e40af; margin: 0 0 10px 0; font-size: 28px; }
    .course-info { background: #eff6ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .course-info p { margin: 8px 0; }
    .module { margin: 30px 0; padding: 20px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; }
    .module h2 { color: #1e40af; margin-top: 0; font-size: 22px; }
    .lesson { margin: 20px 0; padding: 15px; background: white; border-radius: 4px; }
    .lesson h3 { color: #475569; margin-top: 0; font-size: 18px; }
    .objectives { background: #fef3c7; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .objectives ul { margin: 10px 0; padding-left: 20px; }
    .assignment { background: #dbeafe; padding: 12px; border-radius: 4px; margin: 10px 0; }
    .assignment-type { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 ${course.title}</h1>
      <p style="color: #6b7280; font-size: 16px;">Hello ${recipientName || 'Student'},</p>
      <p>You've been assigned a new course. Below you'll find all the course materials, lessons, and assignments.</p>
    </div>

    <div class="course-info">
      <p><strong>Course Description:</strong> ${course.description || 'N/A'}</p>
      <p><strong>Duration:</strong> ${course.duration || 'Self-paced'}</p>
      <p><strong>Prerequisites:</strong> ${course.prerequisites || 'None'}</p>
    </div>

    ${modules.map((module, idx) => `
      <div class="module">
        <h2>Module ${idx + 1}: ${module.title}</h2>
        <p>${module.description}</p>

        ${module.lessons.map((lesson: any, lessonIdx: number) => `
          <div class="lesson">
            <h3>Lesson ${lessonIdx + 1}: ${lesson.title}</h3>
            <p>${lesson.content}</p>

            ${lesson.learning_objectives && lesson.learning_objectives.length > 0 ? `
              <div class="objectives">
                <strong>🎯 Learning Objectives:</strong>
                <ul>
                  ${lesson.learning_objectives.map((obj: string) => `<li>${obj}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${lesson.assignments && lesson.assignments.length > 0 ? `
              <div style="margin-top: 15px;">
                <strong>📝 Assignments:</strong>
                ${lesson.assignments.map((assignment: any) => `
                  <div class="assignment">
                    <span class="assignment-type">${assignment.type.replace('_', ' ')}</span>
                    <p style="margin: 8px 0 0 0;"><strong>${assignment.title}</strong></p>
                    ${assignment.description ? `<p style="margin: 5px 0 0 0; font-size: 14px;">${assignment.description}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="footer">
      <p>This course was created using OneDaily</p>
      <p>© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}
