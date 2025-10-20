/* Water Quest - main game script
   Implements: start screen, spawning jerry cans (good) and pollutants (bad),
   scoring, timer, feedback, sounds, difficulty modes, and replay. Works with mouse & touch.
*/

// --- Configuration ---
const DIFFICULTY_SETTINGS = {
  easy: {
    duration: 45,
    spawnInterval: 1200,
    objectLifetime: 1100,
    goodScore: 10,
    badScore: -3,
    winScore: 100,
    label: 'Easy'
  },
  normal: {
    duration: 30,
    spawnInterval: 1000,
    objectLifetime: 980,
    goodScore: 10,
    badScore: -5,
    winScore: 150,
    label: 'Normal'
  },
  hard: {
    duration: 20,
    spawnInterval: 800,
    objectLifetime: 850,
    goodScore: 15,
    badScore: -8,
    winScore: 200,
    label: 'Hard'
  }
};

// --- State ---
let score = 0;
let timeLeft = 30;
let spawnTimer = null;
let countdownTimer = null;
let gameActive = false;
let muted = false;
let currentDifficulty = 'normal';
let currentSettings = DIFFICULTY_SETTINGS.normal;

// --- Elements ---
const startBtn = document.getElementById('start-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const gameContainer = document.getElementById('game-container');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const finalScoreEl = document.getElementById('final-score');
const muteBtn = document.getElementById('mute-btn');
const endTitle = document.getElementById('end-title');
const resultMessage = document.getElementById('result-message');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

// --- Sounds (optional) ---
const splashSound = new Audio();
const buzzSound = new Audio();
// try to set source if available (no network fetch); we'll use simple beep fallback if not
try { splashSound.src = 'img/splash.mp3'; } catch (e) {}
try { buzzSound.src = 'img/buzz.mp3'; } catch (e) {}

// Utility: create element with classes
function el(tag = 'div', classNames = []) {
  const d = document.createElement(tag);
  d.className = classNames.join(' ');
  return d;
}

// --- Game control ---
startBtn.addEventListener('click', () => startGame());
playAgainBtn.addEventListener('click', () => startGame());
backToMenuBtn.addEventListener('click', () => backToMenu());
muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
});

// Difficulty selection
difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    difficultyButtons.forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    btn.classList.add('active');
    // Update difficulty
    currentDifficulty = btn.getAttribute('data-difficulty');
    currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];
  });
});

