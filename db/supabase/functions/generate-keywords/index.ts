import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Edge function: builds a Yellowcake-friendly Reddit scrape prompt using Gemini 2.5 Flash
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const body = await req.json()
    const product = typeof body?.product === 'string' ? body.product.trim() : ''
    const problem = typeof body?.problem === 'string' ? body.problem.trim() : ''
    const input = typeof body?.input === 'string' ? body.input.trim() : ''

    if (!product && !problem && !input) {
      console.error('Missing input in request body')
      throw new Error('Provide either product/problem fields or a single input string.')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not set')
      throw new Error('GEMINI_API_KEY is not set. Configure it in Supabase Edge Function secrets.')
    }

    const context = input || `Product: ${product || 'N/A'} | Problem solved: ${problem || 'N/A'}`
    console.log('Building prompt for context:', context.substring(0, 80) + '...')

    const systemPrompt = `Create a Reddit scraper instruction based on this product:
${context}

Generate ONE sentence following this structure:
Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with [BRANDS/TOOLS] such as [PAIN_POINT_1], [PAIN_POINT_2], [PAIN_POINT_3], especially [FRUSTRATION] while [USER_GOAL].

Example: Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with Stripe/PayPal/Square such as frozen payouts, surprise reserves, or delayed settlements, especially when dealing with high-risk transactions while running an online store.

Output only the sentence, no explanation.`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    console.log('Calling Gemini 2.5 Flash...')

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API Error:', errorData)
      throw new Error(`Gemini API Error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('Full Gemini response:', JSON.stringify(data, null, 2))
    
    const candidate = data.candidates?.[0]
    if (!candidate) {
      console.error('No candidates in Gemini response:', JSON.stringify(data))
      throw new Error('No candidates returned from Gemini')
    }

    const finishReason = candidate.finishReason
    console.log('Finish reason:', finishReason)
    
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      console.error('Content blocked by safety filters:', finishReason)
      throw new Error(`Content generation blocked: ${finishReason}`)
    }

    if (finishReason === 'MAX_TOKENS') {
      console.warn('Response was truncated due to token limit')
      throw new Error('Response truncated. Try a shorter input or contact support.')
    }

    let promptText = candidate.content?.parts?.[0]?.text?.trim()
    if (!promptText) {
      console.error('No text in candidate:', JSON.stringify(candidate))
      throw new Error('No response content from Gemini')
    }

    console.log('Raw Gemini output before cleaning:', promptText)
    console.log('Output length:', promptText.length)
    
    promptText = promptText.replace(/```[a-z]*\n?|\n?```/g, '').trim()
    console.log('Final cleaned prompt:', promptText)
    console.log('Final length:', promptText.length)

    return new Response(JSON.stringify({ prompt: promptText }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Function error:', error.message)
    console.error('Stack trace:', error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
