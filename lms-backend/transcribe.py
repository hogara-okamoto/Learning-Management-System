import sys
import json
import whisper_timestamped

def transcribe(audio_path):
    model = whisper_timestamped.load_model("base")  # Use "tiny", "base", "small" for faster results
    result = model.transcribe(audio_path)
    
    transcript_text = " ".join([seg["text"] for seg in result["segments"]])

    # Output the result as JSON
    print(json.dumps({"text": transcript_text}))

if __name__ == "__main__":
    audio_path = sys.argv[1]  # Get the audio file path from command-line arguments
    transcribe(audio_path)
