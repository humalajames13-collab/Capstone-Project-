const canvas = document.getElementById("soccerCanvas");
const ctx = canvas.getContext("2d");

// Physics Constants
const GRAVITY = 0.5;
const GROUND_Y = 440; // Adjusted for 500px canvas height

// Scores
let p1Score = 0;
let p2Score = 0;

// Game Settings
let gameMode = "bot"; // "bot" or "friend"

// Cooldown Trackers (Gravity Blasts)
let p1LastBlast = 0;
let p2LastBlast = 0;
const BLAST_COOLDOWN = 3000;

// Slime Characters Setup
const p1 = {
    x: 200, y: GROUND_Y, vx: 0, vy: 0,
    radius: 50, color: "#3b82f6",
    speed: 8, jumpForce: -11.5,
    jumpsLeft: 2, isGrounded: false
};

const p2 = {
    x: 800, y: GROUND_Y, vx: 0, vy: 0,
    radius: 50, color: "#f97316",
    speed: 8, jumpForce: -11.5,
    jumpsLeft: 2, isGrounded: false
};

const ball = {
    x: 500, y: 150, vx: 0, vy: 0,
    radius: 20, elastic: 0.78,
    rotation: 0, spin: 0
};

// Larger Goal Framework Positions
const goals = {
    y: 240, width: 60, height: 200
};

// Input Management System
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    
    // Player 1 Jumps
    if ((e.code === "KeyW") && p1.jumpsLeft > 0) {
        p1.vy = p1.jumpForce;
        p1.jumpsLeft--;
        p1.isGrounded = false;
    }
    
    // Player 2 Local Friend Jumps
    if ((e.code === "ArrowUp") && gameMode === "friend" && p2.jumpsLeft > 0) {
        p2.vy = p2.jumpForce;
        p2.jumpsLeft--;
        p2.isGrounded = false;
    }

    // Ability Cast Triggers
    if (e.code === "Space") triggerBlastP1();
    if (e.code === "Enter" && gameMode === "friend") triggerBlastP2();
});
window.addEventListener("keyup", e => { keys[e.code] = false; });

// DOM elements
const modeSelect = document.getElementById("game-mode");
const restartBtn = document.getElementById("restart-btn");
const p1Display = document.getElementById("player-score");
const p2Display = document.getElementById("cpu-score");
const statusDiv = document.getElementById("game-status");

modeSelect.addEventListener("change", (e) => {
    gameMode = e.target.value;
    p2Display.innerText = gameMode === "bot" ? "BOT (ORANGE): 0" : "P2 (ORANGE): 0";
    resetMatch();
});
restartBtn.addEventListener("click", resetMatch);

function triggerBlastP1() {
    const now = Date.now();
    if (now - p1LastBlast < BLAST_COOLDOWN) return;

    let dx = ball.x - p1.x;
    let dy = ball.y - p1.y;
    let distance = Math.hypot(dx, dy);

    if (distance < 200) {
        p1LastBlast = now;
        let angle = Math.atan2(dy, dx);
        let force = (200 - distance) * 0.16 + 12;
        ball.vx = Math.cos(angle) * force;
        ball.vy = Math.sin(angle) * force - 3;
        ball.spin = ball.vx * 0.04;
        flashStatus("💥 P1 SHOCKWAVE BLAST!", "blast-charging");
    }
}

function triggerBlastP2() {
    const now = Date.now();
    if (now - p2LastBlast < BLAST_COOLDOWN) return;

    let dx = ball.x - p2.x;
    let dy = ball.y - p2.y;
    let distance = Math.hypot(dx, dy);

    if (distance < 200) {
        p2LastBlast = now;
        let angle = Math.atan2(dy, dx);
        let force = (200 - distance) * 0.16 + 12;
        ball.vx = Math.cos(angle) * force;
        ball.vy = Math.sin(angle) * force - 3;
        ball.spin = ball.vx * 0.04;
        flashStatus("💥 P2 SHOCKWAVE BLAST!", "blast-charging");
    }
}

function flashStatus(text, className) {
    statusDiv.innerText = text;
    statusDiv.className = className;
}

