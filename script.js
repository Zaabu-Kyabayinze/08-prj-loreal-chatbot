/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// System prompt for the assistant
const systemPrompt = `You are a helpful assistant for L’Oréal. Only answer questions related to L’Oréal products, beauty routines, product recommendations, or beauty-related topics. Track the conversation context, including the user's name and past questions, to support natural, multi-turn interactions. If a question is outside these topics, politely refuse and guide the user back to L’Oréal or beauty-related queries.`;

// Set initial message
chatWindow.innerHTML = `<div class="msg ai bubble">👋 Hello! How can I help you today?</div>`;

// Store conversation history
let messages = [{ role: "system", content: systemPrompt }];

// Helper to append messages as bubbles
function appendMessage(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${role} bubble`;
  msgDiv.textContent = content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Helper to show the user's latest question above the AI response
function showLatestQuestion(question) {
  // Remove any previous latest-question
  const prev = chatWindow.querySelector(".latest-question");
  if (prev) prev.remove();

  const latestDiv = document.createElement("div");
  latestDiv.className = "latest-question";
  latestDiv.textContent = `You asked: "${question}"`;
  chatWindow.appendChild(latestDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMsg = userInput.value.trim();
  if (!userMsg) return;

  appendMessage("user", userMsg);
  messages.push({ role: "user", content: userMsg });
  userInput.value = "";

  // Show the latest question above the AI response
  showLatestQuestion(userMsg);

  appendMessage("ai", "…"); // Loading indicator

  try {
    // Use your deployed Cloudflare Worker endpoint:
    const CLOUDFLARE_WORKER_URL =
      "https://round-hill-fcd2.zaabudarin.workers.dev/";
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();
    // Remove loading indicator
    chatWindow.removeChild(chatWindow.lastChild);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiMsg = data.choices[0].message.content.trim();
      appendMessage("ai", aiMsg);
      messages.push({ role: "assistant", content: aiMsg });
    } else {
      appendMessage(
        "ai",
        "Sorry, I couldn't get a response. Please try again."
      );
    }
  } catch (err) {
    // Remove loading indicator
    chatWindow.removeChild(chatWindow.lastChild);
    appendMessage(
      "ai",
      "Sorry, there was a problem connecting to the assistant. Please try again later."
    );
  }
});
