const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");
const fs = require("fs");
const { spawn } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Progress tracking
let progressClients = [];

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

        const videoPath = "downloaded_video.mp4";
        const audioPath = "converted_audio.mp3"; 

        // Step 1: Download Video from User's URL
        console.log("Downloading video...");
        const downloadProcess = spawn("yt-dlp", [
            "-x",                      // Extract audio only
            "--audio-format", "mp3",   // Convert directly to MP3
            "--audio-quality", "32K",  // Set audio quality (lower = faster)
            "-o", "converted_audio.mp3", // Output file name
            videoUrl
        ]);

        downloadProcess.on("close", async (code) => {
            if (code === 0) {
                console.log("✅ Video Downloaded Successfully:", videoPath);

                // ✅ Check that the file exists
                if (!fs.existsSync(videoPath)) {
                    console.error("❌ Error: Video file not found!");
                    return res.status(500).json({ error: "Video file not found!" });
                }

                // Step 2: Convert to MP3
                console.log("Converting and compressing video to MP3...");
                ffmpeg(videoPath)
                    .output(audioPath)
                    .audioCodec("libmp3lame")
                    .audioBitrate("32k")
                    .audioChannels(1)
                    .toFormat("mp3")
                    .on("end", async () => {
                        console.log("✅ Audio Conversion Complete:", audioPath);

                        // Step 3: Transcribe Audio with Whisper
                        try {
                            console.log("Transcribing audio...");
                            const transcriptResponse = await openai.audio.transcriptions.create({
                                file: fs.createReadStream(audioPath),
                                model: "whisper-1"
                            });

                            let transcript = transcriptResponse.text;
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
                            fs.unlinkSync(videoPath);
                            fs.unlinkSync(audioPath);

                        } catch (error) {
                            console.error("❌ Transcription Error:", error);
                            res.status(500).json({ error: "Error in audio transcription" });
                        }
                    })
                    .on("error", (err) => {
                        console.error("❌ Audio Compression Error:", err);
                        res.status(500).json({ error: "Audio conversion failed." });
                    })
                    .run();
            } else {
                console.error(`❌ Download failed with exit code ${code}`);
                res.status(500).json({ error: "Failed to download video" });
            }
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
