import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    const eventType = payload.type;
    const eventData = payload.event;

    if (!eventData) {
      return new Response(
        JSON.stringify({ error: "No event data" }),
        { headers, status: 400 }
      );
    }

    const userId = eventData.app_user_id;
    const entitlements = eventData.entitlements;
    const store = eventData.store;

    let status = "inactive";
    let expiresAt = null;

    if (entitlements?.premium) {
      const premium = entitlements.premium;
      if (premium.expires_date) {
        expiresAt = new Date(premium.expires_date).toISOString();
        status = new Date(premium.expires_date) > new Date() ? "active" : "expired";
      } else {
        status = "active";
      }
    }

    if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
      status = "active";
    } else if (eventType === "CANCELLATION") {
      status = "cancelled";
    } else if (eventType === "EXPIRATION" || eventType === "BILLING_ISSUE") {
      status = "expired";
    }

    const platform = store === "APP_STORE" ? "ios" : store === "PLAY_STORE" ? "android" : "unknown";

    const { error } = await supabaseClient.rpc("update_subscription_status", {
      user_id: userId,
      status: status,
      expires_at: expiresAt,
      customer_id: userId,
      platform: platform,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers, status: 400 }
    );
  }
});
