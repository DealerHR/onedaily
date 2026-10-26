import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

function normalizeYouTubeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1).split("?")[0];
    } else if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    }
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return null;
  }
}

async function validateYouTubeUrl(url: string | null): Promise<{ url: string | null; title: string | null }> {
  if (!url) return { url: null, title: null };
  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) return { url: null, title: null };
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`
    );
    if (!res.ok) return { url: null, title: null };
    const data = await res.json();
    return { url: normalized, title: data.title };
  } catch {
    return { url: null, title: null };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function callAI(apiProvider: string, apiKey: string, model: string, prompt: string) {
  if (apiProvider === 'claude') {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      throw new Error("Failed to generate content with Claude");
    }

    const aiResponse = await response.json();
    return aiResponse.content[0].text;
  } else {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error("Failed to generate content with OpenAI");
    }

    const aiResponse = await response.json();
    return aiResponse.choices?.[0]?.message?.content || "";
  }
}

interface GenerateCourseRequest {
  title: string;
  description: string;
  duration: string;
  prerequisites: string;
  target_audience: string;
  tone: string;
  learning_objectives: string;
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

    const requestData: GenerateCourseRequest = await req.json();

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

    const { data: providerData } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "ai_provider")
      .maybeSingle();

    const aiProvider = providerData?.setting_value || 'openai';

    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("is_admin", true)
      .maybeSingle();

    const { data: settings } = await supabaseAdmin
      .from("openai_settings")
      .select("api_key, anthropic_api_key, selected_model")
      .eq("user_id", adminProfile?.id)
      .maybeSingle();

    const apiKey = aiProvider === 'claude' ? settings?.anthropic_api_key : settings?.api_key;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: `${aiProvider === 'claude' ? 'Anthropic Claude' : 'OpenAI'} API not configured. Please add your API key in the admin panel.`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const toneGuidelines = {
      instructional: "Use clear, structured language with formal educational tone. Be direct and informative.",
      conversational: "Write in a friendly, engaging manner as if talking to a colleague. Use 'you' and 'we' naturally.",
      "light-hearted": "Add humor and personality. Use casual language, interesting examples, and keep it fun.",
      serious: "Maintain professional, formal tone. Focus on facts and authoritative presentation."
    };

    const coursePrompt = `You are an expert instructional designer creating an email-based learning course.

Course Details:
- Title: ${requestData.title}
- Description: ${requestData.description}
- Target Audience: ${requestData.target_audience || 'General learners'}
- Duration: ${requestData.duration}
- Prerequisites: ${requestData.prerequisites || 'None'}
- Tone: ${requestData.tone} (${toneGuidelines[requestData.tone as keyof typeof toneGuidelines]})

Learning Objectives:
${requestData.learning_objectives}

Generate a complete 30-day email course structure with 4 modules (Module 1-4) and approximately 7-8 lessons per module (total 30 lessons).

Requirements:
1. Each module should cover a distinct aspect of the topic
2. Lessons should be engaging, practical, and build on each other
3. Include 1 YouTube video recommendation per module (find a real, relevant educational video)
4. For each module, write a completion summary and preview of the next module
5. Write an engaging onboarding email and a completion email
6. Use the ${requestData.tone} tone throughout
7. Each lesson should have 2-3 specific learning objectives

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "onboarding_email": "string",
  "conclusion_email": "string",
  "modules": [
    {
      "title": "string",
      "description": "string",
      "order_index": 0,
      "completion_summary": "string - summary of what was learned in this module",
      "next_module_preview": "string - preview of next module (null for last module)",
      "lessons": [
        {
          "title": "string",
          "content": "string - detailed lesson content (300-500 words)",
          "learning_objectives": ["objective 1", "objective 2", "objective 3"],
          "order_index": 0,
          "youtube_video_url": "string or null - ONLY include for ONE lesson per module",
          "youtube_video_title": "string or null - title/description of the video"
        }
      ]
    }
  ]
}`;

    const defaultModel = aiProvider === 'claude' ? 'claude-haiku-4-5' : 'gpt-4o-mini';
    let generatedText = await callAI(
      aiProvider,
      apiKey,
      settings?.selected_model || defaultModel,
      coursePrompt
    );

    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const courseStructure = JSON.parse(generatedText);

    const { data: courseData, error: courseError } = await supabaseAdmin
      .from("courses")
      .insert({
        user_id: user.id,
        title: requestData.title,
        description: requestData.description,
        duration: requestData.duration,
        prerequisites: requestData.prerequisites || null,
        tone: requestData.tone,
        onboarding_email: courseStructure.onboarding_email,
        conclusion_email: courseStructure.conclusion_email,
        status: 'draft',
      })
      .select()
      .single();

    if (courseError) throw courseError;

    for (const module of courseStructure.modules) {
      const { data: moduleData, error: moduleError } = await supabaseAdmin
        .from("course_modules")
        .insert({
          course_id: courseData.id,
          title: module.title,
          description: module.description,
          order_index: module.order_index,
          completion_summary: module.completion_summary,
          next_module_preview: module.next_module_preview,
        })
        .select()
        .single();

      if (moduleError) throw moduleError;

      for (const lesson of module.lessons) {
        const emailSubject = `Day ${lesson.order_index + 1}: ${lesson.title}`;
        const emailContent = lesson.content;

        const { url: validatedVideoUrl, title: validatedVideoTitle } =
          await validateYouTubeUrl(lesson.youtube_video_url);

        const { error: lessonError } = await supabaseAdmin
          .from("module_lessons")
          .insert({
            module_id: moduleData.id,
            title: lesson.title,
            content: lesson.content,
            learning_objectives: lesson.learning_objectives,
            order_index: lesson.order_index,
            youtube_video_url: validatedVideoUrl,
            youtube_video_title: validatedVideoTitle,
            email_subject: emailSubject,
            email_content: emailContent,
            content_generated_at: new Date().toISOString(),
          });

        if (lessonError) throw lessonError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        course_id: courseData.id,
        status: 'draft',
        message: `Draft course "${requestData.title}" generated successfully with ${courseStructure.modules.length} modules! Review and edit lessons before publishing.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in generate-course:", error);
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
