// --- Load API Key from config.js (NOT in repo) ---
// config.js should define: window.API_KEY = "YOUR_REAL_API_KEY_HERE";
// This file must be in .gitignore and not pushed to GitHub
if (typeof window.API_KEY === 'undefined' || !window.API_KEY) {
    alert('API key not found. Please create config.js with your API key.');
    throw new Error('API key not found. Please create config.js with your API key.');
}
const API_KEY = window.API_KEY;
// --------------------------------------------------------------

// Check if the API_KEY is placeholder - remind user if it is
if (API_KEY === "YOUR_API_KEY_HERE" || API_KEY === "") {
     console.warn("Please replace 'YOUR_API_KEY_HERE' with your actual Gemini API key in script.js");
     alert("Please replace 'YOUR_API_KEY_HERE' with your actual Gemini API key in script.js");
}

const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const loading = document.getElementById('loading');

// Use the recommended 'gemini-1.5-flash-latest' model
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

// --- Core Chat Functionality ---

const addMessageToChatbox = (message, sender) => {
    const messageDiv = document.createElement('div');
    // Added break-words for better wrapping
    messageDiv.classList.add('p-2', 'rounded-lg', 'max-w-[80%]', 'mb-2', 'whitespace-pre-wrap', 'break-words');

    if (sender === 'user') {
        messageDiv.classList.add('bg-blue-500', 'text-white', 'self-end', 'ml-auto');
        messageDiv.textContent = message;
    } else if (sender === 'bot') {
        messageDiv.classList.add('bg-gray-200', 'text-gray-800', 'self-start', 'mr-auto');
        // Basic Markdown-like handling for **bold** (can be expanded)
        message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        messageDiv.innerHTML = message; // Use innerHTML to render bold tags
    } else if (sender === 'system' || sender === 'error') {
        messageDiv.classList.add(sender === 'error' ? 'bg-red-100' : 'bg-yellow-100', 'text-gray-700', 'text-sm', 'text-center', 'self-center', 'w-full');
        messageDiv.textContent = message;
    }

    // Clear initial message if it exists when first real message added
    const initialMessage = chatbox.querySelector('.text-gray-500');
    if (initialMessage && (sender === 'user' || sender === 'bot')) {
        initialMessage.remove();
    }

    chatbox.appendChild(messageDiv);
    // Scroll to the bottom
    chatbox.scrollTop = chatbox.scrollHeight;
};

const sendMessage = async () => {
    const userMessage = userInput.value.trim();
    if (!userMessage) return; // Don't send empty messages
    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") { // Added check here too
        addMessageToChatbox('Error: API Key not set correctly in script.js.', 'error');
        return;
    }

    addMessageToChatbox(userMessage, 'user');
    userInput.value = ''; // Clear input field
    userInput.disabled = true; // Disable input while bot replies
    sendButton.disabled = true; // Disable send button
    loading.classList.remove('hidden'); // Show loading indicator

    try {
        // No need to add API_KEY to URL here, it's already included in API_URL
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }]
                // Add safetySettings if needed:
                // safetySettings: [
                //   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
                //   // ... other categories
                // ]
            }),
        });

        if (!response.ok) {
            // Attempt to read error details from Google's response format
            let errorDetails = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                console.error("API Error Response:", errorData); // Log the full error
                if (errorData.error && errorData.error.message) {
                     errorDetails += ` - ${errorData.error.message}`;
                     if (errorData.error.details) {
                         errorDetails += ` Details: ${JSON.stringify(errorData.error.details)}`;
                     }
                } else {
                    errorDetails += ` - ${await response.text()}`; // Fallback
                }
            } catch (e) {
                 console.error("Failed to parse error response:", e);
            }
             addMessageToChatbox(`Error fetching response: ${errorDetails}`, 'error');
        } else {
            const data = await response.json();
            console.log("API Success Response:", data); // Log success response

             if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                 const botMessage = data.candidates[0].content.parts[0].text;
                 addMessageToChatbox(botMessage, 'bot');
             } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                 // Handle content blocking
                 addMessageToChatbox(`Blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage || ''}`, 'error');
             }
             else {
                 addMessageToChatbox('Received an empty or unexpected response from the API.', 'error');
                 console.error("Unexpected API response structure:", data);
             }
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        addMessageToChatbox(`Network or other error: ${error.message}`, 'error');
    } finally {
        loading.classList.add('hidden'); // Hide loading indicator
        userInput.disabled = false; // Re-enable input
        sendButton.disabled = false; // Re-enable send button
        userInput.focus(); // Focus back on the input field
    }
};

// --- Event Listeners ---
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !userInput.disabled) { // Added check for disabled
        event.preventDefault(); // Prevent default Enter behavior (like newline)
        sendMessage();
    }
});

// --- Initial Setup ---
// Enable input/button now that key is hardcoded
userInput.disabled = false;
sendButton.disabled = false;
userInput.focus(); // Focus input on load

// Optional: Add a system message confirming readiness
// addMessageToChatbox('Chatbot ready (API Key embedded). Start chatting!', 'system');
// Note: HTML already has an initial message, so this might be redundant unless you remove the HTML one.