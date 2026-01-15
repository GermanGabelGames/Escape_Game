const STORAGE_KEY = 'escapeGame.state';
const CHAT_STORAGE_KEY = 'escapeGame.chat';

let conversation = [];
let currentQuestion = null;
let isWaitingForResponse = false; // Cooldown-Flag

const chat = document.getElementById('chat');
const optionsContainer = document.querySelector('.options');
const inputFieldWrapper = document.getElementById('inputFieldWrapper');
const userInput = document.getElementById('userInput');
const submitInput = document.getElementById('submitInput');
const chatHeader = document.getElementById('chatHeader');

// --- Persistenz-Helpers ---

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: false, currentId: 1 };
    return JSON.parse(raw);
  } catch (e) {
    return { unlocked: false, currentId: 1 };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveChatHistory(messages) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (e) { /* ignore */ }
}

function clearStateAndReload() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (e) {}
  location.reload();
}

// Expose "reset" in console
Object.defineProperty(window, 'reset', {
  get() {
    clearStateAndReload();
    return 'Escape Game: reset triggered';
  }
});

// --- initial state ---
let appState = loadState();
let chatHistory = []; // Speichert alle Nachrichten

// Auto-Scroll im Chat
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// Chat-Funktionen mit Geschichte
function addMessage(text, type = "from", opts = {}) {
  const msgWrap = document.createElement("div");
  msgWrap.className = `message ${type}`;

  // sender anzeigen (nur bei 'from' Nachrichten)
  if (type === "from" && opts.senderName) {
    const senderEl = document.createElement("span");
    senderEl.className = "sender";
    senderEl.textContent = opts.senderName;
    msgWrap.appendChild(senderEl);
  }

  const content = document.createElement("div");
  content.className = "content";
  
  // Prüfe ob es eine URL ist
  const isUrl = /^(https?:\/\/)|(www\.)/.test(text);
  if (isUrl) {
    const link = document.createElement("a");
    link.href = text.startsWith("http") ? text : "https://" + text;
    link.textContent = text;
    link.target = "_blank";
    link.style.color = "#0066cc";
    link.style.textDecoration = "underline";
    link.style.cursor = "pointer";
    content.appendChild(link);
  } else {
    content.textContent = text;
  }
  
  msgWrap.appendChild(content);

  // Bubble-Farbe setzen, falls angegeben
  if (opts.bubbleColor) {
    msgWrap.style.background = opts.bubbleColor;
  }

  chat.appendChild(msgWrap);

  // Speichere Nachricht in Geschichte
  chatHistory.push({
    text: text,
    type: type,
    senderName: opts.senderName || null,
    bubbleColor: opts.bubbleColor || null,
    isImage: false,
    isUrl: isUrl
  });
  saveChatHistory(chatHistory);

  scrollToBottom();
}

function addImageMessage(imageSrc, bubbleColor) {
  const imgWrap = document.createElement("div");
  imgWrap.className = "message from";
  imgWrap.style.background = bubbleColor;
  imgWrap.style.maxWidth = "100%";
  imgWrap.style.padding = "8px";
  
  const img = document.createElement("img");
  img.src = imageSrc;
  img.style.width = "100%";
  img.style.borderRadius = "12px";
  img.style.maxHeight = "250px";
  img.style.objectFit = "contain";
  
  imgWrap.appendChild(img);
  chat.appendChild(imgWrap);

  // Speichere Bild in Geschichte
  chatHistory.push({
    text: imageSrc,
    type: "from",
    senderName: null,
    bubbleColor: bubbleColor,
    isImage: true
  });
  saveChatHistory(chatHistory);

  scrollToBottom();
}

