let wordPool = [];
let score = 0;
let secretWord = "";
let currentGuess = "";
let guesses = [];
const maxTries = 6;
let gameOver = false;

const gridContainer = document.getElementById("grid");
const keyboardContainer = document.getElementById("keyboard");
const hiddenInput = document.getElementById("hidden-input");
const resultDisplay = document.getElementById("result");

const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BKSP"]
];

// Fetch thousands of 5-letter words from a public English word repository
async function loadDictionaryAndStart() {
    try {
        resultDisplay.innerHTML = "⏳ Loading dictionary...";
        const response = await fetch("https://raw.githubusercontent.com/charlesreid1/five-letter-words/master/sgb-words.txt");
        if (!response.ok) throw new Error("Network issue");
        
        const text = await response.text();
        wordPool = text.split("\n")
                      .map(word => word.trim().toUpperCase())
                      .filter(word => word.length === 5);
        
        initGame();
    } catch (error) {
        console.error("Critical Error: Could not load the English dictionary repository.", error);
        resultDisplay.innerHTML = "❌ Failed to load dictionary. Please check your connection and refresh.";
    }
}

function initGame() {
    // Pick a completely randomized word from the English dictionary pool
    secretWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    
    guesses = [];
    currentGuess = "";
    gameOver = false;
    resultDisplay.innerHTML = "";
    hiddenInput.value = "";
    
    // Draw Grid
    gridContainer.innerHTML = "";
    for (let i = 0; i < maxTries; i++) {
        const row = document.createElement("div");
        row.classList.add("wordle-row");
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement("div");
            tile.classList.add("wordle-tile");
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        gridContainer.appendChild(row);
    }

    // Draw Keyboard
    renderKeyboard();
    
    document.removeEventListener("click", focusInput);
    document.addEventListener("click", focusInput);
    hiddenInput.focus();
}

function focusInput() {
    if(!gameOver) hiddenInput.focus();
}

function renderKeyboard() {
    keyboardContainer.innerHTML = "";
    keyboardRows.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("keyboard-row");
        
        row.forEach(key => {
            const btn = document.createElement("button");
            btn.className = (key === "ENTER" || key === "BKSP") ? "key wide" : "key";
            btn.innerText = key;
            btn.id = `key-${key}`;
            
            btn.addEventListener("click", () => handleKeyPress(key));
            rowDiv.appendChild(btn);
        });
        keyboardContainer.appendChild(rowDiv);
    });
}

hiddenInput.addEventListener("input", (e) => {
    if (gameOver) return;
    let val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    currentGuess = val;
    updateCurrentRowVisuals();
});

window.addEventListener("keydown", (e) => {
    if (gameOver) return;
    if (e.key === "Enter") {
        handleKeyPress("ENTER");
    } else if (e.key === "Backspace") {
        handleKeyPress("BKSP");
    }
});

function handleKeyPress(key) {
    if (gameOver) return;

    if (key === "BKSP") {
        if (currentGuess.length > 0) {
            currentGuess = currentGuess.slice(0, -1);
            hiddenInput.value = currentGuess;
        }
    } else if (key === "ENTER") {
        if (currentGuess.length === 5) {
            submitGuess();
        } else {
            resultDisplay.innerHTML = "⚠️ Word must be 5 letters!";
        }
    } else if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length < 5) {
            currentGuess += key;
            hiddenInput.value = currentGuess;
        }
    }
    updateCurrentRowVisuals();
}

function updateCurrentRowVisuals() {
    const activeRowIdx = guesses.length;
    if (activeRowIdx >= maxTries) return;

    for (let j = 0; j < 5; j++) {
        const tile = document.getElementById(`tile-${activeRowIdx}-${j}`);
        if (currentGuess[j]) {
            tile.innerText = currentGuess[j];
        } else {
            tile.innerText = "";
        }
    }
}

