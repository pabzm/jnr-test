const game = document.getElementById("game");
const character = document.getElementById("character");
const block = document.getElementById("block");
const scoreSpan = document.getElementById("scoreSpan");
const startMenu = document.getElementById("startMenu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const startButton = document.getElementById("startButton");
const resumeButton = document.getElementById("resumeButton");
const backToStartButton = document.getElementById("backToStartButton");
const countdownEl = document.getElementById("countdown");
const finalScoreEl = document.getElementById("finalScore");
const startHighScoreEl = document.getElementById("startHighScore");
const pauseHighScoreEl = document.getElementById("pauseHighScore");

let counter = 0;
let score = 0;
let gameOver = false;
let isRunning = false;
let isPaused = false;
let isResuming = false;
let resumeTimerId = null;
let blockSpeed = 1.1;
const HIGH_SCORE_KEY = "jumpingBlockHighScore";
const DEFAULT_HIGH_SCORE = 559;
let highScore = 0;
let scoredForCurrentBlock = false;

function setMenuOpen(open) {
    document.body.classList.toggle("menu-open", open);
}

function showOnly(menuToShow) {
    for (const menu of [startMenu, pauseMenu, gameOverMenu]) {
        menu.classList.add("hidden");
        menu.setAttribute("aria-hidden", "true");
    }

    if (menuToShow) {
        menuToShow.classList.remove("hidden");
        menuToShow.setAttribute("aria-hidden", "false");
        setMenuOpen(true);
    } else {
        setMenuOpen(false);
    }
}

function setGameStopped(stopped) {
    document.body.classList.toggle("game-stopped", stopped);
    block.style.animationPlayState = stopped ? "paused" : "running";
}

function setPausedState(paused) {
    isPaused = paused;
    document.body.classList.toggle("game-paused", paused);
    block.style.animationPlayState = paused ? "paused" : "running";
}

function resetBlock() {
    scoredForCurrentBlock = false;
    block.style.animation = "none";
    block.style.left = "100%";
    void block.offsetHeight;
    block.style.animation = "block " + blockSpeed + "s infinite linear";
    block.style.animationPlayState = (isPaused || !isRunning || isResuming) ? "paused" : "running";
}

function overlaps(a, b) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return !(
        ra.right < rb.left ||
        ra.left > rb.right ||
        ra.bottom < rb.top ||
        ra.top > rb.bottom
    );
}

function resetScore() {
    counter = 0;
    score = 0;
    scoredForCurrentBlock = false;
    scoreSpan.textContent = "0";
    finalScoreEl.textContent = "0";
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
    if (startHighScoreEl) startHighScoreEl.textContent = value;
    if (pauseHighScoreEl) pauseHighScoreEl.textContent = value;
}

function commitHighScore(candidateScore) {
    if (!Number.isFinite(candidateScore)) return;

    if (candidateScore > highScore) {
        highScore = candidateScore;
        saveHighScore();
        updateHighScoreDisplay();
    }
}
function awardPointForPassingBlock() {
    if (scoredForCurrentBlock || !isRunning || gameOver || isPaused || isResuming) return;

    score += 1;
    counter = score * 100;
    scoredForCurrentBlock = true;
    scoreSpan.textContent = String(score);
    commitHighScore(score);
}


function cancelResumeCountdown() {
    if (resumeTimerId) {
        clearTimeout(resumeTimerId);
        resumeTimerId = null;
    }
    countdownEl.textContent = "";
    resumeButton.disabled = false;
    isResuming = false;
}

function stopToStartMenu() {
    cancelResumeCountdown();
    isRunning = false;
    gameOver = false;
    isPaused = false;
    document.body.classList.remove("game-paused");
    setGameStopped(true);
    showOnly(startMenu);
    updateHighScoreDisplay();
    resetBlock();
    resetScore();
}

function startGame() {
    cancelResumeCountdown();
    resetScore();
    gameOver = false;
    isRunning = true;
    isPaused = false;
    isResuming = false;
    document.body.classList.remove("game-paused");
    setGameStopped(false);
    showOnly(null);
    resetBlock();
    updateHighScoreDisplay();
}

function pauseGame() {
    if (!isRunning || gameOver || isPaused || isResuming) return;
    countdownEl.textContent = "";
    updateHighScoreDisplay();
    setPausedState(true);
    showOnly(pauseMenu);
}

function finishResume() {
    isResuming = false;
    countdownEl.textContent = "";
    resumeButton.disabled = false;
    showOnly(null);
    document.body.classList.remove("game-paused");
    isPaused = false;
    setPausedState(false);
}

function startResumeCountdown() {
    if (!isRunning || gameOver || isResuming || !isPaused) return;

    isResuming = true;
    resumeButton.disabled = true;
    updateHighScoreDisplay();
    showOnly(pauseMenu);
    document.body.classList.add("game-paused");
    block.style.animationPlayState = "paused";

    let secondsLeft = 3;
    countdownEl.textContent = `Weiter in ${secondsLeft}...`;

    const tick = () => {
        secondsLeft -= 1;

        if (secondsLeft <= 0) {
            finishResume();
            return;
        }

        countdownEl.textContent = `Weiter in ${secondsLeft}...`;
        resumeTimerId = window.setTimeout(tick, 1000);
    };

    resumeTimerId = window.setTimeout(tick, 1000);
}

function jump() {
    if (!isRunning || gameOver || isPaused || isResuming || character.classList.contains("jump")) return;

    character.classList.add("jump");
    window.setTimeout(() => {
        character.classList.remove("jump");
    }, 450);
}

function handleGameOver() {
    if (gameOver) return;

    gameOver = true;
    isRunning = false;
    isPaused = false;
    isResuming = false; 
    cancelResumeCountdown();
    commitHighScore(score);
    setGameStopped(true);
    document.body.classList.remove("game-paused");
    finalScoreEl.textContent = String(score);
    showOnly(gameOverMenu);
}

game.addEventListener("ArrowUp", jump);

document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        event.preventDefault();

        if (startMenu && !startMenu.classList.contains("hidden")) {
            startButton.click();
            return;
        }

        if (gameOverMenu && !gameOverMenu.classList.contains("hidden")) {
            backToStartButton.click();
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

startButton.addEventListener("click", startGame);
resumeButton.addEventListener("click", startResumeCountdown);
backToStartButton.addEventListener("click", stopToStartMenu);

block.addEventListener("animationiteration", () => {
    scoredForCurrentBlock = false;
});

window.setInterval(() => {
    if (!isRunning || gameOver || isPaused || isResuming) return;

    if (overlaps(character, block)) {
        handleGameOver();
        return;
    }

    const characterRect = character.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();

    if (!scoredForCurrentBlock && blockRect.right < characterRect.left) {
        awardPointForPassingBlock();
    }
}, 10);


loadHighScore();
updateHighScoreDisplay();
setGameStopped(true);
showOnly(startMenu);
resetBlock();
resetScore();
