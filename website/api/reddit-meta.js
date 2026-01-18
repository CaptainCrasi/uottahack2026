import fetch from "node-fetch";

// Simple in-memory cache for warm executions of serverless function
// Note: This does not persist across cold starts.
const memoryCache = new Map();

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
     return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });

  if (memoryCache.has(url)) {
      console.log(`Serving from internal cache: ${url}`);
      return res.status(200).json(memoryCache.get(url));
  }

  try {
      // Basic random delay to avoid Thundering Herd on serverless cold starts hitting reddit simultaneously
      // Note: Serverless functions cannot easily share global rate limit state without Redis.
      // This delay helps slightly with burstiness but is not a global rate limiter.
      const jitter = Math.floor(Math.random() * 2000) + 500; // 500ms - 2500ms delay
      await new Promise(r => setTimeout(r, jitter));
      
      // Handle URL parsing to safely add .json extension
      const urlObj = new URL(url);
      if (urlObj.pathname.endsWith('/')) {
          urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      urlObj.pathname += '.json';
      const jsonUrl = urlObj.toString();

      console.log(`Fetching: ${jsonUrl}`);

      const r = await fetch(jsonUrl, {
          headers: { 
              // Use a descriptive User-Agent
              "User-Agent": "web:uottahack2026-analysis:v1.0.0 (by /u/CaptainCrasi)",
              "Accept": "application/json"
          },
      });

      if (!r.ok) {
          console.error(`Reddit fetch failed: ${r.status}`);
          return res.status(r.status).json({ error: "Reddit fetch failed" });
      }

      const json = await r.json();
      // Logic: [0] is the post listing, [0].data.children[0].data is the post
      const post = json?.[0]?.data?.children?.[0]?.data;

      if (!post) {
          console.error("No post data found in response");
          return res.status(400).json({ error: "Not a valid post URL - no post data found" });
      }

      const result = {
          date: new Date(post.created_utc * 1000).toLocaleDateString(), // Format as date string for UI
          title: post.title,
          text: post.selftext,
          url: post.url,
          upvotes: post.ups,
          comments: post.num_comments,
          permalink: `https://www.reddit.com${post.permalink}`,
          subreddit: post.subreddit
      };

      console.log(`Success: ${post.title.substring(0, 30)}...`);
      memoryCache.set(url, result);
      return res.status(200).json(result);

  } catch (e) {
      console.error("Proxy error:", e.message);
      return res.status(500).json({ error: e.message });
  }
}
