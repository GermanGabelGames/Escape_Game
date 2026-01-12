let conversation = [];
let currentQuestion = null;

const chat = document.getElementById('chat');
const optionsContainer = document.querySelector('.options');
const inputFieldWrapper = document.getElementById('inputFieldWrapper');
const userInput = document.getElementById('userInput');
const submitInput = document.getElementById('submitInput');
const chatHeader = document.getElementById('chatHeader');

// --- Persistenz-Helpers ---
const STORAGE_KEY = 'escapeGame.state';

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

function clearStateAndReload() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  location.reload();
}

// Expose "reset" in console: wenn du in der DevTools-Konsole "reset" eingibst, wird gelöscht + neu geladen
Object.defineProperty(window, 'reset', {
  get() {
    clearStateAndReload();
    return 'Escape Game: reset triggered';
  }
});

// --- initial state ---
let appState = loadState();

// Auto-Scroll im Chat
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// Chat-Funktionen
// jetzt mit optionalen Optionen: senderName, bubbleColor
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
  content.textContent = text;
  msgWrap.appendChild(content);

  // Bubble-Farbe setzen, falls angegeben
  if (opts.bubbleColor) {
    msgWrap.style.background = opts.bubbleColor;
    // bei sehr hellen Farben schwarzen Text bevorzugen (einfacher Kontrast-Check)
    try {
      const c = opts.bubbleColor.replace('#','');
      if (c.length === 6) {
        const r = parseInt(c.substr(0,2),16);
        const g = parseInt(c.substr(2,2),16);
        const b = parseInt(c.substr(4,2),16);
        const luminance = (0.299*r + 0.587*g + 0.114*b);
        msgWrap.style.color = luminance > 200 ? '#000' : '#000';
      }
    } catch(e) {}
  }

  chat.appendChild(msgWrap);
  scrollToBottom();
}

function loadQuestion(id) {
  currentQuestion = conversation.find(q => q.id === id);
  if (!currentQuestion) return;

  // Frage mit senderName und bubbleColor anzeigen
  addMessage(currentQuestion.question, "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });

  // Wenn Bild vorhanden, anzeigen
  if (currentQuestion.image) {
    const imgWrap = document.createElement("div");
    imgWrap.className = "message from";
    imgWrap.style.background = currentQuestion.bubbleColor;
    imgWrap.style.maxWidth = "100%";
    imgWrap.style.padding = "8px";
    
    const img = document.createElement("img");
    img.src = currentQuestion.image;
    img.style.width = "100%";
    img.style.borderRadius = "12px";
    img.style.maxHeight = "250px";
    img.style.objectFit = "contain";
    
    imgWrap.appendChild(img);
    chat.appendChild(imgWrap);
    scrollToBottom();
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
    inputFieldWrapper.style.display = "flex";

    // Input-Submit Handler
    submitInput.onclick = () => handleInputSubmit(currentQuestion.inputField);
    userInput.onkeypress = (e) => {
      if (e.key === "Enter") {
        handleInputSubmit(currentQuestion.inputField);
      }
    };
  } else {
    // Normal Button-Optionen
    currentQuestion.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt.text;
      btn.addEventListener("click", () => handleAnswer(opt));
      optionsContainer.appendChild(btn);
    });
  }
  scrollToBottom();
}

function handleInputSubmit(inputFieldConfig) {
  const userAnswer = userInput.value.trim();

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
  // User-Antwort (to).
  addMessage(option.text, "to", { senderName: option.sender, bubbleColor: option.bubbleColor });

  // Wenn option.response === false --> keine Host-Antwort anzeigen, sonst wie bisher.
  const willReply = option.response !== false;

  // Kurzer Delay bis zur nächsten Aktion (kürzer, wenn keine Antwort ausgegeben wird)
  const initialDelay = willReply ? 1000 : 250;
  setTimeout(() => {
    // Falls eine Antwort als String vorhanden ist, anzeigen
    if (willReply && typeof option.response === "string" && option.response.length > 0) {
      addMessage(option.response, "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });
    }

    // Nächste Aktion verzögern, damit die Nachricht sichtbar bleibt (oder sofort weiter wenn keine Antwort)
    const nextDelay = willReply ? 1500 : 200;

    if (option.correct) {
      if (option.nextId) {
        setTimeout(() => loadQuestion(option.nextId), nextDelay);
      } else {
        setTimeout(() => {
          addMessage("Spiel beendet 🎉", "from", { senderName: currentQuestion.sender, bubbleColor: currentQuestion.bubbleColor });
          // Spiel beendet -> optional State zurücksetzen oder auf null setzen
          appState.currentId = null;
          saveState(appState);
        }, nextDelay);
      }
    } else {
      // Bei falscher Antwort: zur angegebenen nextId (ggf. gleiche Frage)
      setTimeout(() => loadQuestion(option.nextId), nextDelay);
    }
  }, initialDelay);
}

// Conversation laden (startet erst nach Login)
function startGame() {
  fetch("conversation.json")
    .then(res => res.json())
    .then(data => {
      conversation = data;
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
  // Spiel direkt starten, wenn unlocked
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