function startGame() {
  // Reset state
  score = 0;
  timeLeft = currentSettings.duration;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  finalScoreEl.textContent = score;

  // UI
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  clearGameArea();

  // Start timers
  gameActive = true;
  spawnTimer = setInterval(spawnObject, currentSettings.spawnInterval);
  countdownTimer = setInterval(() => {
    timeLeft -= 1;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  gameActive = false;
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  spawnTimer = null;
  countdownTimer = null;
  
  // Check if player won
  const won = score >= currentSettings.winScore;
  
  // Update end screen
  finalScoreEl.textContent = score;
  
  if (won) {
    endTitle.textContent = '🎉 Victory! 🎉';
    resultMessage.textContent = `Amazing! You reached ${currentSettings.winScore} points on ${currentSettings.label} mode!`;
    resultMessage.style.color = '#4CAF50';
  } else {
    endTitle.textContent = 'Game Over';
    resultMessage.textContent = `You scored ${score} points. Goal was ${currentSettings.winScore} on ${currentSettings.label} mode. Try again!`;
    resultMessage.style.color = '#0D2434';
  }
  
  // Show end screen
  endScreen.classList.remove('hidden');
}

function backToMenu() {
  // Stop any active game
  gameActive = false;
  if (spawnTimer) clearInterval(spawnTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  spawnTimer = null;
  countdownTimer = null;
  
  // Hide end screen and show start screen
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  
  // Clear the game area
  clearGameArea();
}

function clearGameArea() {
  while (gameContainer.firstChild) gameContainer.removeChild(gameContainer.firstChild);
}

// --- Spawning objects ---
function spawnObject() {
  if (!gameActive) return;

  // Decide type: jerry can (good) or pollutant (bad)
  const isGood = Math.random() < 0.7; // 70% good, 30% bad

  const node = el('div', ['game-object']);
  const size = 48 + Math.floor(Math.random() * 32); // 48-80px
  node.style.width = node.style.height = size + 'px';
  node.style.position = 'absolute';

  // Random position within container
  const rect = gameContainer.getBoundingClientRect();
  const maxX = Math.max(0, rect.width - size);
  const maxY = Math.max(0, rect.height - size);
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  node.style.left = x + 'px';
  node.style.top = y + 'px';

  if (isGood) {
    node.classList.add('jerry');
    // use provided sprite if available
    node.style.backgroundImage = "url('img/water-can.png')";
    node.setAttribute('data-type', 'good');
  } else {
    node.classList.add('pollutant');
    // show an oil barrel emoji fallback
    node.textContent = '🛢️';
    node.style.fontSize = Math.max(20, size / 2) + 'px';
    node.style.justifyContent = 'center';
    node.style.alignItems = 'center';
    node.setAttribute('data-type', 'bad');
  }

  // handle input (click/tap)
  const onHit = (e) => {
    if (!gameActive) return;
    e.stopPropagation();
    const type = node.getAttribute('data-type');
    
    // Add collected animation class
    node.classList.add('collected');
    
    if (type === 'good') {
      addScore(currentSettings.goodScore, e.clientX || (e.touches && e.touches[0].clientX), e.clientY || (e.touches && e.touches[0].clientY));
      if (!muted) playSound(splashSound);
    } else {
      // bad: deduct points
      addScore(currentSettings.badScore, e.clientX || (e.touches && e.touches[0].clientX), e.clientY || (e.touches && e.touches[0].clientY));
      // deduct 2 seconds as an additional penalty sometimes
      if (Math.random() < 0.6) {
        timeLeft = Math.max(0, timeLeft - 2);
        timeEl.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
      }
      if (!muted) playSound(buzzSound);
    }
    
    // Remove object after animation completes
    setTimeout(() => {
      node.removeEventListener('click', onHit);
      if (node.parentNode) node.remove();
    }, 400); // Match animation duration
  };

  node.addEventListener('click', onHit);
  node.addEventListener('touchstart', onHit, {passive: true});

  // Add to container then schedule removal if not clicked
  gameContainer.appendChild(node);
  const lifetime = currentSettings.objectLifetime;
  const rm = setTimeout(() => {
    // gracefully remove
    if (node.parentNode) node.remove();
    clearTimeout(rm);
  }, lifetime);
}

// --- Scoring & feedback ---
function addScore(delta, x = null, y = null) {
  score += delta;
  scoreEl.textContent = score;
  showFeedback(delta, x, y);
}

function showFeedback(delta, clientX, clientY) {
  const fb = el('div', ['feedback']);
  fb.textContent = (delta > 0 ? `+${delta} 💧` : `${delta} 💀`);

  // place near click; convert client coords to container coords if provided
  const rect = gameContainer.getBoundingClientRect();
  if (clientX != null && clientY != null) {
    fb.style.left = (clientX - rect.left) + 'px';
    fb.style.top = (clientY - rect.top) + 'px';
  } else {
    // center top as fallback
    fb.style.left = (rect.width / 2) + 'px';
    fb.style.top = (rect.height / 2) + 'px';
  }

  gameContainer.appendChild(fb);
  setTimeout(() => fb.remove(), 900);
}

function playSound(sound) {
  try {
    // small volume and quick play; catch if not loaded
    sound.currentTime = 0;
    sound.volume = 0.6;
    sound.play().catch(() => {});
  } catch (e) {}
}

// Ensure clicks on container don't accidentally close overlays
gameContainer.addEventListener('click', (e) => {
  // optionally spawn a small ripple or ignore
});

// Clean up when the page is hidden or navigated away
window.addEventListener('blur', () => {
  // pause timers
  if (gameActive) {
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
  }
});

// Make sure end screen can restart
// (playAgainBtn wired above)

// Basic accessibility: allow keyboard starting
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !gameActive && startScreen.classList.contains('hidden')) {
    // if start screen hidden and not active, pressing will restart
    startGame();
  }
});

// Exports for debugging in console
window._waterQuest = { startGame, endGame };

// --- Scroll Indicator ---
const scrollIndicator = document.getElementById('scroll-indicator');

function handleScroll() {
  if (!scrollIndicator) return;
  
  // Calculate how far user has scrolled
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Hide indicator when user scrolls near the bottom (within 200px)
  const scrolledToBottom = scrollTop + windowHeight >= documentHeight - 200;
  
  if (scrolledToBottom) {
    scrollIndicator.classList.add('hidden');
  } else {
    scrollIndicator.classList.remove('hidden');
  }
}

// Listen for scroll events
window.addEventListener('scroll', handleScroll);

// Initial check on page load
handleScroll();
