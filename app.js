// === Configuration Section ===
const apiUrl = "/api/chat";
const ttsApiUrl = "/api/tts";

let conversationHistory = [];
let finalScript = "";
let currentAudio = null;
let isPaused = false;
let scriptVersion = 0;
let mp3Cache = null;

const voices = {
    male1: "nova",
    male2: "shimmer",
    female1: "echo",
    female2: "breeze"
};

// === Initialization Section ===
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("send-response").addEventListener("click", handleUserResponse);
    document.getElementById("generate-script").addEventListener("click", generateFinalScript);
    document.getElementById("play-script").addEventListener("click", playFinalScript);
    document.getElementById("pause-script").addEventListener("click", togglePause);
    document.getElementById("save-script").addEventListener("click", saveScript);
    document.getElementById("download-mp3").addEventListener("click", downloadMP3);
    document.getElementById("translate-button").addEventListener("click", translateJapanese);
    document.getElementById("dictionary-button").addEventListener("click", showDictionaryPopup);
    document.getElementById("popup-close").addEventListener("click", () => {
        document.getElementById("dictionary-popup").style.display = "none";
    });

    startConversation();
});

// === ChatGPT Conversation Functions ===
function startConversation() {
    addMessage("AI", "Welcome! Let’s get to know you a bit. What’s your name?");
}

function handleUserResponse() {
    const input = document.getElementById("user-response");
    const userMessage = input.value.trim();
    if (!userMessage) return;

    addMessage("You", userMessage);
    input.value = "";
    processChatGPT(userMessage);
}

function addMessage(sender, message) {
    const display = document.getElementById("conversation-display");
    const p = document.createElement("p");
    p.innerHTML = `<strong>${sender}:</strong> ${message}`;
    display.appendChild(p);
    display.scrollTop = display.scrollHeight;
}

async function processChatGPT(userInput) {
    conversationHistory.push({ role: "user", content: userInput });

    const prompt = `You are a professional and friendly TV interviewer. You are interviewing the person chatting with you — they are the guest on your show. Begin a warm, one-on-one conversation to collect their profile.

You should ask questions in a natural, engaging way — one at a time — and gather the following information:
- Full name (and how they prefer to be addressed)
- Where they are from or currently live
- Their job or main activity
- Hobbies or passions
- Memorable experiences or life turning points
- Unique traits or values that define them

Do NOT assume they are a public figure. Treat them as an individual you’re getting to know for a personal interview.

Once you feel you have enough information, say this clearly:  
"I think I’ve got enough information. Let’s create the interview script! Is there anything else you’d like to share before we move on?"`;

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                
            },
          body: JSON.stringify({
    messages: [{ role: "system", content: prompt }, ...conversationHistory],
    max_tokens: 200
})
        });
        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't think of a response.";
        addMessage("AI", aiMessage);
        conversationHistory.push({ role: "assistant", content: aiMessage });
        finalScript += `AI: ${aiMessage}\nYou: ${userInput}\n`;
    } catch (error) {
        console.error("ChatGPT API Error:", error);
        addMessage("AI", "Sorry, there was a connection error. Please try again.");
    }
}

async function generateFinalScript() {
    scriptVersion++;

    const formattedHistory = conversationHistory
        .map(entry => {
            const speaker = entry.role === "user" ? "Guest" : "Host";
            return `${speaker}: ${entry.content}`;
        })
        .join("\n");

    const prompt = `You are a professional scriptwriter for a friendly and intimate TV interview program. Please write a natural, engaging interview script based on the following real conversation between a host and a guest.

🎯 Guidelines:
- Create a dynamic show title that fits the guest’s personality (e.g., "The Remarkable", "A Man of the Week", "A Woman Today", etc.)
- Write a short, welcoming introduction by the host to open the show, introducing the guest using real info (name, background, location)
- Use a casual and friendly tone — like two people chatting comfortably on a talk show
- Use only information from the conversation. Do not invent new details or roles.
- The host should speak warmly and naturally. Avoid overly formal or scripted lines.
- Include 4–6 realistic question–answer exchanges that reflect the conversation.
- Write a closing where the host thanks the guest and audience, and invites them to tune in next time.
- The entire script should be appropriate for a 3–4 minute segment (~400–600 words)
- The script will be used by language learners, so vocabulary and expressions should be useful, natural, and clear.

Conversation transcript:
${formattedHistory}`;

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
             
            },
            body: JSON.stringify({
    messages: [{ role: "system", content: prompt }],
    max_tokens: 1000,
    temperature: 0.9
})
        });

        const data = await response.json();
        const script = data.choices?.[0]?.message?.content || "Script generation failed.";
        const scriptBox = document.getElementById("final-script-content");

        scriptBox.innerText = `🎮 Interview Script Version ${scriptVersion}\n\n${script}`;
        mp3Cache = null;

    } catch (error) {
        console.error("Script Generation Error:", error);
        alert("Failed to generate interview script.");
    }
}

