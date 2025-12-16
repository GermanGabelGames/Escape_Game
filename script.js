let conversation = [];
let currentQuestion = null;

const chat = document.getElementById('chat');
const optionsContainer = document.querySelector('.options');
const chatHeader = document.getElementById('chatHeader');

// Auto-Scroll im Chat
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// Chat-Funktionen
function addMessage(text, type = "from") {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.textContent = text;
  chat.appendChild(msg);
  scrollToBottom();
}

function loadQuestion(id) {
  currentQuestion = conversation.find(q => q.id === id);
  addMessage(currentQuestion.question, "from");

  optionsContainer.innerHTML = "";
  currentQuestion.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt.text;
    btn.addEventListener("click", () => handleAnswer(opt));
    optionsContainer.appendChild(btn);
  });
  scrollToBottom();
}

function handleAnswer(option) {
  addMessage(option.text, "to");
  setTimeout(() => {
    addMessage(option.response, "from");
    if (option.correct) {
      if (option.nextId) {
        setTimeout(() => loadQuestion(option.nextId), 1500);
      } else {
        addMessage("Spiel beendet 🎉", "from");
      }
    } else {
      setTimeout(() => loadQuestion(option.nextId), 1500);
    }
  }, 1000);
}

// Conversation laden (startet erst nach Login)
function startGame() {
  fetch("conversation.json")
    .then(res => res.json())
    .then(data => {
      conversation = data;
      loadQuestion(1);
    });
}

/* ------- PIN / Login-Overlay ------- */

const CORRECT_PIN = "1111";

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
setInterval(updateLockTime, 30000); // alle 30 Sekunden aktualisieren [web:189][web:184]

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

// Header während Login verstecken
chatHeader.classList.add("hidden");

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
