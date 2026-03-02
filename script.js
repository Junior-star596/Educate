/* =====================================================
   EDUCATE – script.js
   ===================================================== */

// ============================================================
// ESTADO GLOBAL
// ============================================================
const state = {
  playerName: '',
  totalStars: 0,
};

// ============================================================
// PANTALLA DE BIENVENIDA
// ============================================================

/** El niño escribe su nombre y pasa al selector de actividades */
function submitName() {
  const input = document.getElementById('name-input');
  const name = input.value.trim();
  if (!name) {
    input.style.borderColor = '#FF6B6B';
    input.placeholder = '¡Escribe tu nombre!';
    input.focus();
    return;
  }
  state.playerName = name;
  document.getElementById('user-name-display').textContent = name;

  // Animación de salida de bienvenida y aparición del selector
  const ws = document.getElementById('welcome-screen');
  ws.style.transition = 'opacity 0.4s';
  ws.style.opacity = '0';
  setTimeout(() => {
    ws.classList.add('hidden');
    document.getElementById('activity-selector').classList.remove('hidden');
    // Guarda el nombre en la sesión para persistencia básica
    try { sessionStorage.setItem('educate_name', name); } catch(e){}
  }, 400);
}

/** Enter en el campo de nombre también envía */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitName();
  });

  // Recupera nombre de sesión si ya existe (recarga de página)
  try {
    const saved = sessionStorage.getItem('educate_name');
    if (saved) {
      document.getElementById('name-input').value = saved;
    }
  } catch(e){}

  // Inicializa todas las actividades
  initCompleta();
  initOracion();
  initOrdenar();
  initVoz();
  initAbc();
});

// ============================================================
// NAVEGACIÓN: SELECTOR ↔ ACTIVIDAD
// ============================================================

/** Lanza una actividad desde el selector */
function launchActivity(actId) {
  document.getElementById('activity-selector').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  // Oculta todas las secciones y muestra la correcta
  document.querySelectorAll('.activity-section').forEach(s => s.classList.remove('active'));
  document.getElementById(actId).classList.add('active');

  // Sincroniza estrellas
  syncStars();
}

/** Vuelve al selector de actividades */
function goToSelector() {
  stopListening(); // Por si el micrófono estaba activo
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('activity-selector').classList.remove('hidden');
  syncStars();
}

/** Sincroniza el conteo de estrellas en ambos headers */
function syncStars() {
  document.getElementById('total-stars').textContent = state.totalStars;
  document.getElementById('total-stars-app').textContent = state.totalStars;
}

// ============================================================
// UTILIDADES
// ============================================================

function updateStars(count = 1) {
  state.totalStars += count;
  syncStars();
}

function showCelebration(emoji = '🌟', title = '¡Excelente!', msg = '') {
  document.getElementById('celebration-emoji').textContent = emoji;
  document.getElementById('celebration-title').textContent = title;
  document.getElementById('celebration-msg').textContent = msg || `¡Muy bien, ${state.playerName}!`;
  document.getElementById('celebration-modal').classList.add('show');
}

function closeCelebration() {
  document.getElementById('celebration-modal').classList.remove('show');
}

function playSoundCorrect() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch(e) {}
}

function playSoundWrong() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 200; osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

function speak(text, lang = 'es-ES') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang; utt.rate = 0.85; utt.pitch = 1.2;
  window.speechSynthesis.speak(utt);
}

