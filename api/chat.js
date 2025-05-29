// api/chat.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // This is where your key is retrieved securely
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
                model: "gpt-4o", // You can keep this hardcoded here
                messages: messages,
                max_tokens: max_tokens
            })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Serverless function error (chat):", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