function resetMatch() {
    p1Score = 0; p2Score = 0;
    p1Display.innerText = `P1 (BLUE): 0`;
    p2Display.innerText = gameMode === "bot" ? `BOT (ORANGE): 0` : `P2 (ORANGE): 0`;
    kickoffReset();
}

function kickoffReset(scoringSide) {
    ball.x = 500;
    ball.y = 120;
    ball.vx = scoringSide === "p1" ? 5 : scoringSide === "p2" ? -5 : (Math.random() > 0.5 ? 4 : -4);
    ball.vy = -4;
    ball.spin = 0;

    p1.x = 200; p1.y = GROUND_Y; p1.vx = 0; p1.vy = 0;
    p2.x = 800; p2.y = GROUND_Y; p2.vx = 0; p2.vy = 0;
}

function runHardAI() {
    // Prediction Engine: Hard Bot tracks ball position + future velocity vectors
    let predictedBallX = ball.x + (ball.vx * 1.8);
    let ballDist = Math.hypot(ball.x - p2.x, ball.y - p2.y);

    // AI Position Anchoring
    if (ball.x < 450) {
        // If the ball is deep in Player 1 territory, anchor near the midline to prevent long-shots
        p2.targetX = Math.max(600, ball.x + 220);
    } else {
        // Aggressive offensive tracking when the ball is on its side
        p2.targetX = predictedBallX;
    }

    // Run Movement execution
    if (p2.x < p2.targetX - 8) p2.vx = p2.speed;
    else if (p2.x > p2.targetX + 8) p2.vx = -p2.speed;
    else p2.vx = 0;

    // Hard AI Jumper Intelligence (Intercepts air balls & shuts down loops)
    if (ball.x > 450 && ball.y < p2.y - 50 && p2.isGrounded) {
        let xDist = Math.abs(ball.x - p2.x);
        if (xDist < 120) {
            p2.vy = p2.jumpForce;
            p2.isGrounded = false;
        }
    }
    // Hard AI Double-Jump logic if the ball remains overhead
    if (!p2.isGrounded && p2.jumpsLeft > 0 && ball.y < p2.y - 40 && p2.vy > -2) {
        p2.vy = p2.jumpForce * 0.9;
        p2.jumpsLeft--;
    }
}

function updateGameObjects() {
    // P1 Keyboard Controls
    if (keys["KeyA"]) p1.vx = -p1.speed;
    else if (keys["KeyD"]) p1.vx = p1.speed;
    else p1.vx = 0;

    // Apply P1 Physics
    p1.vy += GRAVITY; p1.x += p1.vx; p1.y += p1.vy;
    if (p1.y >= GROUND_Y) { p1.y = GROUND_Y; p1.vy = 0; p1.jumpsLeft = 2; p1.isGrounded = true; }
    if (p1.x - p1.radius < 0) p1.x = p1.radius;
    if (p1.x + p1.radius > canvas.width) p1.x = canvas.width - p1.radius;

    // P2 Control Routing (Friend Mode vs Hard AI Engine)
    if (gameMode === "friend") {
        if (keys["ArrowLeft"]) p2.vx = -p2.speed;
        else if (keys["ArrowRight"]) p2.vx = p2.speed;
        else p2.vx = 0;
    } else {
        runHardAI();
    }

    // Apply P2 Physics
    p2.vy += GRAVITY; p2.x += p2.vx; p2.y += p2.vy;
    if (p2.y >= GROUND_Y) { p2.y = GROUND_Y; p2.vy = 0; p2.jumpsLeft = 2; p2.isGrounded = true; }
    if (p2.x - p2.radius < 0) p2.x = p2.radius;
    if (p2.x + p2.radius > canvas.width) p2.x = canvas.width - p2.radius;

    // Ball Gravity & Acceleration
    ball.vy += GRAVITY * 0.75;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.rotation += ball.spin;
    ball.vx *= 0.994; // Premium low drag air resistance

    // Bounce off Ceiling/Ground
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= -ball.elastic; }
    if (ball.y + ball.radius > GROUND_Y + 15) { 
        ball.y = GROUND_Y + 15 - ball.radius; 
        ball.vy *= -ball.elastic; 
        ball.vx *= 0.985;
        ball.spin = ball.vx * 0.05;
    }

    // Side Pitch Wall Rebound (Only applies if the ball is ABOVE the goals)
    if (ball.y < goals.y) {
        if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= -ball.elastic; ball.spin *= -1; }
        if (ball.x + ball.radius > canvas.width) { ball.x = canvas.width - ball.radius; ball.vx *= -ball.elastic; ball.spin *= -1; }
    } else {
        // Goal crossbar rim impacts
        if (ball.y <= goals.y + 6 && ball.y >= goals.y - 6) {
            if (ball.x <= goals.width && ball.vx < 0) { ball.vy *= -1; ball.y = goals.y - 7; }
            if (ball.x >= canvas.width - goals.width && ball.vx > 0) { ball.vy *= -1; ball.y = goals.y - 7; }
        }
    }

    // Dynamic Slime Physical Arc Impacts
    handleSlimeCollision(p1);
    handleSlimeCollision(p2);

    // Goal Line Verification
    if (ball.y >= goals.y) {
        if (ball.x + ball.radius >= canvas.width) {
            p1Score++;
            p1Display.innerText = `P1 (BLUE): ${p1Score}`;
            flashStatus("⚡ GOAL FOR PLAYER 1!", "blast-ready");
            kickoffReset("p2");
        } else if (ball.x - ball.radius <= 0) {
            p2Score++;
            p2Display.innerText = gameMode === "bot" ? `BOT (ORANGE): ${p2Score}` : `P2 (ORANGE): ${p2Score}`;
            flashStatus(gameMode === "bot" ? "🤖 THE BOT SCORED!" : "⚡ GOAL FOR PLAYER 2!", "blast-ready");
            kickoffReset("p1");
        }
    }
}