// ============================================================
// ACTIVIDAD 1: COMPLETA LA PALABRA
//
// Cada pregunta tiene:
//   - `before`: texto antes del hueco (puede ser vacío → posición inicial)
//   - `blank`:  la sílaba correcta que falta
//   - `after`:  texto después del hueco (puede ser vacío → posición final)
//   - `options`: las 3 opciones que se muestran
//   - `hint`:   instrucción específica para el niño
//
// Se usan sílabas variadas (ma/mi/me/mo/mu, pa/pi/pe, ba/bi,
// ca/co/cu, la/li/lo, to/ta, etc.) y la sílaba vacía puede
// estar al inicio, en medio o al final de la palabra.
// ============================================================
const completaData = [
  // ── Posición INICIAL ──
  { before: '',    blank: 'ma',  after: 'no',   options: ['ma','pa','ba'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'pa',  after: 'to',   options: ['ma','pa','ca'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'ba',  after: 'lon',  options: ['ma','ba','la'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'ca',  after: 'sa',   options: ['ca','pa','mi'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'la',  after: 'ta',   options: ['la','ma','bi'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'pi',  after: 'no',   options: ['pi','ti','mi'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'so',  after: 'fa',   options: ['so','bo','to'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'me',  after: 'sa',   options: ['me','le','se'], hint: '¿Con qué sílaba empieza?' },
  { before: '',    blank: 'mu',  after: 'la',   options: ['mu','tu','su'], hint: '¿Con qué sílaba empieza?' },
  // ── Posición MEDIA ──
  { before: 'ca',  blank: 'ba',  after: 'llo',  options: ['ba','ma','la'], hint: '¿Qué sílaba va en el medio?' },
  { before: 'ma',  blank: 'ri',  after: 'sa',   options: ['ri','li','ni'], hint: '¿Qué sílaba va en el medio?' },
  { before: 'pa',  blank: 'lo',  after: 'ma',   options: ['lo','co','mo'], hint: '¿Qué sílaba va en el medio?' },
  { before: 'bo',  blank: 'ni',  after: 'to',   options: ['ni','mi','si'], hint: '¿Qué sílaba va en el medio?' },
  { before: 'co',  blank: 'ne',  after: 'jo',   options: ['ne','me','se'], hint: '¿Qué sílaba va en el medio?' },
  { before: 'to',  blank: 'ma',  after: 'te',   options: ['ma','pa','ca'], hint: '¿Qué sílaba va en el medio?' },
  { before: 'nu',  blank: 'be',  after: '',     options: ['be','pe','me'], hint: '¿Qué sílaba va al final?' },
  // ── Posición FINAL ──
  { before: 'pa',  blank: 'pa',  after: '',     options: ['pa','ma','ba'], hint: '¿Con qué sílaba termina?' },
  { before: 'ca',  blank: 'ma',  after: '',     options: ['ma','la','ra'], hint: '¿Con qué sílaba termina?' },
  { before: 'me',  blank: 'sa',  after: '',     options: ['sa','la','ta'], hint: '¿Con qué sílaba termina?' },
  { before: 'lo',  blank: 'bo',  after: '',     options: ['bo','to','co'], hint: '¿Con qué sílaba termina?' },
];

let completaIndex = 0;
let completaScore = 0;

function initCompleta() {
  completaIndex = 0;
  completaScore = 0;
  renderCompleta();
}

/** Construye visualmente la palabra con el hueco en su posición correcta */
function renderCompleta() {
  const q = completaData[completaIndex];

  // Barra de progreso
  document.getElementById('completa-progress').style.width =
    (completaIndex / completaData.length * 100) + '%';

  // Construye el puzzle: parte-antes + hueco + parte-después
  const puzzle = document.getElementById('word-puzzle');
  puzzle.innerHTML = '';

  if (q.before) {
    const b = document.createElement('span');
    b.className = 'puzzle-part';
    b.textContent = q.before;
    puzzle.appendChild(b);
  }

  const blankEl = document.createElement('span');
  blankEl.className = 'puzzle-blank';
  blankEl.id = 'puzzle-blank';
  blankEl.textContent = '___';
  puzzle.appendChild(blankEl);

  if (q.after) {
    const a = document.createElement('span');
    a.className = 'puzzle-part';
    a.textContent = q.after;
    puzzle.appendChild(a);
  }

  // Instrucción
  document.getElementById('completa-instruction').textContent = q.hint;

  // Opciones
  const container = document.getElementById('completa-options');
  container.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => checkCompleta(btn, opt, q.blank);
    container.appendChild(btn);
  });

  document.getElementById('completa-feedback').textContent = '';
  document.getElementById('completa-feedback').className = 'feedback';
}

function checkCompleta(btn, selected, correct) {
  const allBtns = document.querySelectorAll('#completa-options .option-btn');
  allBtns.forEach(b => b.disabled = true);

  const feedback = document.getElementById('completa-feedback');

  if (selected === correct) {
    btn.classList.add('correct');
    document.getElementById('puzzle-blank').textContent = correct;
    document.getElementById('puzzle-blank').style.color = '#6BCB77';
    document.getElementById('puzzle-blank').style.borderColor = '#6BCB77';
    feedback.textContent = '🎉 ¡Correcto!';
    feedback.className = 'feedback correct-msg';
    playSoundCorrect();
    completaScore += 10;
    document.getElementById('completa-score').textContent = completaScore;

    setTimeout(() => {
      completaIndex++;
      if (completaIndex < completaData.length) {
        renderCompleta();
      } else {
        completaIndex = 0;
        updateStars(3);
        showCelebration('🌟', '¡Actividad completada!', `¡${state.playerName} obtuvo ${completaScore} puntos! +3 ⭐`);
        completaScore = 0;
        document.getElementById('completa-score').textContent = 0;
        setTimeout(renderCompleta, 500);
      }
    }, 1200);
  } else {
    btn.classList.add('wrong');
    feedback.textContent = '😅 ¡Inténtalo otra vez!';
    feedback.className = 'feedback wrong-msg';
    playSoundWrong();
    setTimeout(() => {
      btn.classList.remove('wrong');
      allBtns.forEach(b => b.disabled = false);
      feedback.textContent = '';
      feedback.className = 'feedback';
    }, 1000);
  }
}

// ============================================================
// ACTIVIDAD 2: COMPLETAR ORACIÓN
// ============================================================
const oracionData = [
  { sentence: 'El perro come ______.', correct: 'comida',  options: ['casa', 'comida', 'azul'] },
  { sentence: 'La luna brilla de ______.', correct: 'noche',   options: ['día', 'noche', 'mar'] },
  { sentence: 'El niño juega en el ______.', correct: 'parque',  options: ['parque', 'libro', 'alto'] },
  { sentence: 'Mamá cocina rica ______.', correct: 'sopa',    options: ['sopa', 'pelota', 'verde'] },
  { sentence: 'El pájaro canta una ______.', correct: 'canción', options: ['canción', 'mesa', 'rojo'] },
  { sentence: 'El bebé duerme en su ______.', correct: 'cama',    options: ['cama', 'árbol', 'correr'] },
  { sentence: 'Papá lee un ______.', correct: 'libro',   options: ['libro', 'agua', 'feliz'] },
];

let oracionIndex = 0;
let oracionScore  = 0;

function initOracion() {
  oracionIndex = 0;
  oracionScore = 0;
  renderOracion();
}

function renderOracion() {
  const q = oracionData[oracionIndex];
  document.getElementById('sentence-text').textContent = q.sentence;
  document.getElementById('oracion-progress').style.width =
    (oracionIndex / oracionData.length * 100) + '%';

  const container = document.getElementById('oracion-options');
  container.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => checkOracion(btn, opt, q.correct, q.sentence);
    container.appendChild(btn);
  });

  document.getElementById('oracion-feedback').textContent = '';
  document.getElementById('oracion-feedback').className = 'feedback';
}

function checkOracion(btn, selected, correct, sentence) {
  const allBtns = document.querySelectorAll('#oracion-options .option-btn');
  allBtns.forEach(b => b.disabled = true);
  const feedback = document.getElementById('oracion-feedback');

  if (selected === correct) {
    btn.classList.add('correct');
    document.getElementById('sentence-text').textContent =
      sentence.replace('______', correct.toUpperCase());
    feedback.textContent = '✅ ¡Correcto! ¡Brillante!';
    feedback.className = 'feedback correct-msg';
    playSoundCorrect();
    oracionScore += 10;
    document.getElementById('oracion-score').textContent = oracionScore;

    setTimeout(() => {
      oracionIndex++;
      if (oracionIndex < oracionData.length) {
        renderOracion();
      } else {
        oracionIndex = 0;
        updateStars(3);
        showCelebration('🏆', '¡Todas correctas!', `¡Increíble, ${state.playerName}! ${oracionScore} puntos +3 ⭐`);
        oracionScore = 0;
        document.getElementById('oracion-score').textContent = 0;
        setTimeout(renderOracion, 500);
      }
    }, 1400);
  } else {
    btn.classList.add('wrong');
    feedback.textContent = '❌ ¡Eso no es! Intenta otra opción.';
    feedback.className = 'feedback wrong-msg';
    playSoundWrong();
    setTimeout(() => {
      btn.classList.remove('wrong');
      allBtns.forEach(b => b.disabled = false);
      feedback.textContent = '';
      feedback.className = 'feedback';
    }, 1000);
  }
}

// ============================================================
// ACTIVIDAD 3: ORDENAR LA ORACIÓN (Drag & Drop)
// ============================================================
const ordenarData = [
  { words: ['El', 'niño', 'juega', 'pelota'],  correct: 'El niño juega pelota' },
  { words: ['La', 'gata', 'toma', 'leche'],    correct: 'La gata toma leche' },
  { words: ['Papá', 'maneja', 'el', 'carro'],  correct: 'Papá maneja el carro' },
  { words: ['Mi', 'mamá', 'canta', 'bonito'],  correct: 'Mi mamá canta bonito' },
  { words: ['El', 'sol', 'brilla', 'hoy'],     correct: 'El sol brilla hoy' },
];

let ordenarIndex = 0;
let ordenarScore  = 0;
let currentOrdenar = null;
let draggedEl = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initOrdenar() { renderOrdenar(); }

function renderOrdenar() {
  currentOrdenar = ordenarData[ordenarIndex];
  const shuffled = shuffle(currentOrdenar.words);
  const bank = document.getElementById('word-bank');
  const zone = document.getElementById('drop-zone');
  bank.innerHTML = ''; zone.innerHTML = '';
  shuffled.forEach(word => bank.appendChild(createDragWord(word)));
  document.getElementById('ordenar-feedback').textContent = '';
  document.getElementById('ordenar-feedback').className = 'feedback';
}

function createDragWord(word) {
  const el = document.createElement('div');
  el.className = 'drag-word';
  el.textContent = word;
  el.draggable = true;
  el.dataset.word = word;
  el.addEventListener('dragstart', e => {
    draggedEl = el;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    draggedEl = null;
  });
  el.addEventListener('touchstart', touchStart, { passive: true });
  el.addEventListener('touchend', touchEnd);
  return el;
}

let touchOffsetX = 0, touchOffsetY = 0, touchClone = null;

function touchStart(e) {
  const touch = e.touches[0];
  draggedEl = e.currentTarget;
  const rect = draggedEl.getBoundingClientRect();
  touchOffsetX = touch.clientX - rect.left;
  touchOffsetY = touch.clientY - rect.top;
  touchClone = draggedEl.cloneNode(true);
  touchClone.style.cssText = `
    position:fixed;z-index:9999;pointer-events:none;opacity:0.85;
    width:${rect.width}px;left:${touch.clientX - touchOffsetX}px;
    top:${touch.clientY - touchOffsetY}px;`;
  document.body.appendChild(touchClone);
  draggedEl.classList.add('dragging');
  document.addEventListener('touchmove', touchMove, { passive: false });
}

function touchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  if (touchClone) {
    touchClone.style.left = (touch.clientX - touchOffsetX) + 'px';
    touchClone.style.top  = (touch.clientY - touchOffsetY) + 'px';
  }
  const zone = document.getElementById('drop-zone');
  const rect = zone.getBoundingClientRect();
  if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
      touch.clientY >= rect.top  && touch.clientY <= rect.bottom) {
    zone.classList.add('drag-over');
  } else {
    zone.classList.remove('drag-over');
  }
}

function touchEnd(e) {
  document.removeEventListener('touchmove', touchMove);
  if (touchClone) { document.body.removeChild(touchClone); touchClone = null; }
  if (!draggedEl) return;
  const touch = e.changedTouches[0];
  const zone = document.getElementById('drop-zone');
  const rect = zone.getBoundingClientRect();
  zone.classList.remove('drag-over');
  if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
      touch.clientY >= rect.top  && touch.clientY <= rect.bottom) {
    zone.appendChild(draggedEl);
  }
  draggedEl.classList.remove('dragging');
  draggedEl = null;
}

