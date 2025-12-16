let conversation = [];
let currentQuestion = null;

const chat = document.getElementById('chat');
const optionsContainer = document.querySelector('.options');
const phone = document.getElementById('phone');
const startBtn = document.getElementById('startFullscreen');

// Hilfsfunktion: immer nach unten scrollen
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// Vollbild beim ersten Klick auf den Button
if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (phone.requestFullscreen) {
      phone.requestFullscreen();
    } else if (phone.webkitRequestFullscreen) {
      phone.webkitRequestFullscreen();
    } else if (phone.msRequestFullscreen) {
      phone.msRequestFullscreen();
    }
    startBtn.style.display = 'none';
  });
}

function addMessage(text, type = "from") {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.textContent = text;
  chat.appendChild(msg);
  scrollToBottom(); // immer automatisch nach unten
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

fetch("conversation.json")
  .then(res => res.json())
  .then(data => {
    conversation = data;
    loadQuestion(1);
  });
