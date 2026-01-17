import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Edge function: builds a Yellowcake-friendly Reddit scrape prompt using OpenRouter (Gemini 2.5 Flash Lite)
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
  try {
    console.log('=== Edge Function Start ===');
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    const product = typeof body?.product === 'string' ? body.product.trim() : '';
    const problem = typeof body?.problem === 'string' ? body.problem.trim() : '';
    const input = typeof body?.input === 'string' ? body.input.trim() : '';
    if (!product && !problem && !input) {
      console.error('Missing input in request body');
      throw new Error('Provide either product/problem fields or a single input string.');
    }
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      throw new Error('OPENROUTER_API_KEY is not set. Configure it in Supabase Edge Function secrets.');
    }
    const context = input || `Product: ${product || 'N/A'} | Problem solved: ${problem || 'N/A'}`;
    console.log('Building prompt for context:', context.substring(0, 80) + '...');
    const systemPrompt = `Create a Reddit scraper instruction based on this product:
${context}

Generate ONE sentence following this structure:
Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with [BRANDS/TOOLS] such as [PAIN_POINT_1], [PAIN_POINT_2], [PAIN_POINT_3], especially [FRUSTRATION] while [USER_GOAL].

Example: Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with Stripe/PayPal/Square such as frozen payouts, surprise reserves, or delayed settlements, especially when dealing with high-risk transactions while running an online store.

Output only the sentence, no explanation.`;
    console.log('Calling OpenRouter (Gemini 2.5 Flash Lite)...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/CaptainCrasi/uottahack2026',
        'X-Title': 'Yellowcake Scraper',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.4,
        max_tokens: 8192,
        top_p: 0.95,
        top_k: 40
      })
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API Error:', errorData);
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
    }
    const data = await response.json();
    console.log('Full OpenRouter response:', JSON.stringify(data, null, 2));
    const choice = data.choices?.[0];
    if (!choice) {
      console.error('No choices in OpenRouter response:', JSON.stringify(data));
      throw new Error('No choices returned from OpenRouter');
    }
    const finishReason = choice.finish_reason;
    console.log('Finish reason:', finishReason);
    // OpenRouter might map finish reasons differently, but 'stop' is standard success.
    // Safety checks might be different, but we check for content.
    let promptText = choice.message?.content?.trim();
    if (!promptText) {
      console.error('No text in choice:', JSON.stringify(choice));
      throw new Error('No response content from OpenRouter');
    }
    console.log('Raw OpenRouter output before cleaning:', promptText);
    console.log('Output length:', promptText.length);
    promptText = promptText.replace(/```[a-z]*\n?|\n?```/g, '').trim();
    console.log('Final cleaned prompt:', promptText);
    console.log('Final length:', promptText.length);
    return new Response(JSON.stringify({
      prompt: promptText
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Stack trace:', error.stack);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
