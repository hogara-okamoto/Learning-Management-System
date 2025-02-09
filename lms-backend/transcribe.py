import sys
import json
import whisper_timestamped
import torch

def transcribe(audio_path):
    # Load optimized Whisper model (change "tiny", "base", "small" for speed vs. accuracy tradeoff)
    model_size = "base"  # Change to "base" or "small" if needed
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = whisper_timestamped.load_model(model_size, device=device)
    result = model.transcribe(audio_path)
    
    transcript_text = " ".join([seg["text"] for seg in result["segments"]])

    # Output the result as JSON
    print(json.dumps({"text": transcript_text}))

if __name__ == "__main__":
    audio_path = sys.argv[1]  # Get the audio file path from command-line arguments
    transcribe(audio_path)
