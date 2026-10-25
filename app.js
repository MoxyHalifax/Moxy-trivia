// Keeps track of where the player is in the game
let gameQuestions = [];
let current = 0;
let score = 0;

// Grab the parts of the page we need to change
const screens = document.querySelectorAll(".screen");
const progressEl = document.getElementById("progress");
const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const nextBtn = document.getElementById("next-btn");

// --- Play limits ---
// We remember plays and wins on the guest's phone.
// Plays reset every RESET_HOURS. A win locks the game for STAY_DAYS,
// so it's one prize per stay even if the guest stays several nights.
const STORAGE_KEY = "halifax-trivia";
const HOUR = 3600000;

function loadStay() {
  let stay = null;
  try { stay = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
  const now = Date.now();
  if (!stay) stay = { playsStarted: now, plays: 0, wonAt: null, room: "" };

  // New day: give back the plays
  if (now - stay.playsStarted >= RESET_HOURS * HOUR) {
    stay.playsStarted = now;
    stay.plays = 0;
  }
  // New stay: clear the old win
  if (stay.wonAt && now - stay.wonAt >= STAY_DAYS * 24 * HOUR) {
    stay.wonAt = null;
  }
  stay.won = Boolean(stay.wonAt);
  return stay;
}

function saveStay(stay) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stay)); } catch (e) {}
}

// TESTING ONLY: opening the link with #reset at the end clears this phone's
// plays and prize. Remove this block before launch.
function checkTestReset() {
  if (location.hash !== "#reset") return false;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  history.replaceState(null, "", location.pathname + location.search);
  return true;
}
checkTestReset();
window.addEventListener("hashchange", () => {
  if (checkTestReset()) {
    stay = loadStay();
    showWelcome();
  }
});

let stay = loadStay();

function playsLeft() {
  return Math.max(0, MAX_PLAYS - stay.plays);
}

// --- Helpers ---
// Mix up a list into a random order
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Pick this game's questions and shuffle each one's choices
function buildGame() {
  return shuffle(QUESTIONS).slice(0, QUESTIONS_PER_GAME).map(q => {
    const right = q.choices[q.answer];
    const choices = shuffle(q.choices);
    return { question: q.question, choices, answer: choices.indexOf(right) };
  });
}

// Show one screen and hide the others
function showScreen(id) {
  screens.forEach(s => s.classList.toggle("active", s.id === id));
}

function showWelcome() {
  if (stay.won || playsLeft() === 0) return showLocked();
  document.getElementById("room").value = stay.room;
  document.getElementById("plays-left").textContent =
    `You have ${playsLeft()} of ${MAX_PLAYS} plays left today.`;
  showScreen("welcome");
}

function showLocked() {
  document.getElementById("locked-title").textContent =
    stay.won ? "You already won!" : "That's a wrap for today";
  document.getElementById("locked-text").textContent = stay.won
    ? "One prize per stay, champ. Now go enjoy Halifax!"
    : `You've used all ${MAX_PLAYS} plays. Come back tomorrow for another shot!`;
  showScreen("locked");
}

function startGame() {
  if (stay.won || playsLeft() === 0) return showLocked();

  // A room number is needed so the front desk can track prizes by room
  const roomInput = document.getElementById("room");
  const room = roomInput.value.trim() || stay.room;
  if (!room) {
    document.getElementById("room-error").classList.remove("hidden");
    showScreen("welcome");
    roomInput.focus();
    return;
  }
  document.getElementById("room-error").classList.add("hidden");

  stay.room = room;
  stay.plays++;
  saveStay(stay);

  gameQuestions = buildGame();
  current = 0;
  score = 0;
  showScreen("quiz");
  showQuestion();
}

function showQuestion() {
  const q = gameQuestions[current];
  progressEl.textContent = `QUESTION ${current + 1} OF ${gameQuestions.length}`;
  questionEl.textContent = q.question;
  feedbackEl.textContent = "";
  nextBtn.classList.add("hidden");
  choicesEl.innerHTML = "";

  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.textContent = choice;
    btn.addEventListener("click", () => checkAnswer(i));
    choicesEl.appendChild(btn);
  });
}

function checkAnswer(picked) {
  const q = gameQuestions[current];
  const buttons = choicesEl.querySelectorAll("button");

  // If they get it wrong, we don't reveal the right answer
  buttons.forEach(b => (b.disabled = true));

  if (picked === q.answer) {
    score++;
    buttons[picked].classList.add("correct");
    feedbackEl.textContent = pickOne(RIGHT_LINES);
  } else {
    buttons[picked].classList.add("wrong");
    feedbackEl.textContent = pickOne(WRONG_LINES);
  }

  nextBtn.textContent = current === gameQuestions.length - 1 ? "See my score" : "Next question";
  nextBtn.classList.remove("hidden");
}

function nextQuestion() {
  current++;
  if (current < gameQuestions.length) {
    showQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  const won = score >= WIN_SCORE;
  if (won) {
    stay.won = true;
    stay.wonAt = Date.now();
    saveStay(stay);
  }

  const left = playsLeft();
  document.getElementById("score").textContent = `${score} / ${gameQuestions.length}`;
  document.getElementById("result-title").textContent = won ? "You've got Moxy!" : "So close!";
  document.getElementById("result-text").textContent = won
    ? "Halifax trivia royalty. Your prize is waiting."
    : left > 0
      ? `You need ${WIN_SCORE} to win. You've got ${left} more ${left === 1 ? "shot" : "shots"} today.`
      : `You need ${WIN_SCORE} to win. That's all your plays for today. Come back tomorrow for another shot!`;
  document.getElementById("prize-code").textContent = PRIZE_CODE;
  document.getElementById("prize-room").textContent = `Room ${stay.room}`;
  document.getElementById("prize").classList.toggle("hidden", !won);

  // Only offer another game if they haven't won and still have plays left
  const againBtn = document.getElementById("again-btn");
  againBtn.classList.toggle("hidden", won || left === 0);
  againBtn.textContent = `Run it back (${left} left)`;

  showScreen("result");
  if (won) launchConfetti();
}

// --- Confetti ---
// A short burst of falling paper when a guest wins.
// Skipped for guests who've asked their phone to reduce motion.
function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#e6007e", "#ffffff", "#ffd400", "#1db954"];
  const pieces = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: 6 + Math.random() * 6,
    speed: 2 + Math.random() * 4,
    drift: Math.random() * 2 - 1,
    spin: Math.random() * Math.PI,
    color: pickOne(colors)
  }));

  const endAt = Date.now() + 4000;
  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.speed;
      p.x += p.drift;
      p.spin += 0.1;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size * Math.abs(Math.sin(p.spin)) + 2);
    });
    if (Date.now() < endAt) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  frame();
}

document.getElementById("start-btn").addEventListener("click", startGame);
nextBtn.addEventListener("click", nextQuestion);
document.getElementById("again-btn").addEventListener("click", startGame);

showWelcome();
