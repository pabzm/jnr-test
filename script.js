// jQuery-Selektoren für alle DOM-Elemente
const $game             = $("#game");
const $character        = $("#character");
const $scoreSpan        = $("#scoreSpan");
const $startMenu        = $("#startMenu");
const $pauseMenu        = $("#pauseMenu");
const $gameOverMenu     = $("#gameOverMenu");
const $startButton      = $("#startButton");
const $resumeButton     = $("#resumeButton");
const $backToStartButton = $("#backToStartButton");
const $countdownEl      = $("#countdown");
const $finalScoreEl     = $("#finalScore");
const $startHighScoreEl = $("#startHighScore");
const $pauseHighScoreEl = $("#pauseHighScore");

// Native DOM-Referenzen für direkte Animationssteuerung
const character = $character[0];
const gameEl    = $game[0];

let counter = 0;
let score = 0;
let gameOver = false;
let isRunning = false;
let isPaused = false;
let isResuming = false;
let resumeTimerId = null;
let blockDelayTimerId = null;
const HIGH_SCORE_KEY = "jumpingBlockHighScore";
const DEFAULT_HIGH_SCORE = 559;
let highScore = 0;

function setMenuOpen(open) {
    $("body").toggleClass("menu-open", open);
}

function showOnly(menuToShow) {
    $startMenu.add($pauseMenu).add($gameOverMenu)
        .addClass("hidden")
        .attr("aria-hidden", "true");

    if (menuToShow) {
        menuToShow.removeClass("hidden").attr("aria-hidden", "false");
        setMenuOpen(true);
    } else {
        setMenuOpen(false);
    }
}

function setGameStopped(stopped) {
    $("body").toggleClass("game-stopped", stopped);
}

function cancelBlockDelay() {
    if (blockDelayTimerId !== null) {
        clearTimeout(blockDelayTimerId);
        blockDelayTimerId = null;
    }
}

// Erstellt einen neuen Block und startet seine Animation; plant sofort den nächsten ein
function launchBlock() {
    // Animationsdauer sinkt alle 20 Blöcke um 0.1 s (Minimum: 0.5 s)
    const speed = Math.max(0.5, 1.2 - Math.floor(score / 20) * 0.1);
    const el = document.createElement("div");
    el.className = "block";
    el.setAttribute("aria-hidden", "true");
    el.style.animation = "block " + speed + "s linear";
    el.style.animationPlayState = (isPaused || !isRunning || isResuming) ? "paused" : "running";
    gameEl.appendChild(el);
    el.addEventListener("animationend", () => { el.remove(); });
    // Nächsten Block einplanen, sobald dieser startet
    scheduleNextBlock();
}

// Plant den nächsten Block mit zufälliger Verzögerung ein
function scheduleNextBlock() {
    cancelBlockDelay();

    if (!isRunning || gameOver || isPaused || isResuming) return;

    // Zufällige Verzögerung: 200 ms – 600 ms
    const delay = Math.floor(Math.random() * 401) + 700;
    blockDelayTimerId = setTimeout(() => {
        blockDelayTimerId = null;
        if (!isRunning || gameOver || isPaused || isResuming) return;
        launchBlock();
    }, delay);
}

function setPausedState(paused) {
    isPaused = paused;
    $("body").toggleClass("game-paused", paused);
    if (paused) {
        cancelBlockDelay();
    }
}

function resetBlockToStart() {
    cancelBlockDelay();
    gameEl.querySelectorAll(".block").forEach(b => b.remove());
}

function overlaps(a, b) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return !(
        ra.right  < rb.left  ||
        ra.left   > rb.right ||
        ra.bottom < rb.top   ||
        ra.top    > rb.bottom
    );
}

function resetScore() {
    counter = 0;
    score = 0;
    $scoreSpan.text("0");
    $finalScoreEl.text("0");
}

function loadHighScore() {
    try {
        const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
        const stored = raw === null ? Number.NaN : Number.parseInt(raw, 10);
        const existing = Number.isFinite(stored) && stored >= 0 ? stored : 0;

        highScore = Math.max(existing, DEFAULT_HIGH_SCORE);
        saveHighScore();
    } catch (error) {
        highScore = DEFAULT_HIGH_SCORE;
    }
}

function saveHighScore() {
    try {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    } catch (error) {
        // Wenn lokaler Speicher nicht verfügbar ist, bleibt der Highscore nur für diese Sitzung aktiv.
    }
}

function updateHighScoreDisplay() {
    const value = String(highScore);
    $startHighScoreEl.text(value);
    $pauseHighScoreEl.text(value);
}

function commitHighScore(candidateScore) {
    if (!Number.isFinite(candidateScore)) return;

    if (candidateScore > highScore) {
        highScore = candidateScore;
        saveHighScore();
        updateHighScoreDisplay();
    }
}

