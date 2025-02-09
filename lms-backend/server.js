const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");
const fs = require("fs");
const { spawnSync } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// ✅ Progress tracking
let progressClients = [];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/progress", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    progressClients.push(res);

    req.on("close", () => {
        progressClients = progressClients.filter(client => client !== res);
    });
});

function sendProgressUpdate(message) {
    progressClients.forEach(client => client.write(`data: ${message}\n\n`));
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
        const trimmedAudioPath = "trimmed_audio.mp3"; 

        // Step 1: Download Audio Directly
        console.log("Downloading audio...");
        const downloadProcess = spawnSync("yt-dlp", [
            "-x",                      // Extract audio only
            "--audio-format", "mp3",   // Convert directly to MP3
            "--audio-quality", "48K",  // Set audio quality (lower = faster)
            "-o", audioPath,           // Output file name
            videoUrl
        ], { stdio: "inherit" });

        if (downloadProcess.status !== 0) {
            console.error("❌ Error downloading audio");
            return res.status(500).json({ error: "Failed to download audio" });
        }

        console.log("✅ Audio Downloaded Successfully:", audioPath);

        // Step 2: Trim Silence Using `sox`
        console.log("Trimming silence...");
        const soxProcess = spawnSync("sox", [
            audioPath, trimmedAudioPath,
            "silence", "1", "0.1", "1%", "1", "0.1", "1%"
        ]);

        if (soxProcess.status !== 0) {
            console.error("❌ Error trimming silence");
            return res.status(500).json({ error: "Failed to process audio" });
        }

        console.log("✅ Silence Trimmed Successfully:", trimmedAudioPath);

        // Step 3: Transcribe Audio with `whisper-timestamped`
        try {
            console.log("Transcribing audio...");
            const transcriptionProcess = spawnSync("python3", ["transcribe.py", trimmedAudioPath]);

            if (transcriptionProcess.error) {
                throw transcriptionProcess.error;
            }

            const transcriptOutput = transcriptionProcess.stdout.toString();
            const transcriptData = JSON.parse(transcriptOutput);
            let transcript = transcriptData.text;

            console.log("📜 Full Transcript Generated:", transcript);

            // Step 4: Summarize the Transcript
            const transcriptChunks = splitText(transcript, 2000);
            let summaries = [];

            for (let i = 0; i < transcriptChunks.length; i++) {
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

            console.log("📄 Final Summary Generated:", finalSummary);

            res.json({ summary: finalSummary });

            // Step 5: Delete Temporary Files (Optional)
            fs.unlinkSync(audioPath);
            fs.unlinkSync(trimmedAudioPath);

        } catch (error) {
            console.error("❌ Transcription Error:", error);
            res.status(500).json({ error: "Error in audio transcription" });
        }

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
