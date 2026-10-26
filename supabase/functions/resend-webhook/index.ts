import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, svix-id, svix-timestamp, svix-signature",
};

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received webhook event:", body);

    const { type, data } = body;

    if (!type || !data) {
      console.log("Invalid webhook payload");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailId = data.email_id;
    const recipientEmail = data.to?.[0] || data.email;

    const { data: delivery } = await supabase
      .from("lesson_deliveries")
      .select("id")
      .eq("email_id", emailId)
      .maybeSingle();

    if (delivery) {
      await supabase.from("email_events").insert({
        delivery_id: delivery.id,
        event_type: type,
        email_id: emailId,
        recipient_email: recipientEmail,
        timestamp: new Date().toISOString(),
        metadata: data,
      });

      if (type === "email.opened" && !delivery.opened_at) {
        await supabase
          .from("lesson_deliveries")
          .update({ opened_at: new Date().toISOString() })
          .eq("id", delivery.id);
      }

      if (type === "email.clicked" && !delivery.clicked_at) {
        await supabase
          .from("lesson_deliveries")
          .update({ clicked_at: new Date().toISOString() })
          .eq("id", delivery.id);
      }
    }

    console.log("Webhook processed successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