// Vergib einen Punkt, wenn der Spieler einen Block passiert hat
function awardPoint() {
    if (!isRunning || gameOver || isPaused || isResuming) return;

    score += 1;
    counter = score * 100;
    $scoreSpan.text(String(score));
    commitHighScore(score);
}

function cancelResumeCountdown() {
    if (resumeTimerId) {
        clearTimeout(resumeTimerId);
        resumeTimerId = null;
    }
    $countdownEl.text("");
    $resumeButton.prop("disabled", false);
    isResuming = false;
}

function stopToStartMenu() {
    cancelResumeCountdown();
    cancelBlockDelay();
    isRunning = false;
    gameOver = false;
    isPaused = false;
    $("body").removeClass("game-paused");
    setGameStopped(true);
    showOnly($startMenu);
    updateHighScoreDisplay();
    resetBlockToStart();
    resetScore();
}

function startGame() {
    cancelResumeCountdown();
    cancelBlockDelay();
    resetBlockToStart();
    resetScore();
    gameOver = false;
    isRunning = true;
    isPaused = false;
    isResuming = false;
    $("body").removeClass("game-paused");
    setGameStopped(false);
    showOnly(null);
    updateHighScoreDisplay();
    scheduleNextBlock();
}

function pauseGame() {
    if (!isRunning || gameOver || isPaused || isResuming) return;
    $countdownEl.text("");
    updateHighScoreDisplay();
    setPausedState(true);
    showOnly($pauseMenu);
}

function finishResume() {
    isResuming = false;
    $countdownEl.text("");
    $resumeButton.prop("disabled", false);
    showOnly(null);
    $("body").removeClass("game-paused");
    isPaused = false;
    // Vorhandene Blöcke laufen via CSS weiter; nächsten Block einplanen
    scheduleNextBlock();
}

function startResumeCountdown() {
    if (!isRunning || gameOver || isResuming || !isPaused) return;

    isResuming = true;
    $resumeButton.prop("disabled", true);
    updateHighScoreDisplay();
    showOnly($pauseMenu);
    $("body").addClass("game-paused");
    // CSS pausiert automatisch alle laufenden .block-Elemente

    let secondsLeft = 3;
    $countdownEl.text(`Weiter in ${secondsLeft}...`);

    const tick = () => {
        secondsLeft -= 1;

        if (secondsLeft <= 0) {
            finishResume();
            return;
        }

        $countdownEl.text(`Weiter in ${secondsLeft}...`);
        resumeTimerId = window.setTimeout(tick, 1000);
    };

    resumeTimerId = window.setTimeout(tick, 1000);
}

function jump() {
    if (!isRunning || gameOver || isPaused || isResuming || $character.hasClass("jump")) return;

    $character.addClass("jump");
    window.setTimeout(() => {
        $character.removeClass("jump");
    }, 450);
}

function handleGameOver() {
    if (gameOver) return;

    gameOver = true;
    isRunning = false;
    isPaused = false;
    isResuming = false;
    cancelResumeCountdown();
    cancelBlockDelay();
    commitHighScore(score);
    setGameStopped(true);
    $("body").removeClass("game-paused");
    $finalScoreEl.text(String(score));
    showOnly($gameOverMenu);
}

// Event-Handler mit jQuery
$startButton.on("click", startGame);
$resumeButton.on("click", startResumeCountdown);
$backToStartButton.on("click", stopToStartMenu);

$(document).on("keydown", (event) => {
    if (event.code === "Space") {
        event.preventDefault();

        if (!$startMenu.hasClass("hidden")) {
            $startButton.trigger("click");
            return;
        }

        if (!$gameOverMenu.hasClass("hidden")) {
            $backToStartButton.trigger("click");
            return;
        }

        if (isRunning && !gameOver && !isPaused && !isResuming) jump();
        return;
    }

    if (event.code === "ArrowUp") {
        event.preventDefault();
        if (isRunning && !gameOver && !isPaused && !isResuming) jump();
        return;
    }

    if (event.code === "Escape") {
        event.preventDefault();

        if (!isRunning || gameOver || isResuming) return;

        if (isPaused) {
            startResumeCountdown();
        } else {
            pauseGame();
        }
    }
});

// Kollisionserkennung und Punktevergabe
window.setInterval(() => {
    if (!isRunning || gameOver || isPaused || isResuming) return;

    const characterRect = character.getBoundingClientRect();

    for (const b of gameEl.querySelectorAll(".block")) {
        if (overlaps(character, b)) {
            handleGameOver();
            return;
        }

        const blockRect = b.getBoundingClientRect();
        if (!b.dataset.scored && blockRect.right < characterRect.left) {
            b.dataset.scored = "true";
            awardPoint();
        }
    }
}, 10);


loadHighScore();
updateHighScoreDisplay();
setGameStopped(true);
showOnly($startMenu);
resetBlockToStart();
resetScore();
