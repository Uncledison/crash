// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');

if (!canvas) {
    console.error("Fatal Error: Canvas element not found. Check index.html ID='myGameCanvas'.");
    throw new Error("Canvas element not found. Check index.html ID='myGameCanvas'."); 
}

const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;  
const HEIGHT = canvas.height; 

canvas.width = 480; 
canvas.height = 768;

// 기본 설정 상수 및 레벨 설정
const BALL_SPEED_BASE = 4;
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75; 

const LEVEL_CONFIGS = [
    null,
    { name: "Level 1 (Easy)", paddle_ratio: 2.0, speed_ratio: 1.0 },
    { name: "Level 2 (Normal)", paddle_ratio: 1.0, speed_ratio: 1.5 },
    { name: "Level 3 (Hard)", paddle_ratio: 0.8, speed_ratio: 2.0 }
];

let balls = [];
let PADDLE_WIDTH = PADDLE_WIDTH_BASE; 
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;
let level = 1; 

let isBgmPlaying = false; 
let isLongPaddleActive = false;
let longPaddleTimer = null;
const LONG_PADDLE_DURATION = 10000;
let descentInterval = 10000;
let descentTimer = null;


// =======================================================
// 2. 사운드 및 벽돌 설정 (생략)
// =======================================================
const createSafeAudio = (path) => {
    try {
        const audio = new Audio(path);
        audio.onerror = () => console.warn(`Sound file failed to load: ${path}`);
        return audio;
    } catch (e) {
        console.warn(`Could not create Audio object for ${path}: ${e.message}`);
        return { play: () => {}, pause: () => {}, loop: false, currentTime: 0 }; 
    }
};

const sounds = {
    ping: createSafeAudio('assets/sounds/ping.mp3'), crash: createSafeAudio('assets/sounds/crash.wav'), gameOver: createSafeAudio('assets/sounds/game_over.wav'),
    powerup: createSafeAudio('assets/sounds/powerup.mp3'), bgm01: createSafeAudio('assets/sounds/bgm01.mp3'), bgm02: createSafeAudio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true; sounds.bgm02.loop = true;

function playSound(name) {
    const audio = sounds[name];
    if (audio && audio.play) { audio.currentTime = 0; audio.play().catch(e => console.log(`Sound playback failed for ${name}:`, e)); }
}

const brickRowCount = 5; const brickColumnCount = 8; const brickWidth = 50;
const brickHeight = 15; const brickPadding = 10;
let brickOffsetTop = 30;  
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (WIDTH - totalBrickAreaWidth) / 2; 

let bricks = []; let bricksRemaining = 0;
let powerups = []; const POWERUP_PROBABILITY = 0.15; 

function Powerup(x, y) {
    this.x = x; this.y = y; this.radius = 8; this.dy = 1.5; 
    if (Math.random() < 0.5) { this.color = "yellow"; this.type = 'MULTIBALL'; } 
    else { this.color = "lime"; this.type = 'LONG_PADDLE'; }
}

const levelPatterns = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]
];

function initBricksForPattern(patternIndex) {
    const pattern = levelPatterns[(patternIndex - 1) % levelPatterns.length]; 
    bricksRemaining = 0;
    bricks = []; // ✨ bricks 배열을 여기서 다시 초기화 (안정성)
    for(let c=0; c<brickColumnCount; c++) {
        bricks[c] = [];
        for(let r=0; r<brickRowCount; r++) {
            const index = r * brickColumnCount + c;
            bricks[c][r] = { x: 0, y: 0, status: pattern[index] };
            if (pattern[index] === 1) { bricksRemaining++; }
        }
    }
}

function descentBricks() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
            if (bricks[c][r].status === 1 && brickY + brickHeight >= HEIGHT - PADDLE_HEIGHT) {
                clearTimeout(descentTimer);
                sounds.bgm01.pause(); sounds.bgm02.pause(); playSound('gameOver'); 
                alert(`Game Over! 벽돌에 깔렸습니다! 최종 점수: ${score}`);
                document.location.reload(); return;
            }
        }
    }
    brickOffsetTop += (brickHeight + brickPadding);
    descentTimer = setTimeout(descentBricks, descentInterval);
}


