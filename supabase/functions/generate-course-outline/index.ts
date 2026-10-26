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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error status:", response.status, "body:", errorData);
      throw new Error(`Claude API error (${response.status}): ${errorData.substring(0, 200)}`);
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
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error status:", response.status);
      console.error("OpenAI API error body:", errorData);
      throw new Error(`OpenAI API error (${response.status}): ${errorData.substring(0, 200)}`);
    }

    const aiResponse = await response.json();
    return aiResponse.choices?.[0]?.message?.content || "";
  }
}

interface GenerateOutlineRequest {
  title: string;
  description: string;
  target_audience: string;
  learning_objectives: string;
  num_sessions?: number;
  pdf_content?: string;
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

    const requestData: GenerateOutlineRequest = await req.json();
    console.log("Request data received:", { title: requestData.title, hasPdfContent: !!requestData.pdf_content });

    const { data: providerData } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "ai_provider")
      .maybeSingle();

    const aiProvider = providerData?.setting_value || 'openai';
    console.log("AI Provider:", aiProvider);

    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("is_admin", true)
      .maybeSingle();

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("openai_settings")
      .select("api_key, anthropic_api_key, selected_model")
      .eq("user_id", adminProfile?.id)
      .maybeSingle();

    console.log("Settings query result:", {
      hasOpenAIKey: !!settings?.api_key,
      hasAnthropicKey: !!settings?.anthropic_api_key,
      model: settings?.selected_model,
      error: settingsError
    });

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

    const numSessions = requestData.num_sessions || 30;
    const suggestedModules = Math.max(1, Math.ceil(numSessions / 7));

    const pdfContentSection = requestData.pdf_content
      ? `\n\nSource Material (Training Presentation Content):\n${requestData.pdf_content.substring(0, 50000)}\n\nIMPORTANT: Use the above training material as your PRIMARY source. Extract key concepts, frameworks, methodologies, and insights from this content. Each daily email should reinforce specific points from the presentation. Dive deep into the details provided - don't just skim the surface. Use specific examples, frameworks, and terminology from the source material.`
      : '';

    const outlinePrompt = `You are an expert content strategist creating a structured outline for a OneDaily series.

Topic: ${requestData.title}
Description: ${requestData.description}
Target Audience: ${requestData.target_audience || 'General audience'}
Goals & Objectives:
${requestData.learning_objectives}${pdfContentSection}

CRITICAL REQUIREMENT: You MUST create EXACTLY ${numSessions} daily emails in total across all phases. No more, no less.

Distribute these ${numSessions} emails across ${suggestedModules} phases. Each phase should have roughly equal numbers of emails.

IMPORTANT GUIDELINES:
1. Each phase should represent a major theme or milestone
2. Break down the topic into digestible, sequential daily content pieces
3. Each email title should be specific and engaging
4. Content should build progressively
5. Focus on practical, valuable insights
6. The total number of lessons across ALL modules MUST equal exactly ${numSessions}

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "suggested_sessions": ${numSessions},
  "modules": [
    {
      "title": "string - clear, engaging phase title",
      "description": "string - 2-3 sentences describing what this phase covers",
      "order_index": 0,
      "lessons": [
        {
          "title": "string - specific, engaging email title",
          "description": "string - brief description of what this email will cover (1-2 sentences)",
          "order_index": 0
        }
      ]
    }
  ]
}`;

    const defaultModel = aiProvider === 'claude' ? 'claude-haiku-4-5' : 'gpt-4o-mini';
    const model = settings?.selected_model || defaultModel;
    console.log("Calling AI with provider:", aiProvider, "model:", model);

    let generatedText = await callAI(
      aiProvider,
      apiKey,
      model,
      outlinePrompt
    );

    console.log("AI response received, length:", generatedText.length);
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log("Cleaned response, attempting to parse JSON");
    const outline = JSON.parse(generatedText);
    console.log("Successfully parsed outline with", outline.modules?.length, "modules");

    return new Response(
      JSON.stringify({
        success: true,
        outline: outline
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in generate-course-outline:", error);

    let errorMessage = "Internal server error";
    let errorDetails = error instanceof Error ? error.message : "Unknown error";

    if (error instanceof Error) {
      console.error("Error stack:", error.stack);

      if (error.message.includes("JSON")) {
        errorMessage = "Failed to parse AI response";
        errorDetails = "The AI returned invalid JSON. Please try again.";
      } else if (error.message.includes("API")) {
        errorMessage = "AI API error";
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
