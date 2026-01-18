import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Edge function: builds a Yellowcake-friendly Reddit scrape prompt using OpenRouter (Gemini 2.5 Flash Lite)
Deno.serve(async (req) => {
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

    // Check for mode
    const mode = body.mode || 'generate-prompt';
    console.log(`Operating in mode: ${mode}`);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      throw new Error('OPENROUTER_API_KEY is not set. Configure it in Supabase Edge Function secrets.');
    }

    let systemPrompt = '';
    let userContent = '';

    if (mode === 'generate-ideas') {
      const posts = body.posts; // Expecting array of objects or strings
      if (!posts || !Array.isArray(posts)) {
        throw new Error('Mode "generate-ideas" requires "posts" array in body.');
      }

      const postsText = posts.map((p, i) => {
        const content = typeof p === 'string' ? p : (p.title + '\n' + p.text);
        return `Post ${i + 1}:\n${content}\n---`;
      }).join('\n');

      systemPrompt = `You are a startup idea generator. Analyze the following Reddit posts describing user frustrations.
Generate 3 viable, specific product ideas that solve these problems.
Return valid JSON only. Format:
{
  "ideas": [
    {
      "title": "Product Name",
      "description": "One sentence description of what it does.",
      "why_it_works": "Why this solves the specific frustration found in the posts."
    }
  ]
}
Do not output markdown code blocks, just the raw JSON string.`;
      userContent = `Here are the posts:\n${postsText}`;

    } else {
      // Default: generate-prompt
      const product = typeof body?.product === 'string' ? body.product.trim() : '';
      const problem = typeof body?.problem === 'string' ? body.problem.trim() : '';
      const input = typeof body?.input === 'string' ? body.input.trim() : '';

      if (!product && !problem && !input) {
        console.error('Missing input in request body');
        throw new Error('Provide either product/problem fields or a single input string.');
      }

      const context = input || `Product: ${product || 'N/A'} | Problem solved: ${problem || 'N/A'}`;
      console.log('Building prompt for context:', context.substring(0, 80) + '...');
      systemPrompt = `Create a Reddit scraper instruction based on this product:
${context}

Generate ONE sentence following this structure:
Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with [BRANDS/TOOLS] such as [PAIN_POINT_1], [PAIN_POINT_2], [PAIN_POINT_3], especially [FRUSTRATION] while [USER_GOAL].

Example: Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with Stripe/PayPal/Square such as frozen payouts, surprise reserves, or delayed settlements, especially when dealing with high-risk transactions while running an online store.

Output only the sentence, no explanation.`;
      userContent = systemPrompt; // In this case, the system prompt is basically the user instruction in the old code, but let's structure it properly.
      // Actually, looking at previous code, it sent 'systemPrompt' as user content. Let's keep that structure to minimize regression risk, 
      // but for the new mode we use distinct system/user roles if possible, or just put it all in user content if that's safer for this simple model.
      // The previous code sent 'systemPrompt' variable as 'user' role content.
      userContent = systemPrompt;
      systemPrompt = 'You are a helpful assistant.'; // explicit system prompt not used previously? default behavior.
    }

    console.log('Calling OpenRouter (Gemini 2.5 Flash Lite)...');

    // Construct messages based on mode
    const messages = mode === 'generate-ideas'
      ? [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
      : [
        { role: 'user', content: userContent }
      ];

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
        messages: messages,
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

    let resultText = choice.message?.content?.trim();
    if (!resultText) {
      throw new Error('No response content from OpenRouter');
    }

    // Cleanup markdown
    resultText = resultText.replace(/```[a-z]*\n?|\n?```/g, '').trim();

    if (mode === 'generate-ideas') {
      // Parse JSON for ideas
      try {
        const parsed = JSON.parse(resultText);
        return new Response(JSON.stringify(parsed), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        console.error('Failed to parse ideas JSON:', e);
        // Fallback: return raw text
        return new Response(JSON.stringify({ ideas: [], raw: resultText, error: 'Failed to parse JSON' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    } else {
      // Original behavior: return prompt object
      return new Response(JSON.stringify({
        prompt: resultText
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

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
