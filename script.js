/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// System prompt for the assistant
const systemPrompt = `You are a luxurious, empowering, and beauty-forward digital advisor for L’Oréal. Always speak with confidence and warmth, using on-brand language that inspires beauty and self-assurance. Only answer questions related to L’Oréal products, beauty routines, product recommendations, or beauty-related topics. Track the conversation context, including the user's name and past questions, to support natural, multi-turn interactions. If a question is outside these topics, politely and gracefully guide the user back to L’Oréal or beauty-related queries.`;

// Set initial message
chatWindow.innerHTML = `<div class="msg ai bubble">Hello, gorgeous! Ready to find your perfect beauty match with L’Oréal?</div>`;

// Store conversation history
let messages = [{ role: "system", content: systemPrompt }];

// Helper to append messages as bubbles
function appendMessage(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${role} bubble`;
  msgDiv.textContent = content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  // Always speak AI messages
  if (role === "ai" && voiceModeActive) {
    speak(content);
    voiceModeActive = false;
  }
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

// Quiz modal logic
const quizModal = document.getElementById("quizModal");
const startQuiz = document.getElementById("startQuiz");
const closeQuiz = document.getElementById("closeQuiz");
const quizForm = document.getElementById("quizForm");

startQuiz.addEventListener("click", () => {
  quizModal.style.display = "flex";
});
closeQuiz.addEventListener("click", () => {
  quizModal.style.display = "none";
});
quizForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // Collect quiz answers
  const concerns = Array.from(
    quizForm.querySelectorAll('input[name="concern"]:checked')
  ).map((cb) => cb.value);
  const skinType =
    quizForm.querySelector('input[name="skinType"]:checked')?.value || "";
  // Compose a beauty advisor prompt
  let quizSummary = `My main skin concerns are: ${concerns.join(
    ", "
  )}. My skin type is: ${skinType}.`;
  // Send to chat as if user asked
  appendMessage("user", quizSummary);
  messages.push({ role: "user", content: quizSummary });
  showLatestQuestion(quizSummary);
  appendMessage("ai", "…");
  quizModal.style.display = "none";
  // Trigger the same fetch as chat submit
  sendToAI();
});

// Refactor fetch logic into a function for reuse
async function sendToAI() {
  try {
    const CLOUDFLARE_WORKER_URL =
      "https://round-hill-fcd2.zaabudarin.workers.dev/";
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
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
    chatWindow.removeChild(chatWindow.lastChild);
    appendMessage(
      "ai",
      "Sorry, there was a problem connecting to the assistant. Please try again later."
    );
  }
}

// --- Voice Input/Output ---

let voiceModeActive = false; // Only true for a single voice interaction

// Add voice button to chat form
const voiceBtn = document.createElement("button");
voiceBtn.type = "button";
voiceBtn.className = "voice-btn";
voiceBtn.title = "Speak";
voiceBtn.innerHTML =
  '<span class="material-icons" aria-hidden="true">mic</span><span class="visually-hidden">Voice input</span>';
userInput.parentNode.appendChild(voiceBtn);

// Voice recognition setup
let recognizing = false;
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = function (event) {
    userInput.value = event.results[0][0].transcript;
    userInput.focus();
    voiceModeActive = true; // Enable TTS for this interaction
    chatForm.dispatchEvent(new Event("submit", { bubbles: true }));
  };
  recognition.onend = function () {
    recognizing = false;
    voiceBtn.classList.remove("active");
  };
}

voiceBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (recognizing) {
    recognition.stop();
    recognizing = false;
    voiceBtn.classList.remove("active");
  } else {
    recognition.start();
    recognizing = true;
    voiceBtn.classList.add("active");
  }
});

// Voice output (AI message)
let selectedVoice = null;

function loadVoicesAndSelect() {
  const voices = window.speechSynthesis.getVoices();
  selectedVoice =
    voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        /female|woman|Google US English|Microsoft/.test(
          (v.name + v.voiceURI).toLowerCase()
        )
    ) ||
    voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
    ) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null;
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = loadVoicesAndSelect;
  loadVoicesAndSelect();
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1;
  utter.pitch = 1.15;
  utter.volume = 1;
  if (selectedVoice) utter.voice = selectedVoice;
  window.speechSynthesis.speak(utter);
}

// Attach file logic
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");

attachBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Show file name in chat for user feedback
  appendMessage("user", `📎 Attached file: ${file.name}`);

  // Read file as text or data URL for context (text, image, pdf, etc.)
  const reader = new FileReader();
  reader.onload = function (e) {
    let fileContent = e.target.result;
    // For text files, send content; for images/docs, send a note
    let contextMsg = "";
    if (file.type.startsWith("text/")) {
      contextMsg = `Attached file content:\n${fileContent}`;
    } else if (file.type.startsWith("image/")) {
      contextMsg = `User attached an image: ${file.name}`;
    } else {
      contextMsg = `User attached a file: ${file.name} (${file.type})`;
    }
    messages.push({ role: "user", content: contextMsg });
    // Optionally, you can trigger an AI response here:
    // appendMessage("ai", "…");
    // sendToAI();
  };
  // Read as text if possible, otherwise as DataURL
  if (file.type.startsWith("text/")) {
    reader.readAsText(file);
  } else if (file.type.startsWith("image/")) {
    reader.readAsDataURL(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
});

// --- Mood/Event Selector ---

function showMoodModal() {
  if (document.getElementById("moodModal")) return;
  const modal = document.createElement("div");
  modal.id = "moodModal";
  modal.className = "quiz-modal";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="quiz-content">
      <h2>How are you feeling today?<br><small style="font-weight:400;">Choose a mood to get started.</small></h2>
      <div id="moodOptions" style="margin:18px 0;">
        <button class="mood-btn" data-mood="Date night" style="margin:6px 8px;">💃 Date night</button>
        <button class="mood-btn" data-mood="Fresh morning" style="margin:6px 8px;">🌞 Fresh morning</button>
        <button class="mood-btn" data-mood="Boardroom boss" style="margin:6px 8px;">💼 Boardroom boss</button>
        <button class="mood-btn" data-mood="Relaxed weekend" style="margin:6px 8px;">🌿 Relaxed weekend</button>
        <button class="mood-btn" data-mood="Red carpet" style="margin:6px 8px;">✨ Red carpet</button>
      </div>
      <button id="closeMood" class="quiz-close">&times;</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Handle mood selection
  modal.querySelectorAll(".mood-btn").forEach((btn) => {
    btn.onclick = () => {
      const mood = btn.getAttribute("data-mood");
      appendMessage("user", `I'm in the mood for: ${mood}`);
      messages.push({ role: "user", content: `I'm in the mood for: ${mood}` });
      showLatestQuestion(`I'm in the mood for: ${mood}`);
      appendMessage("ai", "…");
      modal.remove();
      sendToAI();
    };
  });

  document.getElementById("closeMood").onclick = () => {
    modal.remove();
  };
}

// Add Mood button to UI (next to quiz/profile)
function addMoodBtn() {
  if (document.getElementById("moodBtn")) return;
  const btn = document.createElement("button");
  btn.id = "moodBtn";
  btn.className = "quiz-trigger";
  btn.style.marginLeft = "12px";
  btn.innerHTML = `<span class="material-icons" aria-hidden="true">mood</span>Mood`;
  btn.onclick = showMoodModal;
  // Insert after quiz/profile buttons
  const quizBtn = document.getElementById("startQuiz");
  quizBtn.parentNode.insertBefore(btn, quizBtn.nextSibling);
}
addMoodBtn();
