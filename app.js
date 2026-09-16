// =====================================================
// ELEMENTOS DEL DOM
// =====================================================

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

const showAnswerButton =
  document.getElementById("showAnswerButton");


// =====================================================
// CONFIGURACIÓN DEL TEMPORIZADOR
// =====================================================

// Cambia este número para modificar el tiempo de respuesta.
const TIMER_SECONDS = 30;

let timerInterval = null;
let remainingTime = TIMER_SECONDS;

// Guarda la respuesta del problema que está actualmente abierto.
let currentAnswer = null;


// =====================================================
// DATOS DE LA RULETA
// =====================================================

// Los colores, categorías, problemas y respuestas
// vienen desde problems.js.
//
// IMPORTANTE:
// En index.html problems.js debe cargarse ANTES que app.js.

const TWO_PI = Math.PI * 2;
const segmentAngle = TWO_PI / sections.length;

let currentRotation = 0;
let spinning = false;


// =====================================================
// DIBUJAR RULETA
// =====================================================

function drawWheel() {
  const centerX = wheel.width / 2;
  const centerY = wheel.height / 2;

  const radius =
    wheel.width / 2 - 18;

  ctx.clearRect(
    0,
    0,
    wheel.width,
    wheel.height
  );

  sections.forEach((section, index) => {

    const startAngle =
      -Math.PI / 2 +
      index * segmentAngle;

    const endAngle =
      startAngle +
      segmentAngle;


    // -----------------------------
    // SEGMENTO
    // -----------------------------

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.arc(
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle
    );

    ctx.closePath();

    ctx.fillStyle =
      section.color;

    ctx.fill();


    // Separación blanca entre colores
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();


    // -----------------------------
    // TEXTO DEL COLOR
    // -----------------------------

    ctx.save();

    ctx.translate(
      centerX,
      centerY
    );

    ctx.rotate(
      startAngle +
      segmentAngle / 2
    );

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    ctx.font =
      "900 34px Inter, Arial, sans-serif";


    const outlineColor =
      section.textColor === "#ffffff"
        ? "#202235"
        : "#ffffff";


    // Borde del texto
    ctx.lineWidth = 8;
    ctx.strokeStyle = outlineColor;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    ctx.strokeText(
      section.name.toUpperCase(),
      radius - 42,
      0
    );


    // Relleno del texto
    ctx.fillStyle =
      section.textColor;

    ctx.fillText(
      section.name.toUpperCase(),
      radius - 42,
      0
    );

    ctx.restore();
  });


  // -----------------------------
  // ARO EXTERIOR
  // -----------------------------

  ctx.beginPath();

  ctx.arc(
    centerX,
    centerY,
    radius,
    0,
    TWO_PI
  );

  ctx.lineWidth = 14;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}


// =====================================================
// SELECCIONAR PROBLEMA AL AZAR
// =====================================================

function randomProblem(section) {

  if (
    !section ||
    !Array.isArray(section.problems) ||
    section.problems.length === 0
  ) {

    return {
      text:
        "Todavía no hay un problema asignado a este color.",

      answer: "—"
    };
  }


  const index =
    Math.floor(
      Math.random() *
      section.problems.length
    );


  return section.problems[index];
}


// =====================================================
// NORMALIZAR ROTACIÓN
// =====================================================

function normalizeDegrees(degrees) {
  return (
    (degrees % 360) + 360
  ) % 360;
}


// =====================================================
// SONIDOS
// Web Audio API
// =====================================================

let audioContext = null;


function getAudioContext() {

  if (!audioContext) {

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    audioContext =
      new AudioContextClass();
  }


  if (
    audioContext.state ===
    "suspended"
  ) {

    audioContext.resume();
  }


  return audioContext;
}


// =====================================================
// GENERADOR DE TONOS
// =====================================================

function playTone({
  frequency = 440,
  duration = 0.08,
  type = "sine",
  volume = 0.08,
  delay = 0
} = {}) {

  const audio =
    getAudioContext();

  const oscillator =
    audio.createOscillator();

  const gain =
    audio.createGain();


  const startTime =
    audio.currentTime +
    delay;

  const endTime =
    startTime +
    duration;


  oscillator.type =
    type;

  oscillator.frequency.setValueAtTime(
    frequency,
    startTime
  );


  gain.gain.setValueAtTime(
    0.0001,
    startTime
  );

  gain.gain.exponentialRampToValueAtTime(
    volume,
    startTime + 0.01
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    endTime
  );


  oscillator.connect(gain);

  gain.connect(
    audio.destination
  );


  oscillator.start(
    startTime
  );

  oscillator.stop(
    endTime + 0.02
  );
}


// =====================================================
// SONIDO AL PRESIONAR GIRAR
// =====================================================

function playButtonSound() {

  playTone({
    frequency: 240,
    duration: 0.07,
    type: "sine",
    volume: 0.06
  });
}


