import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      throw new Error("Failed to regenerate lesson content with Claude");
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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error("Failed to regenerate lesson content with OpenAI");
    }

    const aiResponse = await response.json();
    return aiResponse.choices?.[0]?.message?.content || "";
  }
}

interface RegenerateLessonRequest {
  lesson_id: string;
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

    const requestData: RegenerateLessonRequest = await req.json();

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("user_id, title, description, tone, pdf_content")
      .eq("id", requestData.course_id)
      .single();

    if (!course || course.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Course not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: lesson } = await supabaseAdmin
      .from("module_lessons")
      .select(`
        *,
        course_modules!inner(
          title,
          description,
          course_id
        )
      `)
      .eq("id", requestData.lesson_id)
      .single();

    if (!lesson) {
      return new Response(
        JSON.stringify({ error: "Lesson not found" }),
        {
          status: 404,
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

    const pdfContentSection = course.pdf_content
      ? `\n\nSOURCE MATERIAL (Training Content):\n${course.pdf_content.substring(0, 8000)}\n\nIMPORTANT: Use the above training material as your PRIMARY reference. Extract specific concepts, frameworks, examples, and insights from this content.`
      : '';

    const regeneratePrompt = `You are regenerating a lesson for an email-based learning course.

Course Context:
- Title: ${course.title}
- Description: ${course.description}
- Tone: ${course.tone} (${toneGuidelines[course.tone as keyof typeof toneGuidelines]})
- Module: ${lesson.course_modules.title}
- Module Description: ${lesson.course_modules.description}${pdfContentSection}

Lesson to Regenerate:
- Title: ${lesson.title}
- Current Learning Objectives: ${JSON.stringify(lesson.learning_objectives)}

Generate fresh, engaging content for this lesson that:

LENGTH & FOCUS:
- Keep it concise: 300-400 words maximum
- One focused insight per email that can be digested in 2-3 minutes
- Provide actionable knowledge the learner can immediately apply
- Quality over quantity - every sentence should add value

FORMATTING & STRUCTURE:
- Use HTML formatting for better readability:
  * Short paragraphs (2-3 sentences max)
  * Use <strong> tags for key terms and important points
  * Use <em> tags for emphasis
  * Include bulleted lists with <ul> and <li> for tips or steps
  * Add blockquotes with <blockquote> for key insights or quotes
  * Use <h3> tags for section headings if needed

CONTENT STRUCTURE:
- Start with a brief, relatable hook (1-2 sentences)
- Present ONE core idea with clear explanation
- Include 1-2 concrete examples or scenarios
- Add a practical tip or action item
- End with a brief reflection question or next step

TONE: ${course.tone}
- Maintains the learning objectives
- Fits well within the module's context
- Is suitable for email delivery

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "email_subject": "string - compelling subject line for the email",
  "email_content": "string - HTML formatted content (300-400 words) with proper tags"
}`;

    const defaultModel = aiProvider === 'claude' ? 'claude-haiku-4-5' : 'gpt-4o-mini';
    let generatedText = await callAI(
      aiProvider,
      apiKey,
      settings?.selected_model || defaultModel,
      regeneratePrompt
    );

    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const regeneratedContent = JSON.parse(generatedText);

    const { error: updateError } = await supabaseAdmin
      .from("module_lessons")
      .update({
        email_subject: regeneratedContent.email_subject,
        email_content: regeneratedContent.email_content,
        content_generated_at: new Date().toISOString(),
        last_edited_at: null,
        edited_by: null,
      })
      .eq("id", requestData.lesson_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lesson regenerated successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in regenerate-lesson:", error);
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
