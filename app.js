const wheel = document.getElementById("wheel");
const ctx = wheel.getContext("2d");

const spinButton = document.getElementById("spinButton");
const statusText = document.getElementById("statusText");
const colorBadge = document.getElementById("colorBadge");

const modal = document.getElementById("modal");
const modalColor = document.getElementById("modalColor");
const problemText = document.getElementById("problemText");
const closeModalButton = document.getElementById("closeModal");
const playAgainButton = document.getElementById("playAgainButton");
const timerBox = document.getElementById("timerBox");
const timerValue = document.getElementById("timerValue");
const answerText = document.getElementById("answerText");

const TIMER_SECONDS = 30;

let timerInterval = null;
let remainingTime = TIMER_SECONDS;

// Los colores, categorías, problemas y respuestas se cargan desde problems.js.

const TWO_PI = Math.PI * 2;
const segmentAngle = TWO_PI / sections.length;

let currentRotation = 0;
let spinning = false;

function drawWheel() {
  const centerX = wheel.width / 2;
  const centerY = wheel.height / 2;
  const radius = wheel.width / 2 - 18;

  ctx.clearRect(0, 0, wheel.width, wheel.height);

  sections.forEach((section, index) => {
    // El primer segmento comienza arriba.
    const startAngle = -Math.PI / 2 + index * segmentAngle;
    const endAngle = startAngle + segmentAngle;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = section.color;
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Texto del segmento
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + segmentAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "900 34px Inter, Arial, sans-serif";

    const outlineColor =
      section.textColor === "#ffffff" ? "#202235" : "#ffffff";

    ctx.lineWidth = 8;
    ctx.strokeStyle = outlineColor;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(section.name.toUpperCase(), radius - 42, 0);

    ctx.fillStyle = section.textColor;
    ctx.fillText(section.name.toUpperCase(), radius - 42, 0);
    ctx.restore();
  });

  // Aro exterior
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TWO_PI);
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function randomProblem(section) {
  if (!section || !Array.isArray(section.problems) || !section.problems.length) {
    return {
      text: "Todavía no hay un problema asignado a este color.",
      answer: "—"
    };
  }

  const index = Math.floor(Math.random() * section.problems.length);
  return section.problems[index];
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}


