const canvas = document.getElementById("poolCanvas");
const ctx = canvas.getContext("2d");

// Physics & Tuning Constants
const BALL_RADIUS = 12;
const POCKET_RADIUS = 24;
const FRICTION = 0.988; 
const ELASTICITY = 0.99; 

let gameMode = "bot"; 
let botDifficulty = "medium"; 
let currentPlayer = 1;
let playerAssignments = { 1: null, 2: null }; 
let balls = [];
let pockets = [];
let isMoving = false;
let gameOver = false;
let turnFoulOccurred = false;
let firstBallHitThisTurn = null;
let ballsPocketedThisTurn = [];

// Boundless Dragging State
let cueStick = { 
    angle: 0, 
    power: 0, 
    maxPower: 45, 
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
};

// Particle Engine Effects
let particles = [];
function spawnPocketParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 3 + 2,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

// DOM Bindings
const modeSelect = document.getElementById("game-mode");
const difficultySelect = document.getElementById("bot-difficulty");
const diffLabel = document.getElementById("difficulty-label");
const restartBtn = document.getElementById("restart-btn");
const p1Display = document.getElementById("p1-display");
const p2Display = document.getElementById("p2-display");
const statusDisplay = document.getElementById("game-status");

class Ball {
    constructor(x, y, number, color, isStriped = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.number = number;
        this.color = color;
        this.isStriped = isStriped;
        this.isPocketed = false;
    }

    update() {
        if (this.isPocketed) return;
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        if (Math.abs(this.vx) < 0.04) this.vx = 0;
        if (Math.abs(this.vy) < 0.04) this.vy = 0;

        // Cushion Physics
        if (this.x < BALL_RADIUS) { this.x = BALL_RADIUS; this.vx *= -ELASTICITY; }
        if (this.x > canvas.width - BALL_RADIUS) { this.x = canvas.width - BALL_RADIUS; this.vx *= -ELASTICITY; }
        if (this.y < BALL_RADIUS) { this.y = BALL_RADIUS; this.vy *= -ELASTICITY; }
        if (this.y > canvas.height - BALL_RADIUS) { this.y = canvas.height - BALL_RADIUS; this.vy *= -ELASTICITY; }
    }

