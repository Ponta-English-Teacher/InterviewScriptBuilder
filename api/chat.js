// api/chat.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // --- START CORRECTION ---
    // Add a check for the API key early
    if (!OPENAI_API_KEY) {
        console.error("Server Error: OPENAI_API_KEY environment variable is not set.");
        return res.status(500).json({ message: "Server configuration error: API Key missing." });
    }
    // --- END CORRECTION ---

    const { messages, max_tokens } = req.body;

    // Basic validation for request body
    if (!messages) {
        return res.status(400).json({ message: 'Missing messages in request body.' });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                max_tokens: max_tokens
            })
        });

        const data = await response.json();

        // --- START CORRECTION ---
        // Forward OpenAI's error responses to the client
        if (!response.ok) {
            console.error("OpenAI API error response:", data);
            return res.status(response.status).json(data);
        }
        // --- END CORRECTION ---

        res.status(response.status).json(data);
    } catch (error) {
        console.error("Serverless function error (chat):", error);
        // --- START CORRECTION ---
        // Ensure even unexpected errors return JSON
        res.status(500).json({ message: "Internal Server Error during API call.", details: error.message });
        // --- END CORRECTION ---
    }
}