function restoreChatHistory() {
  chatHistory = loadChatHistory();
  
  chatHistory.forEach(msg => {
    if (msg.isImage) {
      const imgWrap = document.createElement("div");
      imgWrap.className = "message from";
      imgWrap.style.background = msg.bubbleColor;
      imgWrap.style.maxWidth = "100%";
      imgWrap.style.padding = "8px";
      
      const img = document.createElement("img");
      img.src = msg.text;
      img.style.width = "100%";
      img.style.borderRadius = "12px";
      img.style.maxHeight = "250px";
      img.style.objectFit = "contain";
      
      imgWrap.appendChild(img);
      chat.appendChild(imgWrap);
    } else {
      const msgWrap = document.createElement("div");
      msgWrap.className = `message ${msg.type}`;

      if (msg.type === "from" && msg.senderName) {
        const senderEl = document.createElement("span");
        senderEl.className = "sender";
        senderEl.textContent = msg.senderName;
        msgWrap.appendChild(senderEl);
      }

      const content = document.createElement("div");
      content.className = "content";
      
      // Prüfe ob es eine URL ist
      if (msg.isUrl) {
        const link = document.createElement("a");
        link.href = msg.text;
        link.textContent = msg.text;
        link.target = "_blank";
        link.style.color = "#0066cc";
        link.style.textDecoration = "underline";
        link.style.cursor = "pointer";
        content.appendChild(link);
      } else {
        content.textContent = msg.text;
      }
      
      msgWrap.appendChild(content);

      if (msg.bubbleColor) {
        msgWrap.style.background = msg.bubbleColor;
      }

      chat.appendChild(msgWrap);
    }
  });
  
  scrollToBottom();
}

function loadQuestion(id) {
  // Cooldown: Wenn noch gewartet werden muss, nichts tun
  if (isWaitingForResponse) return;

  currentQuestion = conversation.find(q => q.id === id);
  if (!currentQuestion) return;

  // Prüfe ob diese Frage bereits in der Chat-Historie vorhanden ist
  const questionExists = chatHistory.some(msg => 
    msg.text === currentQuestion.question && 
    msg.senderName === currentQuestion.sender
  );

  // Lade Frage nur wenn sie noch nicht da ist
  if (!questionExists) {
    addMessage(currentQuestion.question, "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });

    // Wenn Bild vorhanden, anzeigen
    if (currentQuestion.image) {
      addImageMessage(currentQuestion.image, currentQuestion.bubbleColor);
    }
  }

  // State aktualisieren und speichern
  appState.currentId = currentQuestion.id;
  saveState(appState);

  optionsContainer.innerHTML = "";
  inputFieldWrapper.style.display = "none";

  // Wenn inputField vorhanden, zeige Input statt Buttons
  if (currentQuestion.inputField) {
    userInput.placeholder = currentQuestion.inputField.placeholder || "Deine Antwort...";
    userInput.value = "";
    userInput.disabled = false;
    submitInput.disabled = false;
    inputFieldWrapper.style.display = "flex";

    // Input-Submit Handler
    submitInput.onclick = () => handleInputSubmit(currentQuestion.inputField);
    userInput.onkeypress = (e) => {
      if (e.key === "Enter" && !isWaitingForResponse) {
        handleInputSubmit(currentQuestion.inputField);
      }
    };
  } else {
    // Normal Button-Optionen
    currentQuestion.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt.text;
      btn.disabled = isWaitingForResponse;
      btn.addEventListener("click", () => {
        if (!isWaitingForResponse) {
          handleAnswer(opt);
        }
      });
      optionsContainer.appendChild(btn);
    });
  }
  scrollToBottom();
}

