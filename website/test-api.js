
const API_KEY = 'yc_live_3E662huSyv5fF252_L8Xxi-vMIjEL59omxo4-mQOzKQ=';

async function testExtraction() {
    console.log("Starting test extraction via Node...");
    try {
        const response = await fetch("https://api.yellowcake.dev/v1/extract-stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
            },
            body: JSON.stringify({
                url: "https://old.reddit.com/r/popular/hot/",
                prompt: "Extract details from 10 posts on this page: title, username, upvotes, comment number. Return null for missing fields."
            }),
        });

        if (!response.ok) {
            console.log("HTTP Error:", response.status, response.statusText);
            const text = await response.text();
            console.log("Response:", text);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let itemsFound = 0;
        let finalDataCount = -1;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const content = trimmed.substring(6);
                    if (content === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(content);
                        if (parsed.stage) {
                            process.stdout.write(`Stage: ${parsed.stage}\r`);
                        }

                        if (typeof parsed === 'object' && Array.isArray(parsed.data)) {
                            // Final payload
                            finalDataCount = parsed.data.length;
                            console.log(`\nFinal Payload received: ${parsed.data.length} items.`);
                            if (parsed.data.length > 0) {
                                console.log("Sample item:", JSON.stringify(parsed.data[0]).substring(0, 100));
                            }
                        }

                        // Check if it's a string token (content streaming)
                        if (typeof parsed === 'string') {
                            // console.log("Token:", parsed);
                        }
                    } catch (e) { }
                }
            }
        }

        console.log("\nStream complete.");
        if (finalDataCount === 0) {
            console.log("Confirmed: 0 items returned.");
        } else if (finalDataCount > 0) {
            console.log("Success: Items returned.");
        } else {
            console.log("Unclear result (no final payload seeen?)");
        }

    } catch (err) {
        console.error("Script Error:", err);
    }
}

testExtraction();
