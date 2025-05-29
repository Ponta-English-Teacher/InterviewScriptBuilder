// api/tts.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const { input, voice, response_format } = req.body; // Changed 'text' to 'input' for consistency with OpenAI API

    // Basic validation for request body
    if (!input || !voice) {
        return res.status(400).json({ message: 'Missing input or voice in request body.' });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1", // You can keep this hardcoded here
                input: input,
                voice: voice,
                response_format: response_format || "mp3" // Default to mp3 if not provided
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("TTS API error response from OpenAI:", errorBody);
            throw new Error(`TTS API Error: ${response.status} - ${errorBody}`);
        }

        // Stream the audio back to the client
        res.setHeader('Content-Type', 'audio/mpeg'); // Correct Content-Type for MP3
        response.body.pipe(res);

    } catch (error) {
        console.error("Serverless function error (TTS):", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