function handleInputSubmit(inputFieldConfig) {
  // Spam-Protection: Wenn schon gewartet wird, ignorieren
  if (isWaitingForResponse) return;

  const userAnswer = userInput.value.trim();
  if (!userAnswer) return;

  isWaitingForResponse = true;

  // User-Antwort anzeigen
  addMessage(userAnswer, "to", { senderName: "Du", bubbleColor: "#4cb8b6" });

  // Disable input
  userInput.disabled = true;
  submitInput.disabled = true;

  setTimeout(() => {
    const isCorrect = userAnswer.toLowerCase() === inputFieldConfig.correctAnswer.toLowerCase();
    const response = isCorrect ? inputFieldConfig.correctResponse : inputFieldConfig.wrongResponse;
    const nextId = isCorrect ? inputFieldConfig.nextIdCorrect : inputFieldConfig.nextIdWrong;

    addMessage(response, "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });

    setTimeout(() => {
      isWaitingForResponse = false;

      if (nextId) {
        loadQuestion(nextId);
      } else {
        addMessage("Spiel beendet 🎉", "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });
        appState.currentId = null;
        saveState(appState);
      }
    }, 1500);
  }, 1000);
}

function handleAnswer(option) {
  // Spam-Protection: Wenn schon gewartet wird, ignorieren
  if (isWaitingForResponse) return;

  isWaitingForResponse = true;

  // User-Antwort (to).
  addMessage(option.text, "to", { senderName: option.sender, bubbleColor: option.bubbleColor });

  const willReply = option.response !== false;
  const initialDelay = willReply ? 1000 : 250;

  setTimeout(() => {
    if (willReply && typeof option.response === "string" && option.response.length > 0) {
      addMessage(option.response, "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });
    }

    const nextDelay = willReply ? 1500 : 200;

    if (option.correct) {
      if (option.nextId) {
        setTimeout(() => {
          isWaitingForResponse = false;
          loadQuestion(option.nextId);
        }, nextDelay);
      } else {
        setTimeout(() => {
          addMessage("Spiel beendet 🎉", "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });
          appState.currentId = null;
          saveState(appState);
          isWaitingForResponse = false;
        }, nextDelay);
      }
    } else {
      setTimeout(() => {
        isWaitingForResponse = false;
        loadQuestion(option.nextId);
      }, nextDelay);
    }
  }, initialDelay);
}

// Conversation laden
function startGame() {
  fetch("conversation.json")
    .then(res => res.json())
    .then(data => {
      conversation = data;
      // Lade alte Chat-Geschichte
      restoreChatHistory();
      // Wenn ein gespeicherter currentId vorhanden ist -> dort fortsetzen
      const startId = appState.currentId && Number.isInteger(appState.currentId) ? appState.currentId : 1;
      loadQuestion(startId);
    });
}

/* ------- PIN / Login-Overlay ------- */

const CORRECT_PIN = "3196";

const loginOverlay = document.getElementById("loginOverlay");
const pinDots = Array.from(document.querySelectorAll("#pinDots .dot"));
const loginMessage = document.getElementById("loginMessage");
const numpadButtons = document.querySelectorAll(".numpad button");
const lockTimeEl = document.getElementById("lockTime");

let enteredPin = "";

// Berlin-Uhrzeit (Europe/Berlin) anzeigen
function updateLockTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin"
  });
  lockTimeEl.textContent = formatter.format(now);
}
updateLockTime();
setInterval(updateLockTime, 10000); // alle 30 Sekunden aktualisieren [web:189][web:184]

function updateDots() {
  pinDots.forEach((dot, index) => {
    if (index < enteredPin.length) {
      dot.classList.add("filled");
    } else {
      dot.classList.remove("filled");
    }
  });
}

function resetPin() {
  enteredPin = "";
  updateDots();
  loginMessage.textContent = "";
  loginMessage.style.color = "#ffaaaa";
}

function handlePinSubmit() {
  if (enteredPin === CORRECT_PIN) {
    loginMessage.style.color = "#aaffaa";
    loginMessage.textContent = "Entsperrt";

    setTimeout(() => {
      loginOverlay.style.display = "none";
      // Header wieder anzeigen
      chatHeader.classList.remove("hidden");
      // unlocked speichern
      appState.unlocked = true;
      saveState(appState);
      startGame();
    }, 400);
  } else {
    loginMessage.style.color = "#ffaaaa";
    loginMessage.textContent = "Falscher Code";
    setTimeout(() => {
      resetPin();
    }, 500);
  }
}

// Header während Login verstecken, außer wenn schon unlocked
if (appState.unlocked) {
  chatHeader.classList.remove("hidden");
  loginOverlay.style.display = "none";
  startGame();
} else {
  chatHeader.classList.add("hidden");
}

numpadButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-key");
    const action = btn.getAttribute("data-action");

    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 100);

    if (key) {
      if (enteredPin.length < 4) {
        enteredPin += key;
        updateDots();
        if (enteredPin.length === 4) {
          setTimeout(handlePinSubmit, 200);
        }
      }
    } else if (action === "clear") {
      if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updateDots();
      }
    } else if (action === "reset") {
      resetPin();
    }
  });
});

// startGame() wird erst nach richtigem PIN aufgerufen
