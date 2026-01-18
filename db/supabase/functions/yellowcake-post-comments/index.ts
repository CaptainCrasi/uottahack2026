import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROMPT = `Return exactly 3 items that highlight pain points. Output each as "comment_text"`;

const toOldReddit = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl.trim());
    if (!parsed.hostname.includes("reddit.com")) {
      return rawUrl.trim();
    }

    parsed.hostname = "old.reddit.com";
    return parsed.toString();
  } catch (_err) {
    return rawUrl.trim();
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const yellowcakeApiKey = Deno.env.get("YELLOWCAKE_API_KEY");
    if (!yellowcakeApiKey) {
      console.error("YELLOWCAKE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "YELLOWCAKE_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url : "";
    let prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const inputText = typeof body?.inputText === "string" ? body.inputText.trim() : "";

    if (!url) {
      console.error("No URL provided to yellowcake-post-comments");
      return new Response(
        JSON.stringify({ error: "url is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // specific logic: if inputText is provided, generate a prompt using openrouter-call
    if (inputText && !prompt) {
        try {
            console.log("Generating prompt via openrouter-call for input:", inputText);
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
            
            if (supabaseUrl && supabaseAnonKey) {
                const openRouterResponse = await fetch(`${supabaseUrl}/functions/v1/openrouter-call`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ input: inputText, type: "analyze_comments" }),
                });

                if (openRouterResponse.ok) {
                    const data = await openRouterResponse.json();
                    if (data && data.prompt) {
                        prompt = data.prompt;
                        console.log("Generated prompt:", prompt);
                    }
                } else {
                    console.error("Failed to call openrouter-call", await openRouterResponse.text());
                }
            } else {
                 console.warn("Missing SUPABASE_URL or SUPABASE_ANON_KEY, skipping prompt generation");
            }
        } catch (err) {
            console.error("Error generating prompt:", err);
        }
    }

    const normalizedUrl = toOldReddit(url);
    const requestPayload = {
      url: normalizedUrl,
      prompt: prompt || DEFAULT_PROMPT,
      authorizedURLs: [
        "https://old.reddit.com/",
        "https://www.reddit.com/",
        "https://reddit.com/",
      ],
    };

    console.log("Proxying Yellowcake request for", normalizedUrl);

    const upstreamResponse = await fetch("https://api.yellowcake.dev/v1/extract-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": yellowcakeApiKey,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error("Yellowcake upstream error", upstreamResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: `Yellowcake upstream error: ${upstreamResponse.status}`,
          details: errorText,
        }),
        {
          status: upstreamResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!upstreamResponse.body) {
      console.error("Yellowcake upstream returned empty body");
      return new Response(
        JSON.stringify({ error: "Yellowcake upstream returned empty body" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(upstreamResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("yellowcake-post-comments error", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
