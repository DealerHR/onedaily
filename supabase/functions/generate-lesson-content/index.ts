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
        max_tokens: 2000,
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

interface GenerateLessonRequest {
  course_id: string;
  course_title: string;
  course_description: string;
  module_title: string;
  module_description: string;
  lesson_title: string;
  lesson_description: string;
  lesson_order: number;
  total_lessons_in_module: number;
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

    const requestData: GenerateLessonRequest = await req.json();

    const { data: courseData } = await supabaseAdmin
      .from("courses")
      .select("pdf_content")
      .eq("id", requestData.course_id)
      .maybeSingle();

    const pdfContent = courseData?.pdf_content || null;

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

    const pdfContentSection = pdfContent
      ? `\n\nSOURCE MATERIAL (Training Content):\n${pdfContent.substring(0, 30000)}\n\nIMPORTANT: Use the above training material as your PRIMARY reference. Extract specific concepts, frameworks, methodologies, case studies, and insights from this content. Reference exact details, terminology, and examples from the source material. This email should demonstrate deep engagement with the training content - cite specific frameworks, models, or approaches mentioned in the material.`
      : '';

    const lessonPrompt = `You are an expert content creator crafting high-quality email content for a OneDaily campaign.

CAMPAIGN CONTEXT:
Campaign Title: ${requestData.course_title}
Campaign Description: ${requestData.course_description}
Target Audience: ${requestData.target_audience || 'General audience'}
Campaign Objectives:
${requestData.learning_objectives}${pdfContentSection}

MODULE CONTEXT:
Module: ${requestData.module_title}
Module Description: ${requestData.module_description}

EMAIL TO CREATE:
Email ${requestData.lesson_order + 1} of ${requestData.total_lessons_in_module}: ${requestData.lesson_title}
Brief: ${requestData.lesson_description}

TONE: ${requestData.tone} - ${toneGuidelines[requestData.tone as keyof typeof toneGuidelines]}

CRITICAL CONTENT REQUIREMENTS:

1. LENGTH & FOCUS:
   - Keep it concise: 300-400 words maximum
   - One focused insight per email that can be digested in 2-3 minutes
   - Provide actionable knowledge the learner can immediately apply
   - Quality over quantity - every sentence should add value

2. FORMATTING & STRUCTURE (HTML Required):
   - Create visually engaging HTML emails with professional styling:
     * Wrap content in semantic HTML with proper structure
     * Use <h2> for the main email title
     * Use <h3> for section headings
     * Short paragraphs in <p> tags (2-3 sentences max)
     * Use <strong> tags liberally for key terms and important points
     * Use <em> tags for emphasis where appropriate
     * Include bulleted lists with <ul> and <li> for tips, steps, or key points
     * Add styled blockquotes: <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 20px 0; font-style: italic; color: #1e293b;"> for key insights or quotes
     * Use <div> containers with inline styles for callout boxes
     * Add horizontal rules <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 24px 0;"> to separate sections
     * Apply color strategically: blue (#3b82f6) for highlights, gray (#64748b) for secondary text

3. CONTENT STRUCTURE:
   - Start with an engaging <h2> title
   - Brief, relatable hook (1-2 sentences in opening <p>)
   - Present ONE core idea with clear explanation
   - Include 1-2 concrete examples or scenarios in formatted sections
   - Add a practical tip or action item (use styled callout box)
   - End with a brief reflection question or next step

4. ENGAGEMENT ELEMENTS (Must Include):
   - At least one styled callout box: <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;"><strong>💡 Key Insight:</strong> Your insight here</div>
   - At least one bulleted or numbered list
   - At least one blockquote with styling
   - Strategic use of bold and emphasis
   - Subheadings with <h3> to break up content
   - Make it visually scannable with proper spacing and formatting
   - Use conversational language that speaks directly to the reader

5. KEY OBJECTIVES:
   - Create 2-3 specific, measurable objectives
   - Each objective should describe what the reader will gain or be able to do
   - Use action-oriented language: apply, understand, recognize, create, evaluate

6. OPTIONAL ENRICHMENT:
   - If highly relevant, include ONE YouTube video URL (must be a real, existing video)
   - Only include video if it significantly adds value beyond the written content

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "content": "string - HTML formatted email content (300-400 words) with proper tags",
  "learning_objectives": ["string", "string", "string"],
  "key_takeaways": ["string", "string", "string"],
  "youtube_video_url": "string or null",
  "youtube_video_title": "string or null"
}`;

    const defaultModel = aiProvider === 'claude' ? 'claude-haiku-4-5' : 'gpt-4o-mini';
    let generatedText = await callAI(
      aiProvider,
      apiKey,
      settings.selected_model || defaultModel,
      lessonPrompt
    );

    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const lessonContent = JSON.parse(generatedText);

    // Validate YouTube URL via oEmbed to guarantee the video exists and title matches
    if (lessonContent.youtube_video_url) {
      const normalizedUrl = normalizeYouTubeUrl(lessonContent.youtube_video_url);
      if (normalizedUrl) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            lessonContent.youtube_video_url = normalizedUrl;
            lessonContent.youtube_video_title = oembedData.title;
          } else {
            lessonContent.youtube_video_url = null;
            lessonContent.youtube_video_title = null;
          }
        } catch {
          lessonContent.youtube_video_url = null;
          lessonContent.youtube_video_title = null;
        }
      } else {
        lessonContent.youtube_video_url = null;
        lessonContent.youtube_video_title = null;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        lesson: lessonContent
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in generate-lesson-content:", error);
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