async function generateTTSUrl(text, overrideVoice = null) {
    const selectedVoice = overrideVoice || "nova";
    try {
        const response = await fetch(ttsApiUrl, {
            method: "POST",
            headers: {
                
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
    input: text,
    voice: selectedVoice,
    response_format: "mp3"
})
        });

        if (!response.ok) throw new Error("TTS API Error");
        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Error generating TTS:", error);
        return null;
    }
}

async function playFinalScript() {
    const script = document.getElementById("final-script-content").innerText;
    const status = document.getElementById("tts-status");
    if (!script.trim()) return alert("No script to play.");

    status.innerText = "🔄 Now generating audio file...";
    if (mp3Cache) {
        status.innerText = "▶️ Now playing...";
        currentAudio = new Audio(mp3Cache);
        currentAudio.play();
        return;
    }

    const gender = document.getElementById("voice-gender").value;
    const selectedVoice = gender === "male" ? voices.male1 : voices.female1;

    const audioUrl = await generateTTSUrl(script, selectedVoice);
    if (audioUrl) {
        status.innerText = "▶️ Now playing...";
        currentAudio = new Audio(audioUrl);
        mp3Cache = audioUrl;
        currentAudio.play();

        currentAudio.onended = () => {
            status.innerText = "✅ Playback finished.";
        };
    } else {
        status.innerText = "❌ Failed to generate audio.";
    }
}

function togglePause() {
    const status = document.getElementById("tts-status");
    if (!currentAudio) return;
    if (isPaused) {
        currentAudio.play();
        status.innerText = "▶️ Resumed";
    } else {
        currentAudio.pause();
        status.innerText = "⏸️ Paused";
    }
    isPaused = !isPaused;
}

function saveScript() {
    const script = document.getElementById("final-script-content").innerText;
    if (!script.trim()) return alert("No script to save.");

    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview_script.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function downloadMP3() {
    const script = document.getElementById("final-script-content").innerText;
    if (!script.trim()) return alert("No script to download.");

    const gender = document.getElementById("voice-gender").value;
    const selectedVoice = gender === "male" ? voices.male1 : voices.female1;

    try {
        const audioUrl = mp3Cache || await generateTTSUrl(script, selectedVoice);
        if (!audioUrl) throw new Error("No audio URL");

        const a = document.createElement("a");
        a.href = audioUrl;
        a.download = "interview_script.mp3";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(audioUrl);
    } catch (error) {
        alert("Failed to download MP3.");
        console.error("Download MP3 error:", error);
    }
}

async function translateJapanese() {
    const jpText = document.getElementById("jp-text").value.trim();
    if (!jpText) return alert("Please enter Japanese text to translate.");

    const prompt = `Translate this Japanese into natural English for a non-native learner: "${jpText}"`;

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
    messages: [{ role: "system", content: prompt }],
    max_tokens: 100
})
        });

        const data = await response.json();
        const translation = data.choices?.[0]?.message?.content || "Translation failed.";
        document.getElementById("translation-result").innerText = translation;
    } catch (error) {
        console.error("Translation error:", error);
        document.getElementById("translation-result").innerText = "Translation failed.";
    }
}

function showDictionaryPopup() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) return alert("Please select text to look up.");

    const prompt = `Explain the word or phrase \"${selectedText}\" in simple, learner-friendly English (like Longman Dictionary) and also provide its Japanese equivalent.`;

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
           
        },
        body: JSON.stringify({
    messages: [{ role: "system", content: prompt }],
    max_tokens: 300
})
    })
    .then(response => response.json())
    .then(data => {
        const meaning = data.choices?.[0]?.message?.content || "No explanation found.";
        const popup = document.getElementById("dictionary-popup");

        document.getElementById("popup-meaning").innerText = `Selected: ${selectedText}\n\n${meaning}`;
        popup.style.display = "block";
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;

        document.getElementById("popup-play").onclick = () => {
            generateTTSUrl(selectedText, "nova").then(url => {
                if (url) new Audio(url).play();
            });
        };

        document.getElementById("popup-add").onclick = () => {
            const glossary = document.getElementById("summary-content");
            const li = document.createElement("li");
            li.textContent = `${selectedText}: ${meaning}`;
            glossary.appendChild(li);
            alert("Added to Glossary!");
        };
    })
    .catch(error => {
        console.error("Dictionary API Error:", error);
        alert("Failed to fetch dictionary explanation.");
    });
}

const popup = document.getElementById("dictionary-popup");
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

popup.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        popup.style.left = `${e.pageX - offsetX}px`;
        popup.style.top = `${e.pageY - offsetY}px`;
    }
});