function handleSlimeCollision(slime) {
    let dx = ball.x - slime.x;
    let dy = ball.y - slime.y;
    let distance = Math.hypot(dx, dy);
    let minDist = slime.radius + ball.radius;

    if (distance < minDist && ball.y <= slime.y) {
        let angle = Math.atan2(dy, dx);
        ball.x = slime.x + Math.cos(angle) * minDist;
        ball.y = slime.y + Math.sin(angle) * minDist;

        let impulse = Math.hypot(slime.vx, slime.vy) * 0.45;
        ball.vx = Math.cos(angle) * (8 + impulse);
        ball.vy = Math.sin(angle) * (8 + impulse);
        ball.spin = ball.vx * 0.06;
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Arena Markings
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(500, 0); ctx.lineTo(500, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.arc(500, 300, 100, 0, Math.PI * 2); ctx.stroke();

    // Goal Boxes HTML Nets
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.fillRect(0, goals.y, goals.width, goals.height);
    ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
    ctx.fillRect(canvas.width - goals.width, goals.y, goals.width, goals.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 4;
    ctx.strokeRect(0, goals.y, goals.width, goals.height);
    ctx.strokeRect(canvas.width - goals.width, goals.y, goals.width, goals.height);

    // Deep Pitch Field floor
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, GROUND_Y + 15, canvas.width, canvas.height - GROUND_Y);

    // Draw P1 (Blue Slime)
    ctx.fillStyle = p1.color;
    ctx.beginPath(); ctx.arc(p1.x, p1.y, p1.radius, Math.PI, 0, false); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p1.x + 20, p1.y - 25, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(p1.x + 22, p1.y - 25, 4, 0, Math.PI * 2); ctx.fill();

    // Draw P2 / Bot (Orange Slime)
    ctx.fillStyle = p2.color;
    ctx.beginPath(); ctx.arc(p2.x, p2.y, p2.radius, Math.PI, 0, false); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p2.x - 20, p2.y - 25, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(p2.x - 22, p2.y - 25, 4, 0, Math.PI * 2); ctx.fill();

    // Spinning Soccer Ball Construction
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, 0, ball.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#020617"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#1e293b";
    for(let i=0; i<5; i++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath(); ctx.fillRect(-4, -ball.radius + 5, 8, 6); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function gameLoop() {
    updateGameObjects();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Start Game
gameLoop();