function allowDrop(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function dropWord(e)  { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); if (draggedEl) document.getElementById('drop-zone').appendChild(draggedEl); }
function resetOrdenar() { renderOrdenar(); }

function checkOrdenar() {
  const zone = document.getElementById('drop-zone');
  const words = Array.from(zone.querySelectorAll('.drag-word')).map(el => el.dataset.word);
  const feedback = document.getElementById('ordenar-feedback');

  if (!words.length) {
    feedback.textContent = '⬆ Arrastra las palabras a la zona de abajo';
    feedback.className = 'feedback wrong-msg';
    return;
  }

  if (words.join(' ') === currentOrdenar.correct) {
    feedback.textContent = '🎊 ¡Oración correcta!';
    feedback.className = 'feedback correct-msg';
    playSoundCorrect();
    zone.querySelectorAll('.drag-word').forEach(el => {
      el.style.background = 'linear-gradient(135deg,#6BCB77,#52b560)';
      el.style.color = '#fff'; el.style.borderColor = '#52b560';
    });
    ordenarScore += 15;
    document.getElementById('ordenar-score').textContent = ordenarScore;
    updateStars(1);
    setTimeout(() => {
      ordenarIndex = (ordenarIndex + 1) % ordenarData.length;
      renderOrdenar();
    }, 1800);
  } else {
    feedback.textContent = '🤔 Ese orden no es correcto. ¡Inténtalo!';
    feedback.className = 'feedback wrong-msg';
    playSoundWrong();
    zone.querySelectorAll('.drag-word').forEach(el => {
      el.style.animation = 'shake 0.4s ease';
      setTimeout(() => el.style.animation = '', 400);
    });
  }
}