    draw() {
        if (this.isPocketed) return;

        // Ball Shadow
        ctx.beginPath();
        ctx.arc(this.x + 3, this.y + 4, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fill();

        // Base Layer
        ctx.beginPath();
        ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Striped Pattern Skinning
        if (this.isStriped) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(this.x - BALL_RADIUS, this.y - BALL_RADIUS * 0.45, BALL_RADIUS * 2, BALL_RADIUS * 0.9);
            ctx.restore();
        }

        // Inner Number Plate
        if (this.number !== 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, BALL_RADIUS * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            ctx.fillStyle = "#1e293b";
            ctx.font = `bold ${BALL_RADIUS * 0.7}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.number, this.x, this.y + 0.5);
        }

        // 3D Spherical Lighting Map Overlay
        let gradient = ctx.createRadialGradient(
            this.x - BALL_RADIUS * 0.3, this.y - BALL_RADIUS * 0.3, 1,
            this.x, this.y, BALL_RADIUS
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.1)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

function initPockets() {
    const offset = 4;
    pockets = [
        { x: offset, y: offset }, 
        { x: canvas.width / 2, y: 0 }, 
        { x: canvas.width - offset, y: offset },
        { x: offset, y: canvas.height - offset }, 
        { x: canvas.width / 2, y: canvas.height }, 
        { x: canvas.width - offset, y: canvas.height - offset }
    ];
}

function initBalls() {
    balls = [];
    gameOver = false;
    currentPlayer = 1;
    playerAssignments = { 1: null, 2: null };
    
    // Cue Ball
    balls.push(new Ball(canvas.width * 0.25, canvas.height / 2, 0, "#f8fafc"));

    // Pro Triangle Setup Layout
    const ballConfig = [
        { num: 1, col: "#eab308", str: false },
        { num: 9, col: "#eab308", str: true },  { num: 7, col: "#dc2626", str: false },
        { num: 14, col: "#2563eb", str: true }, { num: 8, col: "#0f172a", str: false }, { num: 2, col: "#2563eb", str: false },
        { num: 10, col: "#10b981", str: true }, { num: 15, col: "#dc2626", str: true },  { num: 3, col: "#ef4444", str: false }, { num: 11, col: "#f97316", str: true },
        { num: 4, col: "#8b5cf6", str: false }, { num: 12, col: "#8b5cf6", str: true },  { num: 5, col: "#f97316", str: false }, { num: 13, col: "#10b981", str: false }, { num: 6, col: "#059669", str: false }
    ];

    let configIndex = 0;
    const startX = canvas.width * 0.68;
    const startY = canvas.height / 2;
    const spacingX = BALL_RADIUS * 1.732; 

    for (let r = 0; r < 5; r++) {
        let x = startX + r * spacingX;
        let yStart = startY - (r * BALL_RADIUS);
        for (let c = 0; c <= r; c++) {
            let y = yStart + c * (BALL_RADIUS * 2);
            let cfg = ballConfig[configIndex++];
            balls.push(new Ball(x, y, cfg.num, cfg.col, cfg.str));
        }
    }
    updateUI();
}

function updateUI() {
    const getAssignText = (pNum) => {
        if (!playerAssignments[pNum]) return "Undecided";
        return playerAssignments[pNum] === "solids" ? "🔴 Solids" : "🟡 Stripes";
    };

    const p2Label = gameMode === "bot" ? "🏠 Bot" : "👥 Player 2";
    p1Display.innerText = `👤 Player 1: ${getAssignText(1)}`;
    p2Display.innerText = `${p2Label}: ${getAssignText(2)}`;

    p1Display.classList.toggle("active", currentPlayer === 1);
    p2Display.classList.toggle("active", currentPlayer === 2);

    if (gameOver) return;
    statusDisplay.innerHTML = `Current Strike: <strong>${currentPlayer === 1 ? "Player 1" : (gameMode === "bot" ? "The Bot" : "Player 2")}</strong>`;
}

function checkCollisions() {
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            let b1 = balls[i];
            let b2 = balls[j];
            if (b1.isPocketed || b2.isPocketed) continue;

            let dx = b2.x - b1.x;
            let dy = b2.y - b1.y;
            let dist = Math.hypot(dx, dy);

            if (dist < BALL_RADIUS * 2) {
                let overlap = (BALL_RADIUS * 2) - dist;
                let nx = dx / dist;
                let ny = dy / dist;

                b1.x -= nx * (overlap / 2);
                b1.y -= ny * (overlap / 2);
                b2.x += nx * (overlap / 2);
                b2.y += ny * (overlap / 2);

                if (b1.number === 0 && firstBallHitThisTurn === null) firstBallHitThisTurn = b2;
                if (b2.number === 0 && firstBallHitThisTurn === null) firstBallHitThisTurn = b1;

                let kx = b1.vx - b2.vx;
                let ky = b1.vy - b2.vy;
                let p = nx * kx + ny * ky;

                if (p > 0) {
                    b1.vx -= nx * p * ELASTICITY;
                    b1.vy -= ny * p * ELASTICITY;
                    b2.vx += nx * p * ELASTICITY;
                    b2.vy += ny * p * ELASTICITY;
                }
            }
        }
    }

    balls.forEach(ball => {
        if (ball.isPocketed) return;
        pockets.forEach(pocket => {
            if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < POCKET_RADIUS * 0.9) {
                ball.isPocketed = true;
                ball.vx = 0; ball.vy = 0;
                ballsPocketedThisTurn.push(ball);
                spawnPocketParticles(ball.x, ball.y, ball.color);
            }
        });
    });
}

function evaluateTurnRules() {
    let cueBall = balls[0];
    let cueScratched = cueBall.isPocketed;

    if (cueScratched) {
        cueBall.isPocketed = false;
        cueBall.x = canvas.width * 0.25;
        cueBall.y = canvas.height / 2;
        cueBall.vx = 0; cueBall.vy = 0;
        turnFoulOccurred = true;
        statusDisplay.innerHTML = "💥 <strong>Scratch!</strong> Ball returned to kitchen.";
    }

    let targetType = playerAssignments[currentPlayer];
    let opponentPlayer = currentPlayer === 1 ? 2 : 1;
    let switchTurn = true;

    let eightBall = balls.find(b => b.number === 8);
    if (eightBall.isPocketed) {
        gameOver = true;
        let remainingTargets = balls.filter(b => b.number !== 0 && b.number !== 8 && !b.isPocketed && 
            (targetType === "solids" ? !b.isStriped : b.isStriped));

        if (remainingTargets.length === 0 && !cueScratched) {
            statusDisplay.innerHTML = `🏆 🎉 <strong>Player ${currentPlayer} Wins!</strong>`;
        } else {
            statusDisplay.innerHTML = `❌ <strong>Game Over!</strong> Illegal 8-ball pocket. Player ${opponentPlayer} wins!`;
        }
        return;
    }

    if (!turnFoulOccurred && firstBallHitThisTurn) {
        if (targetType && ((targetType === "solids" && firstBallHitThisTurn.isStriped) || 
                           (targetType === "stripes" && !firstBallHitThisTurn.isStriped && firstBallHitThisTurn.number !== 8))) {
            turnFoulOccurred = true;
            statusDisplay.innerHTML = "⚠️ <strong>Foul!</strong> Hit opponent ball group first.";
        }
    } else if (!firstBallHitThisTurn && !cueScratched) {
        turnFoulOccurred = true; 
        statusDisplay.innerHTML = "⚠️ <strong>Foul!</strong> Completely missed target array.";
    }

    let legalBallsPocketed = ballsPocketedThisTurn.filter(b => b.number !== 0 && b.number !== 8);
    
    if (!playerAssignments[1] && legalBallsPocketed.length > 0 && !turnFoulOccurred) {
        let chosenType = legalBallsPocketed[0].isStriped ? "stripes" : "solids";
        playerAssignments[currentPlayer] = chosenType;
        playerAssignments[opponentPlayer] = chosenType === "solids" ? "stripes" : "solids";
    }

    if (legalBallsPocketed.length > 0 && !turnFoulOccurred) {
        let scoredOwnType = legalBallsPocketed.some(b => 
            targetType === "solids" ? !b.isStriped : b.isStriped
        );
        if (scoredOwnType || !targetType) {
            switchTurn = false; 
        }
    }

    if (switchTurn) currentPlayer = opponentPlayer;

    firstBallHitThisTurn = null;
    ballsPocketedThisTurn = [];
    turnFoulOccurred = false;
    updateUI();

    if (gameMode === "bot" && currentPlayer === 2 && !gameOver) {
        setTimeout(executeBotTurn, 1400);
    }
}

function executeBotTurn() {
    if (gameOver) return;
    let cueBall = balls[0];
    let targetType = playerAssignments[2];

    let legalTargets = balls.filter(b => !b.isPocketed && b.number !== 0 && b.number !== 8 &&
        (!targetType || (targetType === "solids" ? !b.isStriped : b.isStriped))
    );

    if (legalTargets.length === 0) legalTargets.push(balls.find(b => b.number === 8));

    let chosenTarget = legalTargets[Math.floor(Math.random() * legalTargets.length)];
    let targetPocket = pockets[Math.floor(Math.random() * pockets.length)];

    if (botDifficulty !== "easy" && chosenTarget) {
        let bestTarget = chosenTarget;
        let minDistance = Infinity;
        
        legalTargets.forEach(t => {
            pockets.forEach(p => {
                let dist = Math.hypot(p.x - t.x, p.y - t.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestTarget = t;
                    targetPocket = p;
                }
            });
        });
        chosenTarget = bestTarget;
    }

    let angleToTarget = Math.atan2(chosenTarget.y - cueBall.y, chosenTarget.x - cueBall.x);
    
    // Dynamic difficulty tuning based on selection value paths
    let errorRange = botDifficulty === "easy" ? 0.22 : botDifficulty === "medium" ? 0.07 : 0.01;
    let finalAngle = angleToTarget + (Math.random() * errorRange - errorRange / 2);
    let chosenPower = botDifficulty === "easy" ? 14 : botDifficulty === "medium" ? 22 : 28;
    
    cueBall.vx = Math.cos(finalAngle) * chosenPower;
    cueBall.vy = Math.sin(finalAngle) * chosenPower;
    isMoving = true;
}

// Unlimited Screen Boundaries Pointer Logic
function handlePointerMove(clientX, clientY) {
    if (isMoving || gameOver || (gameMode === "bot" && currentPlayer === 2)) return;
    
    let cueBall = balls[0];
    let rect = canvas.getBoundingClientRect();
    
    let currentX = ((clientX - rect.left) / rect.width) * canvas.width;
    let currentY = ((clientY - rect.top) / rect.height) * canvas.height;

    if (!cueStick.isDragging) {
        cueStick.angle = Math.atan2(currentY - cueBall.y, currentX - cueBall.x);
    } else {
        let dx = clientX - cueStick.dragStartX;
        let dy = clientY - cueStick.dragStartY;
        let pullDistance = Math.hypot(dx, dy);
        
        cueStick.power = Math.min(cueStick.maxPower, Math.max(0, pullDistance / 7));
        let dragAngle = Math.atan2(dy, dx);
        cueStick.angle = dragAngle + Math.PI; 
    }
}

window.addEventListener("mousemove", (e) => {
    handlePointerMove(e.clientX, e.clientY);
});

canvas.addEventListener("mousedown", (e) => {
    if (isMoving || gameOver || (gameMode === "bot" && currentPlayer === 2)) return;
    if (e.button === 0) {
        cueStick.isDragging = true;
        cueStick.dragStartX = e.clientX;
        cueStick.dragStartY = e.clientY;
        cueStick.power = 0;
    }
});

window.addEventListener("mouseup", (e) => {
    if (!cueStick.isDragging) return;
    cueStick.isDragging = false;

    if (cueStick.power > 1.5) {
        let cueBall = balls[0];
        cueBall.vx = -Math.cos(cueStick.angle) * cueStick.power;
        cueBall.vy = -Math.sin(cueStick.angle) * cueStick.power;
        isMoving = true;
    }
    cueStick.power = 0;
});

function gameLoop() {
    // Canvas Backdrop
    ctx.fillStyle = "#0f766e"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Canvas Rails
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#115e59";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Canvas Pockets
    pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#022c22";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#042f2e";
        ctx.stroke();
    });

    let currentlyMoving = false;
    balls.forEach(ball => {
        ball.update();
        if (ball.vx !== 0 || ball.vy !== 0) currentlyMoving = true;
    });

    checkCollisions();

    if (isMoving && !currentlyMoving) {
        isMoving = false;
        evaluateTurnRules();
    }
    isMoving = currentlyMoving;

    // Draw Elements
    balls.forEach(ball => ball.draw());

    // Particles Render Loop Updates
    particles.forEach((p, index) => {
        p.x += p.vx; p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
        }
    });

    // Cue Stick Overlays Rendering
    if (!isMoving && !gameOver && !(gameMode === "bot" && currentPlayer === 2)) {
        let cueBall = balls[0];
        
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x - Math.cos(cueStick.angle) * 260, cueBall.y - Math.sin(cueStick.angle) * 260);
        ctx.strokeStyle = cueStick.isDragging ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.15)";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]); 

        let gapOffset = 14 + cueStick.power * 1.5;
        let stickStartX = cueBall.x + Math.cos(cueStick.angle) * gapOffset;
        let stickStartY = cueBall.y + Math.sin(cueStick.angle) * gapOffset;
        let stickEndX = cueBall.x + Math.cos(cueStick.angle) * (gapOffset + 180);
        let stickEndY = cueBall.y + Math.sin(cueStick.angle) * (gapOffset + 180);

        ctx.beginPath();
        ctx.moveTo(stickStartX, stickStartY);
        ctx.lineTo(stickEndX, stickEndY);
        ctx.lineWidth = 5;
        ctx.strokeStyle = `rgb(${220 - cueStick.power * 3}, 155, 95)`;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(stickStartX, stickStartY);
        ctx.lineTo(cueBall.x + Math.cos(cueStick.angle) * (gapOffset + 10), cueBall.y + Math.sin(cueStick.angle) * (gapOffset + 10));
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#f8fafc";
        ctx.stroke();
    }

    requestAnimationFrame(gameLoop);
}

modeSelect.addEventListener("change", (e) => {
    gameMode = e.target.value;
    diffLabel.style.display = gameMode === "bot" ? "inline-block" : "none";
    initGameSetup();
});

difficultySelect.addEventListener("change", (e) => {
    botDifficulty = e.target.value;
});

restartBtn.addEventListener("click", initGameSetup);

function initGameSetup() {
    initPockets();
    initBalls();
}

initGameSetup();
gameLoop();
let totalShotsTaken = 0; // Add near your line 13 variable blocks

window.addEventListener("mouseup", (e) => {
    if (!cueStick.isDragging) return;
    cueStick.isDragging = false;

    if (cueStick.power > 1.5) {
        let cueBall = balls[0];
        cueBall.vx = -Math.cos(cueStick.angle) * cueStick.power;
        cueBall.vy = -Math.sin(cueStick.angle) * cueStick.power;
        isMoving = true;
        
        // Increment user shots tracker if player 1 fires
        if (currentPlayer === 1) {
            totalShotsTaken++;
        }
    }
    cueStick.power = 0;
});

function updateLeaderboardUI() {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    const scores = JSON.parse(localStorage.getItem("pool_leaderboard")) || [];
    list.innerHTML = scores.length === 0 ? "<li class='leaderboard-item' style='justify-content:center;'>No records yet!</li>" : "";
    
    scores.forEach((entry, idx) => {
        const li = document.createElement("li");
        li.className = "leaderboard-item";
        let rankClass = idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : idx === 2 ? "rank-3" : "";
        li.innerHTML = `<span class="${rankClass}">${idx + 1}. ${entry.name}</span> <strong>${entry.score} Shots</strong>`;
        list.appendChild(li);
    });
}

function checkAndSavePoolScore(finalShots) {
    // Only track solo victories against AI bots
    if (gameMode !== "bot") return; 
    let scores = JSON.parse(localStorage.getItem("pool_leaderboard")) || [];
    const maxShots = scores.length < 5 ? Infinity : scores[scores.length - 1].score;
    
    if (finalShots < maxShots || scores.length < 5) {
        setTimeout(() => {
            const name = prompt(`🏆 Class Champion! You beat the bot in only ${finalShots} shots! Enter your name:`);
            if (name) {
                const cleanedName = name.trim().slice(0, 10) || "Anonymous";
                scores.push({ name: cleanedName, score: finalShots });
                scores.sort((a, b) => a.score - b.score); // Lower shots are better!
                scores = scores.slice(0, 5);
                localStorage.setItem("pool_leaderboard", JSON.stringify(scores));
                updateLeaderboardUI();
            }
        }, 600);
    }
}

// Modify the eightBall.isPocketed match logic inside evaluateTurnRules():
if (eightBall.isPocketed) {
    gameOver = true;
    let remainingTargets = balls.filter(b => b.number !== 0 && b.number !== 8 && !b.isPocketed && 
        (targetType === "solids" ? !b.isStriped : b.isStriped));

    if (remainingTargets.length === 0 && !cueScratched) {
        statusDisplay.innerHTML = `🏆 🎉 <strong>Player ${currentPlayer} Wins!</strong>`;
        // If Player 1 wins legal game vs bot, check score criteria
        if (currentPlayer === 1) {
            checkAndSavePoolScore(totalShotsTaken);
        }
    } else {
        statusDisplay.innerHTML = `❌ <strong>Game Over!</strong> Illegal 8-ball pocket. Player ${opponentPlayer} wins!`;
    }
    return;
}

// Run leaderboard UI loading sequence at bottom of script
updateLeaderboardUI();