function submitGuess() {
    const rowIdx = guesses.length;
    const guess = currentGuess;
    guesses.push(guess);
    
    let secretLetterCounts = {};
    for (let char of secretWord) {
        secretLetterCounts[char] = (secretLetterCounts[char] || 0) + 1;
    }

    let tileStatuses = Array(5).fill("tile-absent");

    for (let i = 0; i < 5; i++) {
        if (guess[i] === secretWord[i]) {
            tileStatuses[i] = "tile-correct";
            secretLetterCounts[guess[i]]--;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (tileStatuses[i] !== "tile-correct") {
            if (secretLetterCounts[guess[i]] && secretLetterCounts[guess[i]] > 0) {
                tileStatuses[i] = "tile-present";
                secretLetterCounts[guess[i]]--;
            }
        }
    }

    for (let i = 0; i < 5; i++) {
        const tile = document.getElementById(`tile-${rowIdx}-${i}`);
        tile.classList.add(tileStatuses[i]);
        
        const keyBtn = document.getElementById(`key-${guess[i]}`);
        if (keyBtn) {
            if (tileStatuses[i] === "tile-correct") {
                keyBtn.className = "key tile-correct";
            } else if (tileStatuses[i] === "tile-present" && !keyBtn.classList.contains("tile-correct")) {
                keyBtn.className = "key tile-present";
            } else if (tileStatuses[i] === "tile-absent" && !keyBtn.classList.contains("tile-correct") && !keyBtn.classList.contains("tile-present")) {
                keyBtn.className = "key tile-absent";
            }
        }
    }

    currentGuess = "";
    hiddenInput.value = "";

    if (guess === secretWord) {
        gameOver = true;
        score += 15;
        document.getElementById("score").innerText = `Score: ${score}`;
        resultDisplay.innerHTML = "🔥 Bandit Beaten! +15 Score";
        
        // Save leaderboard data on victory
        checkAndSaveScore(score);
        setTimeout(initGame, 2000);

    } else if (guesses.length === maxTries) {
        gameOver = true;
        
        // Save leaderboard data before points get dropped
        checkAndSaveScore(score);

        score = Math.max(0, score - 5);
        document.getElementById("score").innerText = `Score: ${score}`;
        resultDisplay.innerHTML = `❌ Busted! Word was: <strong>${secretWord}</strong>`;
        setTimeout(initGame, 3000);
    }
}

function updateLeaderboardUI() {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    const scores = JSON.parse(localStorage.getItem("wordle_leaderboard")) || [];
    list.innerHTML = scores.length === 0 ? "<li class='leaderboard-item' style='justify-content:center;'>No highscores yet!</li>" : "";
    
    scores.forEach((entry, idx) => {
        const li = document.createElement("li");
        li.className = "leaderboard-item";
        let rankClass = idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : idx === 2 ? "rank-3" : "";
        li.innerHTML = `<span class="${rankClass}">${idx + 1}. ${entry.name}</span> <strong>${entry.score} pts</strong>`;
        list.appendChild(li);
    });
}

function checkAndSaveScore(finalScore) {
    if (finalScore <= 0) return; // Don't track 0 score runs
    let scores = JSON.parse(localStorage.getItem("wordle_leaderboard")) || [];
    const minScore = scores.length < 5 ? 0 : scores[scores.length - 1].score;
    
    if (finalScore > minScore || scores.length < 5) {
        setTimeout(() => {
            const name = prompt(`🔥 New Wordle High Score: ${finalScore}! Enter your name:`);
            if (name) {
                const cleanedName = name.trim().slice(0, 10) || "Anonymous";
                scores.push({ name: cleanedName, score: finalScore });
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 5);
                localStorage.setItem("wordle_leaderboard", JSON.stringify(scores));
                updateLeaderboardUI();
            }
        }, 500);
    }
}

// Start dictionary tracking and load UI lists
loadDictionaryAndStart();
updateLeaderboardUI();