// ============================================================
// ACTIVIDAD 4: LEE EN VOZ ALTA
//
// NOTA SOBRE PERMISOS:
// El navegador requiere que el usuario autorice el micrófono.
// Si el usuario niega el permiso, se muestra un mensaje
// amigable que explica cómo habilitarlo, en lugar del mensaje
// técnico predeterminado del sistema.
// ============================================================
const vozData = [
  'El sol sale por la mañana.',
  'La mariposa vuela sobre la flor.',
  'Mi perro ladra muy fuerte.',
  'El niño juega con su pelota.',
  'Mamá prepara el desayuno.',
  'El pájaro canta en el árbol.',
];

let vozIndex = 0;
let vozScore  = 0;
let recognition = null;
let isListening = false;

function initVoz() {
  vozIndex = 0;
  renderVoz();
}

function renderVoz() {
  document.getElementById('voz-sentence').textContent = vozData[vozIndex];
  document.getElementById('voz-transcript').textContent = '';
  document.getElementById('voz-feedback').textContent = '';
  document.getElementById('voz-feedback').className = 'feedback';
  document.getElementById('mic-label').textContent = 'Presiona y Lee';
}

function startListening() {
  if (isListening) { stopListening(); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('voz-feedback').textContent =
      '😕 Tu navegador no admite reconocimiento de voz. Usa Chrome o Edge.';
    document.getElementById('voz-feedback').className = 'feedback wrong-msg';
    return;
  }

  recognition = new SR();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById('mic-btn').classList.add('listening');
    document.getElementById('mic-label').textContent = 'Escuchando...';
    document.getElementById('listening-anim').classList.add('show');
    document.getElementById('voz-transcript').textContent = '🎙️ Escuchando...';
    document.getElementById('voz-feedback').textContent = '';
  };

  recognition.onresult = e => {
    const results  = Array.from(e.results[0]).map(r => r.transcript.toLowerCase().trim());
    const expected = vozData[vozIndex].toLowerCase().replace(/[.,!?]/g, '').trim();

    document.getElementById('voz-transcript').textContent = '🗣️ Dijiste: "' + results[0] + '"';

    const spokenWords   = results[0].replace(/[.,!?]/g, '').split(' ');
    const expectedWords = expected.split(' ');
    const matches = spokenWords.filter(w => expectedWords.includes(w)).length;
    const similarity = matches / expectedWords.length;

    const feedback = document.getElementById('voz-feedback');
    if (similarity >= 0.6) {
      feedback.textContent = '🌟 ¡Muy bien! ¡Excelente lectura!';
      feedback.className = 'feedback correct-msg';
      playSoundCorrect();
      vozScore += 10;
      document.getElementById('voz-score').textContent = vozScore;
      updateStars(1);
    } else {
      feedback.textContent = '😊 ¡Inténtalo otra vez! Puedes hacerlo.';
      feedback.className = 'feedback wrong-msg';
    }
    stopListening();
  };

  recognition.onerror = e => {
    const feedback = document.getElementById('voz-feedback');
    feedback.className = 'feedback wrong-msg';

    // Mensajes amigables según el tipo de error
    if (e.error === 'no-speech') {
      feedback.textContent = '🔇 No te escuché. ¡Habla más fuerte y cerca!';
    } else if (e.error === 'not-allowed' || e.error === 'permission-denied') {
      // Explica cómo habilitar el micrófono sin mensajes técnicos
      feedback.textContent = '🎙️ Necesito usar tu micrófono. Busca el ícono 🔒 en la barra del navegador y activa el micrófono.';
    } else if (e.error === 'network') {
      feedback.textContent = '📶 Revisa tu conexión a internet e intenta de nuevo.';
    } else {
      feedback.textContent = '⚠️ No pude escucharte. ¡Intenta de nuevo!';
    }
    stopListening();
  };

  recognition.onend = () => stopListening();

  // Intenta iniciar – si hay error de permisos se captura en onerror
  try { recognition.start(); } catch(err) {
    document.getElementById('voz-feedback').textContent =
      '⚠️ No se pudo iniciar el micrófono. Intenta de nuevo.';
    document.getElementById('voz-feedback').className = 'feedback wrong-msg';
    stopListening();
  }
}