// =======================================================
// 3. 레벨 변경 및 게임 초기화 로직
// =======================================================

function resetGame(newLevel) {
    const config = LEVEL_CONFIGS[newLevel];
    
    level = newLevel;
    lives = 3; 
    score = 0;
    balls = [];
    powerups = [];
    brickOffsetTop = 30; 
    
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    
    // ✨ 벽돌 및 공 생성 (가장 중요)
    initBricksForPattern(newLevel); 
    balls.push({ x: WIDTH / 2, y: HEIGHT - 30, dx: speed, dy: -speed, radius: 8, color: "#FFDD00" });
    
    clearTimeout(descentTimer);
    sounds.bgm01.pause(); sounds.bgm02.pause();
    if (isBgmPlaying) {
        (newLevel === 2 ? sounds.bgm02 : sounds.bgm01).play().catch(e => console.log("BGM 재생 실패:", e));
    }
}

function changeGameLevel(newLevel) {
    if (newLevel < 1 || newLevel > 3) return;
    const config = LEVEL_CONFIGS[newLevel];
    resetGame(newLevel);
    descentTimer = setTimeout(descentBricks, descentInterval); 
    document.getElementById('currentLevelDisplay').innerText = `현재 레벨: ${config.name}`;
    alert(`${config.name}으로 난이도를 설정하고 게임을 다시 시작합니다!`);
}


// =======================================================
// 4. 이벤트 핸들러 및 그리기 함수 (생략)
// =======================================================

function touchMoveHandler(e) { /* ... */ }
function drawBall(ball) { /* ... */ }
function drawPaddle() { /* ... */ }
function drawBricks() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            if(bricks[c] && bricks[c][r] && bricks[c][r].status === 1) { // ✨ Null/Undefined 체크 강화
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                const hue = 360 / brickRowCount * r;
                
                const gradBrick = ctx.createLinearGradient(brickX, brickY, brickX, brickY + brickHeight);
                gradBrick.addColorStop(0, `hsl(${hue}, 80%, 75%)`); 
                gradBrick.addColorStop(0.5, `hsl(${hue}, 80%, 50%)`); 
                gradBrick.addColorStop(1, `hsl(${hue}, 80%, 35%)`); 

                ctx.fillStyle = gradBrick;
                ctx.fill();
                ctx.strokeStyle = "#000000"; 
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

function drawScore() { /* ... */ }
function drawLives() { /* ... */ }
function drawPowerups() { /* ... */ }


// =======================================================
// 5. 충돌 처리 로직 (생략)
// =======================================================
function activateLongPaddle() { /* ... */ }
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }
function checkWinCondition() { /* ... */ }
function brickCollisionDetection(ball) { /* ... */ }
function ballWallAndPaddleCollision(ball, ballIndex) { /* ... */ }
function handleBallLoss() { /* ... */ }


// =======================================================
// 7. 메인 루프 및 시작 (Final)
// =======================================================
let animationId;

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    drawBricks(); // ✨ 블록 그리기
    drawPaddle(); // ✨ 패들 그리기
    drawScore();
    drawLives();
    drawPowerups();

    for (let i = balls.length - 1; i >= 0; i--) {
        let ball = balls[i];
        
        drawBall(ball);
        brickCollisionDetection(ball);
        ballWallAndPaddleCollision(ball, i);
        
        ball.x += ball.dx; 
        ball.y += ball.dy; 
    }
    
    powerupCollisionDetection();

    animationId = requestAnimationFrame(draw);
}

// 게임 시작 통합 함수
function initializeAndStartGame() {
    if (canvas) {
        resetGame(1); 
        descentTimer = setTimeout(descentBricks, descentInterval);
        draw();
    }
}

initializeAndStartGame();
