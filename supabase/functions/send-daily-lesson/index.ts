import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== EDGE FUNCTION START ===");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json().catch(() => ({}));
    const manualDeliveryId = body.delivery_id;
    console.log("Manual delivery ID:", manualDeliveryId);

    // For manual delivery (from UI), validate JWT
    if (manualDeliveryId) {
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

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        console.error("Auth error:", authError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Authenticated user:", user.id);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let pendingDeliveries: any[] = [];

    if (manualDeliveryId) {
      console.log("Fetching manual delivery:", manualDeliveryId);
      const { data, error } = await supabase
        .from("lesson_deliveries")
        .select(`
          id,
          enrollment_id,
          lesson_id,
          module_title,
          lesson_title,
          delivery_type,
          course_enrollments (
            recipient_email,
            recipient_name,
            course_id
          )
        `)
        .eq("id", manualDeliveryId)
        .single();

      console.log("Delivery query result:", { data, error });
      if (data) pendingDeliveries = [data];
    } else {
      // Fetch pending deliveries due within the last 24 hours.
      // 24-hour window recovers from missed cron runs without resurfacing
      // months-old stale deliveries. Cron runs every 5 minutes so real
      // deliveries are never more than 5 minutes late.
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data } = await supabase
        .from("lesson_deliveries")
        .select(`
          id,
          enrollment_id,
          lesson_id,
          module_title,
          lesson_title,
          delivery_type,
          course_enrollments (
            recipient_email,
            recipient_name,
            course_id
          )
        `)
        .eq("status", "pending")
        .gte("scheduled_for", dayAgo.toISOString())
        .lte("scheduled_for", now.toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(50);

      pendingDeliveries = data || [];
    }

    console.log("Pending deliveries count:", pendingDeliveries.length);

    if (pendingDeliveries.length === 0) {
      console.log("No deliveries to process");
      return new Response(
        JSON.stringify({ message: "No lessons to send today", count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const delivery of pendingDeliveries) {
      try {
        console.log("Processing delivery:", delivery.id, "Type:", delivery.delivery_type);
        const enrollment = Array.isArray(delivery.course_enrollments)
          ? delivery.course_enrollments[0]
          : delivery.course_enrollments;

        console.log("Enrollment data:", enrollment);

        if (!enrollment) {
          console.error("No enrollment found for delivery:", delivery.id);
          failedCount++;
          continue;
        }

        let emailHtml = '';
        let subject = '';

        const { data: course, error: courseError } = await supabase
          .from("courses")
          .select("*, user_id")
          .eq("id", enrollment.course_id)
          .single();

        if (courseError || !course) {
          console.error("Course not found:", courseError);
          failedCount++;
          continue;
        }

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("sender_name, sender_email, email_signature, organization")
          .eq("id", course.user_id)
          .single();

        // Fall back to admin's verified sender if the course owner hasn't set
        // a custom verified domain (courses@resend.dev is a test-only address
        // that Resend rejects for any recipient other than the account owner).
        let resolvedSenderEmail = userProfile?.sender_email || 'courses@resend.dev';
        if (!resolvedSenderEmail || resolvedSenderEmail.endsWith('@resend.dev')) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("sender_email")
            .eq("is_admin", true)
            .maybeSingle();
          resolvedSenderEmail = adminProfile?.sender_email || 'courses@resend.dev';
        }

        const senderName = userProfile?.sender_name || 'OneDaily';
        const senderEmail = resolvedSenderEmail;
        let emailSignature = userProfile?.email_signature || 'Best regards,\n{sender_name}\n{organization}';

        emailSignature = emailSignature
          .replace(/{sender_name}/g, senderName)
          .replace(/{organization}/g, userProfile?.organization || '');
        console.log("Sender info:", { senderName, senderEmail });
        console.log("Recipient:", enrollment.recipient_email);

        if (delivery.delivery_type === 'onboarding') {
          const { data: modules } = await supabase
            .from("course_modules")
            .select("id")
            .eq("course_id", enrollment.course_id);

          const totalModules = modules?.length || 0;
          let totalLessons = 0;

          for (const mod of modules || []) {
            const { data: lessons } = await supabase
              .from("module_lessons")
              .select("id")
              .eq("module_id", mod.id);
            totalLessons += lessons?.length || 0;
          }

          const totalDays = totalLessons + totalModules + 2;

          emailHtml = generateOnboardingEmail(
            enrollment.recipient_name,
            course.title,
            course.description,
            course.onboarding_email,
            totalDays,
            new Date().toISOString().split('T')[0],
            emailSignature
          );
          subject = `Welcome to ${course.title}`;

        } else if (delivery.delivery_type === 'lesson') {
          const { data: lesson } = await supabase
            .from("module_lessons")
            .select("*, module_id")
            .eq("id", delivery.lesson_id)
            .single();

          if (!lesson) continue;

          const { data: module } = await supabase
            .from("course_modules")
            .select("*")
            .eq("id", lesson.module_id)
            .single();

          const { data: assignments } = await supabase
            .from("lesson_assignments")
            .select("*")
            .eq("lesson_id", lesson.id)
            .order("order_index");

          const { data: allLessonDeliveries } = await supabase
            .from("lesson_deliveries")
            .select("id, scheduled_for")
            .eq("enrollment_id", delivery.enrollment_id)
            .eq("delivery_type", "lesson")
            .order("scheduled_for");

          const currentLessonIndex = allLessonDeliveries?.findIndex(d => d.id === delivery.id);
          const dayNumber = currentLessonIndex !== undefined && currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1;

          emailHtml = generateLessonEmail(
            enrollment.recipient_name,
            course.title,
            module.title,
            lesson.title,
            dayNumber,
            lesson,
            assignments || [],
            emailSignature,
            lesson.youtube_video_url,
            lesson.youtube_video_title
          );
          subject = lesson.email_subject || `Day ${dayNumber}: ${lesson.title}`;

        } else if (delivery.delivery_type === 'transition') {
          const moduleNames = delivery.module_title.split(' → ');

          const { data: modules } = await supabase
            .from("course_modules")
            .select("*")
            .eq("course_id", enrollment.course_id)
            .order("order_index");

          const completedModule = modules?.find(m => m.title === moduleNames[0]);
          const nextModule = modules?.find(m => m.title === moduleNames[1]);

          if (!completedModule || !nextModule) continue;

          const { data: allLessonDeliveries } = await supabase
            .from("lesson_deliveries")
            .select("id, scheduled_for")
            .eq("enrollment_id", delivery.enrollment_id)
            .eq("delivery_type", "lesson")
            .order("scheduled_for");

          const currentLessonIndex = allLessonDeliveries?.findIndex(d => d.id === delivery.id);
          const dayNumber = currentLessonIndex !== undefined && currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1;

          emailHtml = generateModuleTransitionEmail(
            enrollment.recipient_name,
            course.title,
            completedModule.title,
            completedModule.completion_summary || 'You have completed this module successfully!',
            nextModule.title,
            nextModule.next_module_preview || completedModule.next_module_preview || 'Get ready for the next module!',
            dayNumber,
            emailSignature
          );
          subject = `Module Complete: ${completedModule.title}`;

        } else if (delivery.delivery_type === 'completion') {
          const { data: modules } = await supabase
            .from("course_modules")
            .select("id")
            .eq("course_id", enrollment.course_id);

          const totalModules = modules?.length || 0;
          let totalLessons = 0;

          for (const mod of modules || []) {
            const { data: lessons } = await supabase
              .from("module_lessons")
              .select("id")
              .eq("module_id", mod.id);
            totalLessons += lessons?.length || 0;
          }

          const totalDays = totalLessons + totalModules + 2;

          emailHtml = generateCompletionEmail(
            enrollment.recipient_name,
            course.title,
            course.conclusion_email,
            totalDays,
            emailSignature
          );
          subject = `Congratulations! You completed ${course.title}`;
        }

        console.log("Preparing to send email...");
        console.log("Subject:", subject);
        console.log("Email HTML length:", emailHtml.length);

        const emailPayload = {
          from: `${senderName} <${senderEmail}>`,
          to: [enrollment.recipient_email],
          subject: subject,
          html: emailHtml,
        };
        console.log("Email payload:", JSON.stringify(emailPayload, null, 2));

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        console.log("Resend response status:", resendResponse.status);
        const responseText = await resendResponse.text();
        console.log("Resend response body:", responseText);

        if (resendResponse.ok) {
          console.log("Email sent successfully!");
          const resendData = JSON.parse(responseText);
          const emailId = resendData.id;

          await supabase
            .from("lesson_deliveries")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              email_id: emailId,
              error_message: null,
            })
            .eq("id", delivery.id);

          sentCount++;
        } else {
          console.error("Resend error:", responseText);

          await supabase
            .from("lesson_deliveries")
            .update({
              status: "failed",
              error_message: responseText.substring(0, 500),
            })
            .eq("id", delivery.id);

          failedCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Error sending email:", errorMsg);
        await supabase
          .from("lesson_deliveries")
          .update({ status: "failed", error_message: errorMsg.substring(0, 500) })
          .eq("id", delivery.id);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: manualDeliveryId ? "Email sent" : "Daily lessons processed",
        sent: sentCount,
        failed: failedCount,
        total: pendingDeliveries.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in send-daily-lesson:", error);
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

function formatContent(content: string): string {
  const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;
  const isHTML = htmlTagRegex.test(content);

  if (isHTML) {
    return content;
  } else {
    return content.split('\n\n').map((para: string) => `<p>${para}</p>`).join('');
  }
}

function generateOnboardingEmail(
  recipientName: string,
  courseTitle: string,
  courseDescription: string,
  onboardingContent: string,
  totalDays: number,
  startDate: string,
  signature: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; margin-bottom: 20px; }
    .brand { color: #1e40af; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; }
    .course-name { color: #1e40af; margin: 0 0 8px 0; font-size: 16px; font-weight: 600; }
    .header h1 { color: #1e40af; margin: 0 0 6px 0; font-size: 32px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 15px; margin: 0; }
    .welcome-badge { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 20px; border-radius: 10px; text-align: center; margin: 16px 0; }
    .welcome-badge h2 { margin: 0; font-size: 22px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 16px; }
    .content-section { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .content-section p { margin: 0 0 12px 0; line-height: 1.6; color: #374151; }
    .content-section p:last-child { margin-bottom: 0; }
    .info-box { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 16px; border-radius: 8px; margin: 16px 0; }
    .info-box h3 { color: #1e40af; margin: 0 0 10px 0; font-size: 17px; }
    .info-box p { margin: 6px 0; color: #1e40af; font-size: 14px; }
    .highlight-box { background: #fef3c7; border: 2px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #3b82f6; font-weight: 600; font-size: 15px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <p class="course-name">${courseTitle}</p>
      <h1>🎓 Welcome!</h1>
      <p class="subtitle">Your Learning Journey Begins</p>
    </div>

    <p class="greeting">Hello ${recipientName || 'Learner'},</p>

    <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">${courseDescription}</p>

    <div class="content-section">
      ${formatContent(onboardingContent)}
    </div>

    <div class="info-box">
      <h3>📅 Your Learning Schedule</h3>
      <p><strong>Duration:</strong> ${totalDays} days of daily emails</p>
      <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Delivery:</strong> One email every day at the same time</p>
    </div>

    <div class="highlight-box">
      <p><strong>💡 How It Works:</strong> Each day, you'll receive a focused email with practical insights, actionable advice, and brief exercises. This isn't about lengthy articles—it's about daily practice and building habits. Take 10-15 minutes each day to read, reflect, and apply what you learn.</p>
    </div>

    <div class="footer">
      <p class="encouragement">Your first lesson arrives tomorrow! 🚀</p>
      <p>Get ready to transform your skills one day at a time.</p>
      <p style="margin-top: 20px; white-space: pre-line;">${signature}</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateLessonEmail(
  recipientName: string,
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  dayNumber: number,
  lesson: any,
  assignments: any[],
  signature: string,
  youtubeUrl?: string | null,
  youtubeTitle?: string | null
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; margin-bottom: 16px; }
    .brand { color: #1e40af; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; }
    .course-name { color: #1e40af; margin: 0 0 8px 0; font-size: 16px; font-weight: 600; }
    .header h1 { color: #1e40af; margin: 0 0 4px 0; font-size: 28px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .course-title { text-align: center; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; padding: 12px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 16px 0; }
    .module-badge { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .lesson-title { color: #1e40af; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3; }
    .content-section { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .content-section p { margin: 0 0 12px 0; line-height: 1.6; color: #374151; }
    .content-section p:last-child { margin-bottom: 0; }
    .practice-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 8px; margin: 16px 0; border: 2px solid #fbbf24; }
    .practice-box h3 { color: #92400e; margin: 0 0 10px 0; font-size: 16px; }
    .practice-box p { margin: 6px 0; color: #78350f; line-height: 1.6; }
    .action-item { background: #eff6ff; padding: 12px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #3b82f6; }
    .action-item h4 { color: #1e40af; margin: 0 0 6px 0; font-size: 15px; }
    .action-item p { color: #475569; margin: 0; font-size: 13px; line-height: 1.6; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #3b82f6; font-weight: 600; font-size: 14px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <p class="course-name">${courseTitle}</p>
      <h1>📚 Day ${dayNumber}</h1>
      <p class="subtitle">${moduleTitle}</p>
    </div>

    <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${recipientName || 'Learner'},</p>

    <div style="margin: 16px 0;">
      <h2 class="lesson-title">${lessonTitle}</h2>
    </div>

    <div class="content-section">
      ${formatContent(lesson.email_content || lesson.content)}
    </div>

    ${lesson.learning_objectives && lesson.learning_objectives.length > 0 ? `
      <div class="practice-box">
        <h3>🎯 Today's Focus</h3>
        ${lesson.learning_objectives.map((obj: string) => `<p>• ${obj}</p>`).join('')}
      </div>
    ` : ''}

    ${youtubeUrl ? `
      <div style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); padding: 24px; border-radius: 8px; margin: 25px 0; border: 2px solid #ef4444;">
        <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 18px;">🎥 Recommended Video</h3>
        <p style="margin: 0 0 16px 0; color: #7f1d1d; line-height: 1.6;">${youtubeTitle || 'Watch this video to deepen your understanding'}</p>
        <a href="${youtubeUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Watch on YouTube</a>
      </div>
    ` : ''}

    ${assignments && assignments.length > 0 ? `
      <div style="margin: 16px 0;">
        <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">📝 Put It Into Practice</h3>
        ${assignments.map((assignment: any) => `
          <div class="action-item">
            <h4>${assignment.title}</h4>
            ${assignment.description ? `<p>${assignment.description}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="footer">
      <p class="encouragement">See you tomorrow! 🌟</p>
      <p>You're building momentum one day at a time.</p>
      <p style="margin-top: 20px; white-space: pre-line;">${signature}</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateModuleTransitionEmail(
  recipientName: string,
  courseTitle: string,
  completedModuleTitle: string,
  completedModuleSummary: string,
  nextModuleTitle: string,
  nextModuleIntroduction: string,
  dayNumber: number,
  signature: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; margin-bottom: 16px; }
    .brand { color: #1e40af; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; }
    .course-name { color: #1e40af; margin: 0 0 8px 0; font-size: 16px; font-weight: 600; }
    .header h1 { color: #1e40af; margin: 0 0 4px 0; font-size: 28px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .course-title { text-align: center; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; padding: 12px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 16px 0; }
    .celebration-badge { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px; border-radius: 10px; text-align: center; margin: 16px 0; }
    .celebration-badge h2 { margin: 0 0 6px 0; font-size: 20px; }
    .celebration-badge p { margin: 0; font-size: 13px; opacity: 0.9; }
    .summary-section { background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .summary-section h3 { color: #1e40af; margin: 0 0 12px 0; font-size: 17px; }
    .summary-section p { margin: 0 0 12px 0; line-height: 1.6; color: #1e40af; }
    .summary-section p:last-child { margin-bottom: 0; }
    .preview-section { background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .preview-section h3 { color: #1e40af; margin: 0 0 12px 0; font-size: 17px; }
    .preview-section p { margin: 0 0 12px 0; line-height: 1.6; color: #1e40af; }
    .preview-section p:last-child { margin-bottom: 0; }
    .divider { height: 2px; background: linear-gradient(to right, #60a5fa, #3b82f6); margin: 20px 0; border-radius: 2px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #3b82f6; font-weight: 600; font-size: 14px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <p class="course-name">${courseTitle}</p>
      <h1>🎉 Module Complete!</h1>
      <p class="subtitle">Day ${dayNumber} - Time to Reflect & Move Forward</p>
    </div>

    <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${recipientName || 'Learner'},</p>

    <div class="celebration-badge">
      <h2>✓ ${completedModuleTitle}</h2>
      <p>Module Completed Successfully</p>
    </div>

    <div class="summary-section">
      <h3>📚 What You've Accomplished</h3>
      ${formatContent(completedModuleSummary)}
    </div>

    <div class="divider"></div>

    <div class="preview-section">
      <h3>🚀 What's Next: ${nextModuleTitle}</h3>
      ${formatContent(nextModuleIntroduction)}
    </div>

    <div style="background: #fef3c7; border: 2px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>💡 Take a Moment:</strong> Before diving into the next module, reflect on how you'll apply what you've learned. Real growth comes from practice, not just knowledge.</p>
    </div>

    <div class="footer">
      <p class="encouragement">Ready for the next chapter! 🌟</p>
      <p>Your next lesson arrives tomorrow.</p>
      <p style="margin-top: 20px; white-space: pre-line;">${signature}</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateCompletionEmail(
  recipientName: string,
  courseTitle: string,
  conclusionContent: string,
  totalDays: number,
  signature: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f59e0b; margin-bottom: 16px; }
    .brand { color: #d97706; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; }
    .course-name { color: #d97706; margin: 0 0 8px 0; font-size: 16px; font-weight: 600; }
    .header h1 { color: #d97706; margin: 0 0 4px 0; font-size: 30px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .celebration-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 16px 0; border: 2px solid #f59e0b; }
    .celebration-section h2 { margin: 0 0 8px 0; font-size: 24px; color: #92400e; }
    .celebration-section p { margin: 0; font-size: 14px; color: #78350f; }
    .content-section { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b; }
    .content-section p { margin: 0 0 12px 0; line-height: 1.6; color: #374151; }
    .content-section p:last-child { margin-bottom: 0; }
    .stats-box { background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center; }
    .stats-box p { color: #1e40af; margin: 6px 0; font-size: 15px; }
    .stats-box .big-number { font-size: 42px; font-weight: 700; color: #1e40af; margin: 12px 0; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #d97706; font-weight: 600; font-size: 16px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <p class="course-name">${courseTitle}</p>
      <h1>🏆 Congratulations!</h1>
      <p class="subtitle">You've Completed Your Learning Journey</p>
    </div>

    <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${recipientName || 'Learner'},</p>

    <div class="celebration-section">
      <h2>Course Completed</h2>
    </div>

    <div class="stats-box">
      <p>You showed up every day for</p>
      <div class="big-number">${totalDays}</div>
      <p>consecutive days</p>
    </div>

    <div class="content-section">
      ${formatContent(conclusionContent)}
    </div>

    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;"><strong>Remember:</strong> The real measure of success isn't completing this course—it's what you do with what you've learned. Keep practicing, keep growing, keep showing up.</p>
    </div>

    <div class="footer">
      <p class="encouragement">You did it! 🎉</p>
      <p>Your dedication to daily practice has created lasting change.</p>
      <p style="margin-top: 20px; white-space: pre-line;">${signature}</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}
