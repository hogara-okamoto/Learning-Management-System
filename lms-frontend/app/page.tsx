"use client";

import { useState, useEffect } from "react";
import ReactPlayer from "react-player";

export default function VideoLesson() {
    const [videoUrl, setVideoUrl] = useState("");
    const [inputUrl, setInputUrl] = useState(""); 
    const [summary, setSummary] = useState("");
    const [transcript, setTranscript] = useState("");
    const [progress, setProgress] = useState("Waiting for input...");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const eventSource = new EventSource("http://localhost:5000/progress");
        
        eventSource.onmessage = (event) => {
            setProgress(event.data);  // ✅ Update progress text in UI
        };

        return () => eventSource.close();
    }, []);

    async function fetchSummary() {
        setIsProcessing(true);
        setProgress("Starting process...");

        try {
            const res = await fetch("http://localhost:5000/generate-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: inputUrl })
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
        <div className="w-full flex flex-col items-center justify-center h-screen p-4">
            <h1 className="text-2xl font-bold mb-4">YouTube Video Summarizer</h1>

            {/* ✅ Input field */}
            <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter YouTube URL..."
                className="p-2 border rounded w-96 mb-4"
            />

            {/* ✅ Progress Display */}
            <div className="w-full max-w-lg p-3 rounded bg-gray-100 mb-4 text-center">
                <p className="text-gray-800 font-semibold">{progress}</p>
            </div>

            {/* ✅ Generate Summary Button */}
            <button 
                onClick={fetchSummary} 
                className={`px-4 py-2 rounded-md text-white ${
                    isProcessing ? "bg-gray-500 cursor-not-allowed" : "bg-blue-500"
                }`}
                disabled={isProcessing}
            >
                {isProcessing ? "Processing..." : "Generate Summary"}
            </button>

            {/* ✅ Video Player */}
            {videoUrl && (
                <div className="mt-4">
                    <ReactPlayer url={videoUrl} controls />
                </div>
            )}

            {/* ✅ Summary Section (Fixed CSS with Proper Container) */}
            {summary && (
                <div className="w-full flex justify-center mt-6">
                    <div 
                        className="max-w-[800px] px-5 py-6 bg-white shadow-md rounded-lg border border-gray-200"
                    >
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Summary</h2>
                    
                        {/* ✅ Ensure summary loads correctly by using dangerouslySetInnerHTML */}
                        <p 
                            className="text-lg text-gray-700 leading-relaxed whitespace-pre-line"
                            dangerouslySetInnerHTML={{ __html: summary }}
                        />
                    </div>
                </div>
            )}


        </div>
    );
}
