
const API_KEY = 'yc_live_3E662huSyv5fF252_L8Xxi-vMIjEL59omxo4-mQOzKQ=';

async function testSimple() {
    console.log("Testing HN...");
    try {
        const response = await fetch("https://api.yellowcake.dev/v1/extract-stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
            },
            body: JSON.stringify({
                url: "https://news.ycombinator.com/",
                prompt: "Extract 3 post titles."
            }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            console.log(chunk);
        }
        console.log("Done.");
    } catch (err) {
        console.error("Error:", err);
    }
}
testSimple();
