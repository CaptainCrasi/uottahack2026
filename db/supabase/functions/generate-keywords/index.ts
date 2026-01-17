import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } })
  }

  try {
    const { input } = await req.json()
    
    if (!input) {
      console.error('Missing input in request body')
      throw new Error('Missing input in request body')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not set')
      throw new Error('GEMINI_API_KEY is not set. Please configure it in Supabase Edge Function secrets.')
    }
    
    console.log('Processing input:', input.substring(0, 50) + '...')

    const prompt = `
      You are an expert at finding relevant discussions on Reddit for audience discovery.
      
      Here is the user's input describing their product and the problem it solves:
      "${input}"
      
      First, analyze the input to understand the core problem and the product.
      Then, your goal is to find people on Reddit who are currently experiencing this problem.
      Generate 5 to 6 specific, high-intent keywords or short phrases that these users would use in their post titles or bodies when describing their pain points.
      
      Do NOT use generic terms like "help" or "advice" on their own. Use specific terminology related to the problem domain.
      Think about what someone types when they are frustrated and looking for a specific solution.
      
      Output ONLY a raw JSON object (no markdown formatting) with a single key "keywords" containing an array of strings.
      Example format: { "keywords": ["keyword 1", "keyword 2"] }
    `

    // Using Gemini 1.5 Flash with v1beta endpoint (required for this model)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log('Calling Gemini API...');
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.95
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API Error:', errorData)
      throw new Error(`Gemini API Error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('Gemini response received')
    
    // Parse the response to extract the JSON
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('No text in Gemini response:', JSON.stringify(data))
      throw new Error('No response content from Gemini')
    }
    
    console.log('Extracted text from Gemini:', text.substring(0, 100))
    
    // clean up markdown code blocks if present
    text = text.replace(/```json\n?|\n?```/g, '').trim()
    
    let result
    try {
        result = JSON.parse(text)
        console.log('Successfully parsed keywords:', result.keywords)
    } catch (e) {
        console.error("Failed to parse JSON:", text)
        console.error("Parse error:", e.message)
        throw new Error(`Failed to parse JSON response from AI: ${e.message}`)
    }

    return new Response(JSON.stringify(result), {
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
