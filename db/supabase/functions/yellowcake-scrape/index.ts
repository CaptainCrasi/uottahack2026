// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received request to yellowcake-scrape')
    const { prompt } = await req.json()
    console.log('Prompt received:', prompt)

    if (!prompt) {
      console.error('No prompt provided')
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const yellowcakeApiKey = Deno.env.get('YELLOWCAKE_API_KEY')
    console.log('API Key exists:', !!yellowcakeApiKey)
    console.log('API Key prefix:', yellowcakeApiKey ? yellowcakeApiKey.substring(0, 10) + '...' : 'none')
    
    if (!yellowcakeApiKey) {
      console.error('YELLOWCAKE_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'YELLOWCAKE_API_KEY not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create a ReadableStream to handle the streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const requestBody = {
            url: 'https://old.reddit.com/',
            prompt: prompt,
            authorizedURLs: [
              'https://old.reddit.com/',
              'https://www.reddit.com/'
            ]
          }
          
          console.log('Calling Yellowcake API with:', JSON.stringify(requestBody))
          
          const response = await fetch('https://api.yellowcake.dev/v1/extract-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': yellowcakeApiKey,
            },
            body: JSON.stringify(requestBody)
          })

          console.log('Yellowcake API response status:', response.status)
          console.log('Yellowcake API response headers:', JSON.stringify([...response.headers.entries()]))

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Yellowcake API error response:', errorText)
            const errorMsg = `event: error\ndata: ${JSON.stringify({ 
              error: `Yellowcake API error: ${response.status}`, 
              details: errorText 
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorMsg))
            controller.close()
            return
          }

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) {
            console.error('No response body from Yellowcake API')
            const errorMsg = `event: error\ndata: ${JSON.stringify({ error: 'No response body' })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorMsg))
            controller.close()
            return
          }

          console.log('Starting to stream data from Yellowcake')
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('Stream completed')
              controller.close()
              break
            }

            // Decode the chunk and forward it to the client
            const chunk = decoder.decode(value, { stream: true })
            controller.enqueue(new TextEncoder().encode(chunk))
          }
        } catch (error) {
          console.error('Error in stream:', error.message, error.stack)
          const errorMessage = `event: error\ndata: ${JSON.stringify({ 
            error: error.message,
            stack: error.stack 
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(errorMessage))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Top-level error:', error.message, error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
