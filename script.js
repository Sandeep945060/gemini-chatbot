const chatMessages = document.getElementById('chat-messages');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const addFileBtn = document.getElementById('add-file-btn');
const fileInput = document.getElementById('file-input');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const deleteChatsBtn = document.getElementById('delete-chats-btn');
const suggestions = document.querySelectorAll('.suggestion.item');

const BOT_AVATAR_SRC = 'gemini-chatbot-logo.svg'; // Replace with your bot avatar image path

const CHAT_STORAGE_KEY = 'gemini_chat_history';
const THEME_STORAGE_KEY = 'gemini_chat_theme';

init();

function init() {
  loadTheme();
  loadChatHistory();
  setupEventListeners();
}

function setupEventListeners() {
  promptForm.addEventListener('submit', onFormSubmit);
  addFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', onFilesSelected);
  themeToggleBtn.addEventListener('click', toggleTheme);
  deleteChatsBtn.addEventListener('click', deleteChatHistory);
  suggestions.forEach(sug => {
    sug.addEventListener('click', () => {
      promptInput.value = sug.querySelector('.text').textContent.trim();
      promptInput.focus();
    });
  });
}

async function onFormSubmit(e) {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;

  addMessageToChat('user', userMessage);
  promptInput.value = '';
  saveChatHistory();

  if (fileInput.files.length > 0) {
    for (const file of fileInput.files) {
      addMessageToChat('user', `📎 Uploaded: ${file.name} (${file.type}, ${formatBytes(file.size)})`);
      await showFilePreview(file);
    }
    fileInput.value = '';
    saveChatHistory();
  }

  addTypingIndicator();

  try {
    const botReply = await fetchGeminiResponse(userMessage);
    updateLastBotMessage(botReply);
    saveChatHistory();
  } catch (err) {
    updateLastBotMessage('⚠️ Error: Unable to reach AI service.');
  }
}

function addMessageToChat(sender, text, isPending = false) {
  const messageEl = document.createElement('div');
  messageEl.classList.add('message', `${sender}-message`);
  if (sender === 'bot') {
    const avatar = document.createElement('img');
    avatar.src = BOT_AVATAR_SRC;
    avatar.alt = 'Gemini Avatar';
    avatar.className = 'avatar';
    messageEl.appendChild(avatar);
  }
  const textEl = document.createElement('p');
  textEl.className = 'text';
  textEl.textContent = text;
  if (isPending) {
    textEl.classList.add('pending');
  }
  messageEl.appendChild(textEl);
  chatMessages.appendChild(messageEl);
  scrollToBottom();
}

function addTypingIndicator() {
  const messageEl = document.createElement('div');
  messageEl.classList.add('message', 'bot-message');
  
  const avatar = document.createElement('img');
  avatar.src = BOT_AVATAR_SRC;
  avatar.alt = 'Gemini Avatar';
  avatar.className = 'avatar';
  
  const typingEl = document.createElement('p');
  typingEl.className = 'text';
  
  const dots = document.createElement('span');
  dots.classList.add('typing-dots');
  dots.innerHTML = `<span></span><span></span><span></span>`;
  
  typingEl.appendChild(dots);
  
  messageEl.appendChild(avatar);
  messageEl.appendChild(typingEl);
  
  chatMessages.appendChild(messageEl);
  scrollToBottom();
}

function updateLastBotMessage(text) {
  const botMessages = chatMessages.querySelectorAll('.bot-message');
  if (botMessages.length === 0) return;
  const lastMessage = botMessages[botMessages.length - 1];
  const textEl = lastMessage.querySelector('.text');
  if (!textEl) return;
  textEl.innerHTML = text;
}

async function fetchGeminiResponse(message) {
  const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // Put your OpenAI API key here
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
    max_tokens: 500,
    temperature: 0.7
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return "⚠️ API error: " + (error.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("Fetch error:", error);
    return "⚠️ Network or API error occurred.";
  }
}

async function showFilePreview(file) {
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    const imgEl = document.createElement('img');
    imgEl.src = url;
    imgEl.alt = file.name;
    imgEl.style.maxWidth = '200px';
    imgEl.style.borderRadius = '10px';
    imgEl.style.marginTop = '8px';
    imgEl.classList.add('bot-message', 'message');
    const container = document.createElement('div');
    container.classList.add('bot-message', 'message');
    container.appendChild(imgEl);
    chatMessages.appendChild(container);
    scrollToBottom();
  } else if (file.type === 'application/pdf') {
    const pEl = document.createElement('p');
    pEl.textContent = `📄 PDF file uploaded: ${file.name}`;
    pEl.classList.add('bot-message', 'message');
    chatMessages.appendChild(pEl);
    scrollToBottom();
  }
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveChatHistory() {
  const messages = [];
  chatMessages.querySelectorAll('.message').forEach(msgEl => {
    const sender = msgEl.classList.contains('user-message') ? 'user' : 'bot';
    let text = msgEl.querySelector('.text')?.textContent || '';
    if (text === '' || text === 'Typing...') return;
    messages.push({ sender, text });
  });
  localStorage.setItem('chatHistory', JSON.stringify(messages));
}
