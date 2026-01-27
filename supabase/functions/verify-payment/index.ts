import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verifying payment for session:", sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid = session.payment_status === "paid";

    console.log("Payment status:", session.payment_status, "isPaid:", isPaid);

    return new Response(
      JSON.stringify({
        isPaid,
        city: session.metadata?.city,
        aspectRatio: session.metadata?.aspectRatio,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
