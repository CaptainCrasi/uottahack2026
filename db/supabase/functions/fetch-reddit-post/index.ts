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
        const { url } = await req.json()

        if (!url) {
            return new Response(
                JSON.stringify({ error: 'URL is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Basic validation to ensure it's a reddit URL
        if (!url.includes('reddit.com')) {
            return new Response(
                JSON.stringify({ error: 'Invalid Reddit URL' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Append .json to the URL to get the JSON data
        // Handle potential trailing slashes
        const jsonUrl = url.replace(/\/$/, '') + '.json';

        console.log(`Fetching from Reddit: ${jsonUrl}`);

        const response = await fetch(jsonUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Reddit API responded with ${response.status}`);
        }

        const data = await response.json();

        // Reddit JSON structure: Array of 2 objects.
        // [0]: Listing containing the Post (t3)
        // [1]: Listing containing the Comments (t1)

        // We want the post details from [0]
        const postData = data?.[0]?.data?.children?.[0]?.data;

        if (!postData) {
            throw new Error('Could not parse post data from Reddit response');
        }

        const extractedData = {
            title: postData.title,
            selftext: postData.selftext,
            subreddit: postData.subreddit,
            score: postData.score,
            num_comments: postData.num_comments,
            created_utc: postData.created_utc,
            url: postData.url, // sometimes direct link to content
            permalink: `https://www.reddit.com${postData.permalink}`
        };

        return new Response(
            JSON.stringify(extractedData),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error fetching reddit post:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
