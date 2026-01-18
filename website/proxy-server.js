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

app.post("/api/reddit-meta", async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        // Handle URL parsing to safely add .json extension
        const urlObj = new URL(url);
        // Remove trailing slash from pathname if present
        if (urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        // Add .json extension
        urlObj.pathname += '.json';
        const jsonUrl = urlObj.toString();

        console.log(`Fetching: ${jsonUrl}`);

        const r = await fetch(jsonUrl, {
            headers: { 
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
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
        res.json(result);

    } catch (e) {
        console.error("Proxy error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Proxy API running on http://localhost:${PORT}`));
