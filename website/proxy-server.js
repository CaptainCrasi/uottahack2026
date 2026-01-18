import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // In newer Node fetch is native, but just in case for compat

const app = express();
app.use(express.json());
app.use(cors());

// Log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Simple in-memory queue for rate limiting
const requestQueue = [];
const requestCache = new Map(); // Cache results: URL -> Result Object
let isProcessing = false;
const RATE_LIMIT_DELAY = 2500; // 2.5 seconds between requests (Heavy rate limiting)

const processQueue = async () => {
    if (isProcessing || requestQueue.length === 0) return;
    
    isProcessing = true;
    const { url, resolve, reject } = requestQueue.shift();

    // Check cache again just in case (though we check before queueing usually)
    if (requestCache.has(url)) {
        console.log(`Serving from cache (queue-time check): ${url}`);
        resolve(requestCache.get(url));
        // We still respect the rate limit delay even for cached hits? 
        // No, cached hits can be instant. But we need to reset isProcessing.
        isProcessing = false;
        processQueue();
        return;
    }

    try {
        console.log(`Processing ${url} (Queue size: ${requestQueue.length})`);
        
        // Handle URL parsing to safely add .json extension
        const urlObj = new URL(url);
        if (urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        urlObj.pathname += '.json';
        const jsonUrl = urlObj.toString();

        const r = await fetch(jsonUrl, {
            headers: { 
                // Use a descriptive User-Agent
                "User-Agent": "web:uottahack2026-analysis:v1.0.0 (by /u/CaptainCrasi)",
                "Accept": "application/json"
            },
        });

        if (!r.ok) {
            console.error(`Reddit fetch failed: ${r.status}`);
            reject(new Error(`Reddit fetch failed: ${r.status}`));
        } else {
            const json = await r.json();
            const post = json?.[0]?.data?.children?.[0]?.data;

            if (!post) {
                reject(new Error("Not a valid post URL - no post data found"));
            } else {
                const result = {
                    date: new Date(post.created_utc * 1000).toLocaleDateString(),
                    title: post.title,
                    text: post.selftext,
                    url: post.url,
                    upvotes: post.ups,
                    comments: post.num_comments,
                    permalink: `https://www.reddit.com${post.permalink}`,
                    subreddit: post.subreddit
                };
                console.log(`Success: ${post.title.substring(0, 30)}...`);
                requestCache.set(url, result); // Cache result using original URL
                resolve(result);
            }
        }
    } catch (e) {
        console.error("Proxy error:", e.message);
        reject(e);
    } finally {
        // Wait for the delay before processing the next item
        setTimeout(() => {
            isProcessing = false;
            processQueue();
        }, RATE_LIMIT_DELAY);
    }
};

app.post("/api/reddit-meta", async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL is required" });

    if (requestCache.has(url)) {
        console.log(`Serving from cache: ${url}`);
        return res.json(requestCache.get(url));
    }

    // Add to queue
    new Promise((resolve, reject) => {
        requestQueue.push({ url, resolve, reject });
        processQueue();
    })
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ error: error.message }));
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Proxy API running on http://localhost:${PORT}`));
