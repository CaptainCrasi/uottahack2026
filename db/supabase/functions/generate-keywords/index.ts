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

    const systemPrompt = `
  You write one single instruction for a Reddit scraping agent. Use the startup context below.

  Hard requirements:
  - Output exactly one sentence, 35-70 words.
  - Must start with: Return exactly 10 items. Output each as {post_link}.
  - Must contain the phrase: Only include posts where the author describes a problem with ...
  - Must list at least 3 concrete pain cues and 3 relevant brands/workflows from the context (or obvious adjacent ones if missing).
  - Do NOT include the words "search" or "reddit". No markdown, no JSON, no quotes around the line.
  - If context is thin, infer common pain points and brands for the space.

  Template to follow (adapt the pain cues and brands):
  Return exactly 10 items. Output each as {post_link}. Only include posts where the author describes a problem with <brands/workflows> such as <cue1>, <cue2>, <cue3>, especially when <cue4> while doing <workflow/goal>.

  Startup context to adapt:
  ${context}
  `

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    console.log('Calling Gemini 2.5 Flash...')

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 200,
          topP: 0.9,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API Error:', errorData)
      throw new Error(`Gemini API Error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    let promptText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!promptText) {
      console.error('No text in Gemini response:', JSON.stringify(data))
      throw new Error('No response content from Gemini')
    }

    promptText = promptText.replace(/```[a-z]*\n?|\n?```/g, '').trim()
    console.log('Generated prompt snippet:', promptText.substring(0, 120))

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
