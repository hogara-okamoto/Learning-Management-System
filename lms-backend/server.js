const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fs = require("fs");
const { spawnSync } = require("child_process");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const clients = [];

app.get("/progress", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    clients.push(res);
    req.on("close", () => {
        clients.splice(clients.indexOf(res), 1);
    });
});

function sendProgressUpdate(message) {
    clients.forEach(client => client.write(`data: ${message}\n\n`));
}

// ✅ Function to Split Large Text into Smaller Chunks
function splitText(text, maxTokens = 2000) {
    const words = text.split(" ");
    let chunks = [];
    let chunk = [];

    for (let word of words) {
        chunk.push(word);
        if (chunk.join(" ").length >= maxTokens) {
            chunks.push(chunk.join(" "));
            chunk = [];
        }
    }
    if (chunk.length > 0) {
        chunks.push(chunk.join(" "));
    }
    return chunks;
}

// ✅ Process YouTube Video
app.post("/generate-summary", async (req, res) => {
    try {
        const { url: videoUrl } = req.body;
        if (!videoUrl) return res.status(400).json({ error: "YouTube URL is required" });

        const audioPath = "converted_audio.mp3"; 

        // Step 1: Download Audio Directly
        sendProgressUpdate("Downloading...");
        console.log("Downloading audio...");
        const downloadProcess = spawnSync("yt-dlp", [
            "-x",                      // Extract audio only
            "--audio-format", "mp3",   // Convert directly to MP3
            "--audio-quality", "32K",  // Set audio quality (lower = faster)
            "-o", audioPath,           // Output file name
            videoUrl
        ], { stdio: "inherit" });

        if (downloadProcess.status !== 0) {
            sendProgressUpdate("Error: Failed to download audio.");
            console.error("❌ Error downloading audio");
            return res.status(500).json({ error: "Failed to download audio" });
        }

        sendProgressUpdate("Download complete ✅");
        console.log("✅ Audio Downloaded Successfully:", audioPath);

        // Step 2: Transcribe Audio with `whisper-timestamped`
        try {
            sendProgressUpdate("Transcribing...");
            console.log("Transcribing audio...");
            const transcriptionProcess = spawnSync("python3", ["transcribe.py", audioPath]);

            if (transcriptionProcess.error) {
                sendProgressUpdate("Error: Transcription failed.");
                throw transcriptionProcess.error;
            }

            const transcriptOutput = transcriptionProcess.stdout.toString();
            const transcriptData = JSON.parse(transcriptOutput);
            let transcript = transcriptData.text;

            sendProgressUpdate("Transcription complete ✅");
            console.log("📜 Full Transcript Generated:", transcript);

            // Step 3: Summarize the Transcript
            sendProgressUpdate("Summarizing...");
            const transcriptChunks = splitText(transcript, 2000);
            let summaries = [];

            for (let i = 0; i < transcriptChunks.length; i++) {
                sendProgressUpdate(`Summarizing part ${i + 1}/${transcriptChunks.length}...`);
                console.log(`📝 Summarizing Part ${i + 1}/${transcriptChunks.length}`);

                const summaryResponse = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ 
                        role: "user", 
                        content: `Summarize this in JAPANESE ONLY within 100 words: ${transcriptChunks[i]}` 
                    }]
                });

                summaries.push(summaryResponse.choices[0].message.content);
            }

            const finalSummary = summaries.join("\n\n");

            sendProgressUpdate("Summary complete ✅");
            console.log("📄 Final Summary Generated:", finalSummary);

            res.json({ summary: finalSummary });

            // Step 4: Delete Temporary Files (Optional)
            fs.unlinkSync(audioPath);

        } catch (error) {
            sendProgressUpdate("Error: Internal server error.");
            console.error("❌ Transcription Error:", error);
            res.status(500).json({ error: "Error in audio transcription" });
        }

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