// -----------------------------
// SONIDOS (Web Audio API)
// -----------------------------
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone({
  frequency = 440,
  duration = 0.08,
  type = "sine",
  volume = 0.08,
  delay = 0
} = {}) {
  const audio = getAudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  const startTime = audio.currentTime + delay;
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

function playButtonSound() {
  playTone({
    frequency: 240,
    duration: 0.07,
    type: "sine",
    volume: 0.06
  });
}

function playTickSound() {
  playTone({
    frequency: 900,
    duration: 0.025,
    type: "square",
    volume: 0.025
  });
}

function playTimerTick(secondsLeft) {
  // Tick suave durante la cuenta.
  // En los últimos 5 segundos se vuelve un poco más agudo y notorio.
  const isUrgent = secondsLeft <= 5;

  playTone({
    frequency: isUrgent ? 880 : 560,
    duration: isUrgent ? 0.07 : 0.035,
    type: "sine",
    volume: isUrgent ? 0.055 : 0.022
  });
}

function playTimeUpSound() {
  // Aviso corto al llegar a cero y revelar la respuesta.
  playTone({
    frequency: 660,
    duration: 0.12,
    type: "sine",
    volume: 0.075,
    delay: 0
  });

  playTone({
    frequency: 880,
    duration: 0.2,
    type: "sine",
    volume: 0.08,
    delay: 0.13
  });
}

function playWinSound() {
  playTone({
    frequency: 523.25,
    duration: 0.12,
    type: "sine",
    volume: 0.07,
    delay: 0
  });

  playTone({
    frequency: 659.25,
    duration: 0.12,
    type: "sine",
    volume: 0.07,
    delay: 0.12
  });

  playTone({
    frequency: 783.99,
    duration: 0.22,
    type: "sine",
    volume: 0.08,
    delay: 0.24
  });
}

function startTickSequence(duration = 4800) {
  const start = performance.now();
  let timeoutId;

  function tick() {
    const elapsed = performance.now() - start;

    if (elapsed >= duration) {
      clearTimeout(timeoutId);
      return;
    }

    playTickSound();

    const progress = elapsed / duration;

    // Comienza rápido y se va frenando junto con la ruleta.
    const nextDelay = 55 + Math.pow(progress, 2.2) * 330;

    timeoutId = setTimeout(tick, nextDelay);
  }

  tick();
}

function spinWheel() {
  if (spinning) return;

  clearProblemTimer();
  playButtonSound();
  startTickSequence(4800);

  spinning = true;
  spinButton.disabled = true;
  spinButton.textContent = "…";
  statusText.textContent = "La ruleta está girando...";
  colorBadge.textContent = "Girando";
  colorBadge.style.background = "#202235";
  colorBadge.style.color = "#ffffff";

  const winnerIndex = Math.floor(Math.random() * sections.length);

  const segmentDegrees = 360 / sections.length;

  // Queremos que el centro del segmento ganador termine justo debajo
  // del puntero ubicado en la parte superior.
  const targetCenter =
    winnerIndex * segmentDegrees + segmentDegrees / 2;

  const currentNormalized = normalizeDegrees(currentRotation);

  const targetNormalized = normalizeDegrees(360 - targetCenter);

  let delta = targetNormalized - currentNormalized;

  if (delta < 0) {
    delta += 360;
  }

  const extraTurns = 5 + Math.floor(Math.random() * 3);
  const totalRotation = currentRotation + extraTurns * 360 + delta;

  wheel.style.transition =
    "transform 4.8s cubic-bezier(0.12, 0.74, 0.15, 1)";
  wheel.style.transform = `rotate(${totalRotation}deg)`;

  currentRotation = totalRotation;

  const handleEnd = () => {
    wheel.removeEventListener("transitionend", handleEnd);

    const winner = sections[winnerIndex];

    spinning = false;
    spinButton.disabled = false;
    spinButton.textContent = "GIRAR";

    colorBadge.textContent = winner.name;
    colorBadge.style.background = winner.color;
    colorBadge.style.color = winner.textColor;

    statusText.textContent =
      `La ruleta cayó en ${winner.name}.`;

    playWinSound();
    openResult(winner);
  };

  wheel.addEventListener("transitionend", handleEnd);
}

function openResult(section) {

  const selectedProblem =
    randomProblem(section);

  modalColor.textContent =
    `${section.name} · ${section.category}`;

  modalColor.style.background =
    section.color;

  modalColor.style.color =
    section.textColor;

  problemText.textContent =
    selectedProblem.text;

  modal.classList.add("open");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  startProblemTimer(
    selectedProblem.answer
  );
}

function clearProblemTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startProblemTimer(answer) {
  clearProblemTimer();

  remainingTime = TIMER_SECONDS;
  timerValue.textContent = remainingTime;

  answerText.textContent = "";
  answerText.classList.remove("show");

  timerBox.classList.remove("finished", "urgent");

  const timerLabel = timerBox.querySelector(".timer-label");
  timerLabel.textContent = "Tiempo restante";

  timerInterval = setInterval(() => {
    remainingTime -= 1;
    timerValue.textContent = remainingTime;

    if (remainingTime > 0) {
      playTimerTick(remainingTime);

      if (remainingTime <= 5) {
        timerBox.classList.add("urgent");
      }

      return;
    }

    clearProblemTimer();

    timerBox.classList.remove("urgent");
    timerBox.classList.add("finished");
    timerLabel.textContent = "¡Tiempo!";

    playTimeUpSound();

    answerText.textContent =
      `¡Bien! La respuesta es: ${answer}`;

    answerText.classList.add("show");
  }, 1000);
}

function closeModal() {

  clearProblemTimer();

  modal.classList.remove("open");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}

spinButton.addEventListener("click", spinWheel);
closeModalButton.addEventListener("click", closeModal);
playAgainButton.addEventListener("click", () => {
  closeModal();
  spinWheel();
});

modal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }

  if (
    event.code === "Space" &&
    !spinning &&
    !modal.classList.contains("open")
  ) {
    event.preventDefault();
    spinWheel();
  }
});

drawWheel();
