// API Keys - Fetched from local storage or prompted to prevent GitHub leaks!
let OPENROUTER_API_KEY = localStorage.getItem('openrouter_key');

if (!OPENROUTER_API_KEY) {
    OPENROUTER_API_KEY = prompt("Enter your OpenRouter API Key to start chatting:");
    if (OPENROUTER_API_KEY) {
        localStorage.setItem('openrouter_key', OPENROUTER_API_KEY);
    }
}
// Image generation now uses Pollinations.ai which is free and requires no key.

const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const generateImageBtn = document.getElementById('generateImageBtn');
const typingIndicator = document.getElementById('typingIndicator');

let conversationHistory = [];

function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendMessage(text, sender, isImage = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);

    if (isImage) {
        const img = document.createElement('img');
        img.src = text;
        img.alt = "Generated AI Image";
        // To handle smooth scrolling after image loads
        img.onload = scrollToBottom;
        msgDiv.appendChild(img);
    } else {
        msgDiv.textContent = text;
    }

    // Insert message before typing indicator to maintain flow if needed, 
    // but here indicator is outside chatArea or at bottom
    chatArea.appendChild(msgDiv);
    scrollToBottom();
}

function appendError(errorText) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'error');
    msgDiv.textContent = errorText;
    chatArea.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    scrollToBottom();
}

function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Clear input
    userInput.value = '';

    // Append user message
    appendMessage(text, 'user');

    // Add to history
    conversationHistory.push({ role: 'user', content: text });

    // Show typing
    showTypingIndicator();

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": window.location.href, // Added for OpenRouter rankings/CORS
                "X-Title": "Local AI Chatbot", // Added for OpenRouter
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-preview-02-05:free", // Changed to a free model to avoid billing issues
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.choices && data.choices.length > 0) {
            const botResponse = data.choices[0].message.content;

            // Add to history
            conversationHistory.push({ role: 'assistant', content: botResponse });

            // Hide typing and show response
            hideTypingIndicator();
            appendMessage(botResponse, 'bot');
        } else {
            throw new Error("Invalid response format");
        }

    } catch (error) {
        console.error("Chat API Error:", error);
        hideTypingIndicator();
        appendError("Failed to fetch because of server issue");
        // Remove the user message from history if failed to maintain sync, or keep it depending on UX preferred
        conversationHistory.pop();
    }
}

async function handleGenerateImage() {
    const prompt = userInput.value.trim();
    if (!prompt) {
        appendError("Please enter a prompt in the input field to generate an image.");
        return;
    }

    // Clear input
    userInput.value = '';

    // Append user message for context
    appendMessage(`Generate image: ${prompt}`, 'user');

    showTypingIndicator();

    try {
        const encodedPrompt = encodeURIComponent(prompt);
        // Using Pollinations.ai which is free and unlimited
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        hideTypingIndicator();
        appendMessage(imageUrl, 'bot', true);

    } catch (error) {
        console.error("Image Gen API Error:", error);
        hideTypingIndicator();
        appendError("Failed to fetch because of server issue");
    }
}

// Event Listeners
sendBtn.addEventListener('click', handleSendMessage);

generateImageBtn.addEventListener('click', handleGenerateImage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

// Focus input on load
window.onload = () => {
    userInput.focus();
};