function stopListening() {
  isListening = false;
  if (recognition) { try { recognition.stop(); } catch(e) {} }
  document.getElementById('mic-btn').classList.remove('listening');
  document.getElementById('mic-label').textContent = 'Presiona y Lee';
  document.getElementById('listening-anim').classList.remove('show');
}

function nextVozQuestion() {
  vozIndex = (vozIndex + 1) % vozData.length;
  renderVoz();
}

// ============================================================
// ACTIVIDAD 5: ABECEDARIO
// ============================================================
const alphabet = [
  { letter: 'A', emoji: '🌳', word: 'Árbol' },
  { letter: 'B', emoji: '⛵', word: 'Barco' },
  { letter: 'C', emoji: '🏠', word: 'Casa' },
  { letter: 'D', emoji: '🦷', word: 'Diente' },
  { letter: 'E', emoji: '🐘', word: 'Elefante' },
  { letter: 'F', emoji: '🌸', word: 'Flor' },
  { letter: 'G', emoji: '🐱', word: 'Gato' },
  { letter: 'H', emoji: '🧵', word: 'Hilo' },
  { letter: 'I', emoji: '🏝️', word: 'Isla' },
  { letter: 'J', emoji: '🦒', word: 'Jirafa' },
  { letter: 'K', emoji: '🥝', word: 'Kiwi' },
  { letter: 'L', emoji: '🦁', word: 'León' },
  { letter: 'M', emoji: '🤚', word: 'Mano' },
  { letter: 'N', emoji: '🍊', word: 'Naranja' },
  { letter: 'Ñ', emoji: '🥜', word: 'Ñame' },
  { letter: 'O', emoji: '🐑', word: 'Oveja' },
  { letter: 'P', emoji: '🍞', word: 'Pan' },
  { letter: 'Q', emoji: '🧀', word: 'Queso' },
  { letter: 'R', emoji: '🐸', word: 'Rana' },
  { letter: 'S', emoji: '🌞', word: 'Sol' },
  { letter: 'T', emoji: '🐢', word: 'Tortuga' },
  { letter: 'U', emoji: '🍇', word: 'Uvas' },
  { letter: 'V', emoji: '🐮', word: 'Vaca' },
  { letter: 'W', emoji: '🍉', word: 'Wafle' },
  { letter: 'X', emoji: '🪗', word: 'Xilófono' },
  { letter: 'Y', emoji: '🌿', word: 'Yerba' },
  { letter: 'Z', emoji: '🦊', word: 'Zorro' },
];

