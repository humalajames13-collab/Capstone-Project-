let level = 1;
let pattern = [];
let userPattern = [];
let isPlayerTurn = false;

function generatePattern() {
    isPlayerTurn = false;
    userPattern = [];
    pattern = [];
    
    document.getElementById("instruction").innerText = "Memorize the pattern...";
    document.getElementById("result").innerText = "";

    // Determine grid size and tile counts adaptively based on current progression
    let gridSize = 3; // default 3x3
    let tileCount = 3;

    if (level >= 3 && level <= 5) {
        gridSize = 4; // Upgrade to 4x4
        tileCount = 5;
    } else if (level >= 6) {
        gridSize = 5; // Upgrade to 5x5 Matrix
        tileCount = 5 + (level - 5); // Continually builds size requirements
    }

    const totalTiles = gridSize * gridSize;
    buildGridVisuals(gridSize, totalTiles);

    // Pick unique spatial values
    while(pattern.length < tileCount) {
        let rand = Math.floor(Math.random() * totalTiles);
        if(!pattern.includes(rand)) pattern.push(rand);
    }

    const tiles = document.querySelectorAll('.tile');
    
    // Flash pattern sequences to player layout
    setTimeout(() => {
        pattern.forEach(index => tiles[index].classList.add('active'));
        
        // Hide display pattern relative to scaling matrix values
        setTimeout(() => {
            tiles.forEach(t => t.classList.remove('active'));
            isPlayerTurn = true;
            document.getElementById("instruction").innerText = "Your turn! Recreate it.";
        }, 1300);
    }, 600);
}

function buildGridVisuals(size, total) {
    const gridContainer = document.getElementById("grid");
    gridContainer.innerHTML = "";
    
    // Dynamically set dimensions up to a 5x5 framework comfortably inside container constraints
    gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gridContainer.style.maxWidth = size === 5 ? "380px" : size === 4 ? "340px" : "290px";

    for(let i = 0; i < total; i++) {
        let tile = document.createElement("div");
        tile.classList.add("tile");
        tile.setAttribute("data-index", i);
        tile.addEventListener('click', (e) => handleTileClick(e, i));
        gridContainer.appendChild(tile);
    }
}

function handleTileClick(e, idx) {
    if (!isPlayerTurn) return;
    
    if (pattern.includes(idx)) {
        if (!userPattern.includes(idx)) {
            userPattern.push(idx);
            e.target.classList.add('correct');
            
            if (userPattern.length === pattern.length) {
                isPlayerTurn = false;
                document.getElementById("result").innerText = "🎉 Stage Mastered!";
                level++;
                document.getElementById("score").innerText = `Level: ${level}`;
                setTimeout(generatePattern, 1200);
            }
        }
    } else {
        isPlayerTurn = false;
        e.target.classList.add('wrong');
        document.getElementById("result").innerText = `❌ Failed! You made it to Level ${level}. Resetting...`;
        level = 1;
        document.getElementById("score").innerText = `Level: ${level}`;
        setTimeout(generatePattern, 2000);
    }
}

generatePattern();
// Add these functions to the top or bottom of Matrix.js to control storage
function updateLeaderboardUI() {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    const scores = JSON.parse(localStorage.getItem("matrix_leaderboard")) || [];
    list.innerHTML = scores.length === 0 ? "<li class='leaderboard-item' style='justify-content:center;'>No highscores yet!</li>" : "";
    
    scores.forEach((entry, idx) => {
        const li = document.createElement("li");
        li.className = "leaderboard-item";
        let rankClass = idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : idx === 2 ? "rank-3" : "";
        li.innerHTML = `<span class="${rankClass}">${idx + 1}. ${entry.name}</span> <strong>Level ${entry.score}</strong>`;
        list.appendChild(li);
    });
}

function checkAndSaveScore(finalScore) {
    let scores = JSON.parse(localStorage.getItem("matrix_leaderboard")) || [];
    const minScore = scores.length < 5 ? 0 : scores[scores.length - 1].score;
    
    if (finalScore > minScore || scores.length < 5) {
        // Delay slightly so the "Failed" screen shows up first
        setTimeout(() => {
            const name = prompt(`🎉 High Score! You reached Level ${finalScore}. Enter your initials/name (max 10 chars):`);
            if (name) {
                const cleanedName = name.trim().slice(0, 10) || "Anonymous";
                scores.push({ name: cleanedName, score: finalScore });
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 5); // Keep top 5
                localStorage.setItem("matrix_leaderboard", JSON.stringify(scores));
                updateLeaderboardUI();
            }
        }, 500);
    }
}

// Update handleTileClick to fire the checkAndSaveScore function on loss
function handleTileClick(e, idx) {
    if (!isPlayerTurn) return;
    
    if (pattern.includes(idx)) {
        if (!userPattern.includes(idx)) {
            userPattern.push(idx);
            e.target.classList.add('correct');
            
            if (userPattern.length === pattern.length) {
                isPlayerTurn = false;
                document.getElementById("result").innerText = "🎉 Stage Mastered!";
                level++;
                document.getElementById("score").innerText = `Level: ${level}`;
                setTimeout(generatePattern, 1200);
            }
        }
    } else {
        isPlayerTurn = false;
        e.target.classList.add('wrong');
        document.getElementById("result").innerText = `❌ Failed! You made it to Level ${level}. Resetting...`;
        
        // Save score check before resetting level variable
        checkAndSaveScore(level);
        
        level = 1;
        document.getElementById("score").innerText = `Level: ${level}`;
        setTimeout(generatePattern, 2000);
    }
}

// CRITICAL: Call this once at the bottom of the script to initially render lists
updateLeaderboardUI();