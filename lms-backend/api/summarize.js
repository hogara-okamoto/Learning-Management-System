import { OpenAI } from "openai";
import { spawn } from 'child_process';
import { Readable } from 'stream';
const ytdl = require('ytdl-core'); // Import ytdl-core

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Function to Split Large Text into Smaller Chunks (Now included)
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { url: videoUrl } = req.body;
      if (!videoUrl) return res.status(400).json({ error: "YouTube URL is required" });
  
      // 1. Download audio using a service (example using ytdl-core, needs install)
      const ytdl = require('ytdl-core');
      const audioStream = ytdl(videoUrl, { quality: 'highestaudio' });
  
      // 2. Transcribe using a Python child process
      const pythonProcess = spawn('python3', ['transcribe.py'], { stdio: ['pipe', 'pipe', 'pipe'] });
  
      // Pipe the audio stream to the Python process
      audioStream.pipe(pythonProcess.stdin);
  
      let transcript = '';
      let transcriptionError = null;
  
      pythonProcess.stdout.on('data', (data) => {
        try {
          const transcriptData = JSON.parse(data.toString());
          transcript = transcriptData.text;
        } catch (e) {
          console.error("Error parsing JSON:", e);
          transcriptionError = "Error parsing transcription output.";
        }
      });
  
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Transcription error: ${data}`);
        transcriptionError = data.toString();
      });
  
      return new Promise((resolve, reject) => {
          pythonProcess.on('close', async (code) => {
              if (code !== 0 || transcriptionError) {
                  console.error("Transcription process exited with code", code);
                  reject({ error: transcriptionError || "Transcription failed" });
                  return res.status(500).json({ error: transcriptionError || "Transcription failed" });
              }
  
              // 3. Summarize (same as before)
              const transcriptChunks = splitText(transcript, 2000);
              const summaries = [];
              for (const chunk of transcriptChunks) {
                  const summaryResponse = await openai.chat.completions.create({
                      model: "gpt-4",
                      messages: [{ role: "user", content: `Summarize this in JAPANESE ONLY within 100 words: ${chunk}` }]
                  });
                  summaries.push(summaryResponse.choices[0].message.content);
              }
              const finalSummary = summaries.join("\n\n");
              resolve(res.status(200).json({ summary: finalSummary, transcript }));
          });
      });
  
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }