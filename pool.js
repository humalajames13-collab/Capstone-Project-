const canvas = document.getElementById("poolCanvas");
const ctx = canvas.getContext("2d");

// Physics & Engine Scaling Constants
const BALL_RADIUS = 10;
const POCKET_RADIUS = 22;
const FRICTION = 0.985;

let gameMode = "bot"; 
let botDifficulty = "medium"; 
let currentPlayer = 1;
let playerAssignments = { 1: null, 2: null }; 
let balls = [];
let pockets = [];
let cueStick = { angle: 0, power: 0, maxPower: 30, isDragging: false };
let isMoving = false;
let gameOver = false;
let turnFoulOccurred = false;
let firstBallHitThisTurn = null;
let ballsPocketedThisTurn = [];

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

        if (Math.abs(this.vx) < 0.05) this.vx = 0;
        if (Math.abs(this.vy) < 0.05) this.vy = 0;

        // Boundary Cushion Collisions
        if (this.x < BALL_RADIUS) { this.x = BALL_RADIUS; this.vx *= -1; }
        if (this.x > canvas.width - BALL_RADIUS) { this.x = canvas.width - BALL_RADIUS; this.vx *= -1; }
        if (this.y < BALL_RADIUS) { this.y = BALL_RADIUS; this.vy *= -1; }
        if (this.y > canvas.height - BALL_RADIUS) { this.y = canvas.height - BALL_RADIUS; this.vy *= -1; }
    }

    draw() {
        if (this.isPocketed) return;

        // Ball Shadow Drop
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y + 2, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();

        // Solid Base Render
        ctx.beginPath();
        ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Striped Layer Decal
        if (this.isStriped) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, BALL_RADIUS, -Math.PI/4, Math.PI/4);
            ctx.lineTo(this.x - Math.cos(Math.PI/4)*BALL_RADIUS, this.y + Math.sin(Math.PI/4)*BALL_RADIUS);
            ctx.arc(this.x, this.y, BALL_RADIUS, 3*Math.PI/4, 5*Math.PI/4);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.stroke();
        }

        // Inner Number Plate
        if (this.number !== 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, BALL_RADIUS * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            ctx.fillStyle = "#000000";
            ctx.font = "bold 8px Poppins";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.number, this.x, this.y + 0.5);
        } else {
            // Shiny highlight accent on Cue Ball
            ctx.beginPath();
            ctx.arc(this.x - 3, this.y - 3, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fill();
        }
    }
}

function initPockets() {
    pockets = [
        { x: 0, y: 0 }, { x: canvas.width / 2, y: -2 }, { x: canvas.width, y: 0 },
        { x: 0, y: canvas.height }, { x: canvas.width / 2, y: canvas.height + 2 }, { x: canvas.width, y: canvas.height }
    ];
}

function initBalls() {
    balls = [];
    gameOver = false;
    currentPlayer = 1;
    playerAssignments = { 1: null, 2: null };
    
    // Cue Ball Index [0]
    balls.push(new Ball(canvas.width * 0.25, canvas.height / 2, 0, "#ffffff"));

    const ballConfig = [
        { num: 1, col: "#fbbf24", str: false },  { num: 9, col: "#fbbf24", str: true },
        { num: 7, col: "#b91c1c", str: false },  { num: 8, col: "#111827", str: false },
        { num: 14, col: "#1d4ed8", str: true },  { num: 2, col: "#1d4ed8", str: false },
        { num: 10, col: "#10b981", str: true },  { num: 15, col: "#b91c1c", str: true },
        { num: 3, col: "#ef4444", str: false },  { num: 11, col: "#f97316", str: true },
        { num: 4, col: "#7c3aed", str: false },  { num: 12, col: "#7c3aed", str: true },
        { num: 5, col: "#f97316", str: false },  { num: 13, col: "#10b981", str: false },
        { num: 6, col: "#047857", str: false }
    ];

    let configIndex = 0;
    const startX = canvas.width * 0.7;
    const startY = canvas.height / 2;
    const rowGap = BALL_RADIUS * 1.75;

    for (let r = 0; r < 5; r++) {
        let x = startX + r * rowGap;
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

    const p2Label = gameMode === "bot" ? "Bot" : "Player 2";
    p1Display.innerText = `Player 1: ${getAssignText(1)}`;
    p2Display.innerText = `${p2Label}: ${getAssignText(2)}`;

    p1Display.classList.toggle("active", currentPlayer === 1);
    p2Display.classList.toggle("active", currentPlayer === 2);

    if (gameOver) return;
    statusDisplay.innerText = `Turn: ${currentPlayer === 1 ? "Player 1" : (gameMode === "bot" ? "Bot (AI)" : "Player 2")}`;
}

function checkCollisions() {
    // Ball-to-Ball Elastic Impact Physics
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
                    b1.vx -= nx * p;
                    b1.vy -= ny * p;
                    b2.vx += nx * p;
                    b2.vy += ny * p;
                }
            }
        }
    }

    // Checking Pocket Triggers
    balls.forEach(ball => {
        if (ball.isPocketed) return;
        pockets.forEach(pocket => {
            if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < POCKET_RADIUS) {
                ball.isPocketed = true;
                ball.vx = 0;
                ball.vy = 0;
                ballsPocketedThisTurn.push(ball);
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
        cueBall.vx = 0;
        cueBall.vy = 0;
        turnFoulOccurred = true;
        statusDisplay.innerHTML = "⚠️ Cue Ball Scratched! Foul Called.";
    }

    let targetType = playerAssignments[currentPlayer];
    let opponentPlayer = currentPlayer === 1 ? 2 : 1;
    let switchTurn = true;

    // Check if the 8-Ball was sunk
    let eightBall = balls.find(b => b.number === 8);
    if (eightBall.isPocketed) {
        gameOver = true;
        let remainingTargets = balls.filter(b => b.number !== 0 && b.number !== 8 && !b.isPocketed && 
            (targetType === "solids" ? !b.isStriped : b.isStriped));

        if (remainingTargets.length === 0 && !cueScratched) {
            statusDisplay.innerHTML = `🎉 Player ${currentPlayer} Wins the match!`;
        } else {
            statusDisplay.innerHTML = `❌ Player ${currentPlayer} Lose! Sunk 8-ball early or fouled. Player ${opponentPlayer} wins!`;
        }
        return;
    }

    // Rule Verification Processing
    if (!turnFoulOccurred && firstBallHitThisTurn) {
        if (targetType && ((targetType === "solids" && firstBallHitThisTurn.isStriped) || 
                           (targetType === "stripes" && !firstBallHitThisTurn.isStriped && firstBallHitThisTurn.number !== 8))) {
            turnFoulOccurred = true;
        }
    } else if (!firstBallHitThisTurn && !cueScratched) {
        turnFoulOccurred = true; 
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
        setTimeout(executeBotTurn, 1000);
    }
}

// Bot Angle Calculation Routine Engine
function executeBotTurn() {
    if (gameOver) return;
    let cueBall = balls[0];
    let targetType = playerAssignments[2];

    let legalTargets = balls.filter(b => !b.isPocketed && b.number !== 0 && b.number !== 8 &&
        (!targetType || (targetType === "solids" ? !b.isStriped : b.isStriped))
    );

    if (legalTargets.length === 0) {
        legalTargets.push(balls.find(b => b.number === 8));
    }

    let chosenTarget = legalTargets[Math.floor(Math.random() * legalTargets.length)];
    let targetPocket = pockets[Math.floor(Math.random() * pockets.length)];

    // Path targeting optimization checks for Medium and Hard tiers
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
    
    // Inaccuracy margin deviations based on selected bot difficulty
    let errorRange = botDifficulty === "easy" ? 0.25 : botDifficulty === "medium" ? 0.08 : 0.015;
    let finalAngle = angleToTarget + (Math.random() * errorRange - errorRange / 2);
    let chosenPower = botDifficulty === "easy" ? 12 : 18;
    
    cueBall.vx = Math.cos(finalAngle) * chosenPower;
    cueBall.vy = Math.sin(finalAngle) * chosenPower;
    isMoving = true;
}

// Input and Coordinate Scale Normalizations
let canvasBounds = canvas.getBoundingClientRect();
window.addEventListener("resize", () => { canvasBounds = canvas.getBoundingClientRect(); });

function getMousePos(e) {
    return {
        x: ((e.clientX - canvasBounds.left) / canvasBounds.width) * canvas.width,
        y: ((e.clientY - canvasBounds.top) / canvasBounds.height) * canvas.height
    };
}

canvas.addEventListener("mousemove", (e) => {
    if (isMoving || gameOver || (gameMode === "bot" && currentPlayer === 2)) return;
    let mouse = getMousePos(e);
    let cueBall = balls[0];
    
    cueStick.angle = Math.atan2(mouse.y - cueBall.y, mouse.x - cueBall.x);
    
    if (cueStick.isDragging) {
        let dist = Math.hypot(mouse.x - cueBall.x, mouse.y - cueBall.y);
        cueStick.power = Math.min(cueStick.maxPower, Math.max(0, dist / 10));
    }
});

canvas.addEventListener("mousedown", (e) => {
    if (isMoving || gameOver || (gameMode === "bot" && currentPlayer === 2)) return;
    if (e.button === 0) cueStick.isDragging = true;
});

canvas.addEventListener("mouseup", (e) => {
    if (!cueStick.isDragging) return;
    cueStick.isDragging = false;

    if (cueStick.power > 1) {
        let cueBall = balls[0];
        cueBall.vx = -Math.cos(cueStick.angle) * cueStick.power;
        cueBall.vy = -Math.sin(cueStick.angle) * cueStick.power;
        isMoving = true;
    }
    cueStick.power = 0;
});

// Canvas Context Loop Tick
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#022c22";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#0f172a";
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

    balls.forEach(ball => ball.draw());

    // Draw Aiming Guide Overlays
    if (!isMoving && !gameOver && !(gameMode === "bot" && currentPlayer === 2)) {
        let cueBall = balls[0];
        
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x - Math.cos(cueStick.angle) * 120, cueBall.y - Math.sin(cueStick.angle) * 120);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]); 

        let distanceMultiplier = 15 + cueStick.power * 2;
        let stickStartX = cueBall.x + Math.cos(cueStick.angle) * distanceMultiplier;
        let stickStartY = cueBall.y + Math.sin(cueStick.angle) * distanceMultiplier;
        let stickEndX = cueBall.x + Math.cos(cueStick.angle) * (distanceMultiplier + 160);
        let stickEndY = cueBall.y + Math.sin(cueStick.angle) * (distanceMultiplier + 160);

        ctx.beginPath();
        ctx.moveTo(stickStartX, stickStartY);
        ctx.lineTo(stickEndX, stickEndY);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgb(${210 - cueStick.power * 4}, 140, 80)`;
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
    canvasBounds = canvas.getBoundingClientRect();
    initPockets();
    initBalls();
}

initGameSetup();
gameLoop();