let abcIndex = 0;

function initAbc() { renderAbc(); }

function renderAbc() {
  const data = alphabet[abcIndex];
  const letterEl = document.getElementById('abc-letter');
  const emojiEl  = document.getElementById('abc-emoji');
  const wordEl   = document.getElementById('abc-word');

  letterEl.style.animation = 'none';
  emojiEl.style.animation  = 'none';
  requestAnimationFrame(() => {
    letterEl.style.animation = 'letterBounce 0.4s ease';
    emojiEl.style.animation  = 'fadeSlideIn 0.3s ease';
  });

  letterEl.textContent = data.letter;
  emojiEl.textContent  = data.emoji;
  wordEl.textContent   = data.word;
  renderAbcDots();
}

function renderAbcDots() {
  const container = document.getElementById('abc-dots');
  container.innerHTML = '';
  alphabet.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'abc-dot' + (i === abcIndex ? ' active' : '');
    dot.onclick = () => { abcIndex = i; renderAbc(); };
    container.appendChild(dot);
  });
}

function speakLetter() {
  const data = alphabet[abcIndex];
  speak(data.letter + '... ' + data.word);
  const el = document.getElementById('abc-letter');
  el.style.transform = 'scale(1.2) rotate(5deg)';
  setTimeout(() => el.style.transform = '', 400);
}

function nextLetter() {
  abcIndex = (abcIndex + 1) % alphabet.length;
  renderAbc();
  speakLetter();
}

function prevLetter() {
  abcIndex = (abcIndex - 1 + alphabet.length) % alphabet.length;
  renderAbc();
  speakLetter();
}