// =====================================================
// CLICK DE LA RULETA
// =====================================================

function playTickSound() {

  playTone({
    frequency: 900,
    duration: 0.025,
    type: "square",
    volume: 0.025
  });
}


// =====================================================
// SONIDO DEL TEMPORIZADOR
// =====================================================

function playTimerTick(secondsLeft) {

  const isUrgent =
    secondsLeft <= 5;


  playTone({
    frequency:
      isUrgent
        ? 880
        : 560,

    duration:
      isUrgent
        ? 0.07
        : 0.035,

    type: "sine",

    volume:
      isUrgent
        ? 0.055
        : 0.022
  });
}


// =====================================================
// SONIDO CUANDO SE ACABA EL TIEMPO
// =====================================================

function playTimeUpSound() {

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


// =====================================================
// SONIDO AL MOSTRAR RESPUESTA MANUALMENTE
// =====================================================

function playRevealSound() {

  playTone({
    frequency: 523.25,
    duration: 0.1,
    type: "sine",
    volume: 0.06,
    delay: 0
  });


  playTone({
    frequency: 659.25,
    duration: 0.16,
    type: "sine",
    volume: 0.07,
    delay: 0.1
  });
}


// =====================================================
// SONIDO AL TERMINAR LA RULETA
// =====================================================

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


// =====================================================
// SONIDO DE TICKS DURANTE EL GIRO
// =====================================================

function startTickSequence(
  duration = 4800
) {

  const start =
    performance.now();


  let timeoutId;


  function tick() {

    const elapsed =
      performance.now() -
      start;


    if (
      elapsed >= duration
    ) {

      clearTimeout(
        timeoutId
      );

      return;
    }


    playTickSound();


    const progress =
      elapsed /
      duration;


    // Empieza rápido
    // y termina lentamente.
    const nextDelay =
      55 +
      Math.pow(
        progress,
        2.2
      ) * 330;


    timeoutId =
      setTimeout(
        tick,
        nextDelay
      );
  }


  tick();
}


// =====================================================
// GIRAR RULETA
// =====================================================

function spinWheel() {

  if (spinning) {
    return;
  }


  // Detener temporizador anterior,
  // por si existiera.
  clearProblemTimer();


  playButtonSound();

  startTickSequence(
    4800
  );


  spinning = true;


  spinButton.disabled =
    true;

  spinButton.textContent =
    "…";


  statusText.textContent =
    "La ruleta está girando...";


  colorBadge.textContent =
    "Girando";

  colorBadge.style.background =
    "#202235";

  colorBadge.style.color =
    "#ffffff";


  // -----------------------------
  // ELEGIR GANADOR
  // -----------------------------

  const winnerIndex =
    Math.floor(
      Math.random() *
      sections.length
    );


  const segmentDegrees =
    360 /
    sections.length;


  const targetCenter =
    winnerIndex *
    segmentDegrees +
    segmentDegrees / 2;


  const currentNormalized =
    normalizeDegrees(
      currentRotation
    );


  const targetNormalized =
    normalizeDegrees(
      360 -
      targetCenter
    );


  let delta =
    targetNormalized -
    currentNormalized;


  if (delta < 0) {
    delta += 360;
  }


  // Entre 5 y 7 vueltas completas.
  const extraTurns =
    5 +
    Math.floor(
      Math.random() * 3
    );


  const totalRotation =
    currentRotation +
    extraTurns * 360 +
    delta;


  wheel.style.transition =
    "transform 4.8s cubic-bezier(0.12, 0.74, 0.15, 1)";


  wheel.style.transform =
    `rotate(${totalRotation}deg)`;


  currentRotation =
    totalRotation;


  // -----------------------------
  // CUANDO TERMINA EL GIRO
  // -----------------------------

  const handleEnd = () => {

    wheel.removeEventListener(
      "transitionend",
      handleEnd
    );


    const winner =
      sections[winnerIndex];


    spinning = false;


    spinButton.disabled =
      false;

    spinButton.textContent =
      "GIRAR";


    colorBadge.textContent =
      winner.name;


    colorBadge.style.background =
      winner.color;


    colorBadge.style.color =
      winner.textColor;


    statusText.textContent =
      `La ruleta cayó en ${winner.name}.`;


    playWinSound();


    openResult(
      winner
    );
  };


  wheel.addEventListener(
    "transitionend",
    handleEnd
  );
}


// =====================================================
// ABRIR PROBLEMA
// =====================================================

function openResult(section) {

  const selectedProblem =
    randomProblem(section);


  // Guardamos la respuesta actual.
  currentAnswer =
    selectedProblem.answer;


  modalColor.textContent =
    `${section.name} · ${section.category}`;


  modalColor.style.background =
    section.color;


  modalColor.style.color =
    section.textColor;


  problemText.textContent =
    selectedProblem.text;


  modal.classList.add(
    "open"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  startProblemTimer(
    selectedProblem.answer
  );
}


// =====================================================
// LIMPIAR TEMPORIZADOR
// =====================================================

function clearProblemTimer() {

  if (
    timerInterval !== null
  ) {

    clearInterval(
      timerInterval
    );


    timerInterval =
      null;
  }
}


// =====================================================
// INICIAR TEMPORIZADOR
// =====================================================

function startProblemTimer(answer) {

  clearProblemTimer();


  // Guardamos respuesta.
  currentAnswer =
    answer;


  // Reiniciamos tiempo.
  remainingTime =
    TIMER_SECONDS;


  timerValue.textContent =
    remainingTime;


  // Limpiar respuesta anterior.
  answerText.textContent =
    "";

  answerText.classList.remove(
    "show"
  );


  // Reiniciar estilos del timer.
  timerBox.classList.remove(
    "finished",
    "urgent"
  );


  const timerLabel =
    timerBox.querySelector(
      ".timer-label"
    );


  timerLabel.textContent =
    "Tiempo restante";


  // -----------------------------
  // REINICIAR BOTÓN
  // -----------------------------

  if (showAnswerButton) {

    showAnswerButton.disabled =
      false;

    showAnswerButton.textContent =
      "Mostrar respuesta";
  }


  // -----------------------------
  // CUENTA REGRESIVA
  // -----------------------------

  timerInterval =
    setInterval(() => {

      remainingTime -= 1;


      timerValue.textContent =
        remainingTime;


      // -----------------------------
      // TODAVÍA QUEDA TIEMPO
      // -----------------------------

      if (
        remainingTime > 0
      ) {

        playTimerTick(
          remainingTime
        );


        // Últimos 5 segundos.
        if (
          remainingTime <= 5
        ) {

          timerBox.classList.add(
            "urgent"
          );

        } else {

          timerBox.classList.remove(
            "urgent"
          );
        }


        return;
      }


      // -----------------------------
      // TIEMPO TERMINADO
      // -----------------------------

      revealAnswer(true);

    }, 1000);
}


// =====================================================
// MOSTRAR RESPUESTA
// =====================================================
//
// timeExpired = true
//     → terminó el temporizador.
//
// timeExpired = false
//     → profesora pulsó "Mostrar respuesta".
//

function revealAnswer(
  timeExpired = false
) {

  // Evita que siga contando.
  clearProblemTimer();


  timerBox.classList.remove(
    "urgent"
  );


  timerBox.classList.add(
    "finished"
  );


  const timerLabel =
    timerBox.querySelector(
      ".timer-label"
    );


  if (timeExpired) {

    timerValue.textContent =
      "0";

    timerLabel.textContent =
      "¡Tiempo!";


    playTimeUpSound();

  } else {

    timerLabel.textContent =
      "Respuesta";


    playRevealSound();
  }


  // -----------------------------
  // MOSTRAR RESPUESTA
  // -----------------------------

  answerText.textContent =
    `¡Bien! La respuesta es: ${currentAnswer}`;


  answerText.classList.add(
    "show"
  );


  // -----------------------------
  // DESACTIVAR BOTÓN
  // -----------------------------

  if (showAnswerButton) {

    showAnswerButton.disabled =
      true;


    showAnswerButton.textContent =
      "Respuesta mostrada";
  }
}


// =====================================================
// CERRAR MODAL
// =====================================================

function closeModal() {

  clearProblemTimer();


  currentAnswer =
    null;


  modal.classList.remove(
    "open"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


// =====================================================
// EVENTOS
// =====================================================

// GIRAR
spinButton.addEventListener(
  "click",
  spinWheel
);


// CERRAR MODAL
closeModalButton.addEventListener(
  "click",
  closeModal
);


// VOLVER A GIRAR
playAgainButton.addEventListener(
  "click",
  () => {

    closeModal();

    spinWheel();
  }
);


// MOSTRAR RESPUESTA INMEDIATAMENTE
if (showAnswerButton) {

  showAnswerButton.addEventListener(
    "click",
    () => {

      revealAnswer(
        false
      );
    }
  );
}


// CERRAR HACIENDO CLICK FUERA
modal.addEventListener(
  "click",
  (event) => {

    if (
      event.target.classList.contains(
        "modal-backdrop"
      )
    ) {

      closeModal();
    }
  }
);


// =====================================================
// TECLADO
// =====================================================

document.addEventListener(
  "keydown",
  (event) => {

    // ESC cierra el problema.
    if (
      event.key === "Escape"
    ) {

      closeModal();
    }


    // Barra espaciadora gira
    // solo cuando no hay modal abierto.
    if (
      event.code === "Space" &&
      !spinning &&
      !modal.classList.contains(
        "open"
      )
    ) {

      event.preventDefault();

      spinWheel();
    }
  }
);


// =====================================================
// INICIAR
// =====================================================

drawWheel();
