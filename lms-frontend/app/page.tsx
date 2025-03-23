"use client";

import { useState, useEffect } from "react";
import ReactPlayer from "react-player";

export default function VideoLesson() {
    const [videoUrl, setVideoUrl] = useState("");
    const [inputUrl, setInputUrl] = useState(""); 
    const [summary, setSummary] = useState("");
    const [transcript, setTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(""); 

    async function fetchSummary() {
        setIsProcessing(true);
    
        try {
            const res = await fetch("http://localhost:5000/generate-summary", {
            //const res = await fetch("/api/summarize", { // Call the serverless function
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: inputUrl }),
          });
    
          const data = await res.json();
          setVideoUrl(inputUrl);
          setTranscript(data.transcript);
          setSummary(data.summary);
        } catch (error) {
          console.error("Error generating summary:", error);
        } finally {
          setIsProcessing(false);
        }
      }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            {/* Header */}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">🎬 YouTube Video Summarizer</h1>

            {/* ✅ Input field */}
            <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter YouTube URL..."
                className="w-full max-w-lg p-3 border rounded-lg shadow-md mb-4 text-gray-700"
            />

            {/* ✅ Progress Display */}
            <div className="w-full max-w-lg p-3 rounded bg-gray-100 mb-4 text-center">
                <p className="text-gray-800 font-semibold">{progress}</p>
            </div>

            {/* ✅ Generate Summary Button */}
            <button 
                onClick={fetchSummary} 
                className={`mt-4 px-6 py-3 text-lg font-semibold text-white rounded-md transition-all duration-300 ${
                    isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                }`}
                disabled={isProcessing}
            >
                {isProcessing ? "Processing..." : "Generate Summary"}
            </button>

            {/* ✅ Video Player */}
            {videoUrl && (
                <div className="mt-6 w-full max-w-2xl">
                    <ReactPlayer url={videoUrl} controls width="100%" />
                </div>
            )}

            {/* ✅ Summary Section (Fixed CSS with Proper Container) */}
            {summary && (
                <div className="mt-6 w-full max-w-2xl p-6 bg-white shadow-md rounded-lg border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">📄 Summary</h2>
                    <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>
                </div>
            )}


        </div>
    );
}
