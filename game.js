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

// Canvas 크기 강제 설정 (안정성)
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

function Powerup(x, y) { /* ... */ }
const levelPatterns = [ /* ... */ ];

function initBricksForPattern(patternIndex) { /* ... */ }
function descentBricks() { /* ... */ }


// =======================================================
// 3. 레벨 변경 및 게임 초기화 로직 (생략)
// =======================================================
function resetGame(newLevel) { /* ... */ }
function changeGameLevel(newLevel) { /* ... */ }


// =======================================================
// 4. 이벤트 핸들러 및 그리기 함수 (생략)
// =======================================================
document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) { /* ... */ }
function drawBall(ball) { /* ... */ }
function drawPaddle() { /* ... */ }
function drawBricks() { /* ... */ }
function drawScore() { /* ... */ }
function drawLives() { /* ... */ }
function drawPowerups() { /* ... */ }


// =======================================================
// 5. 충돌 처리 로직
// =======================================================
function activateLongPaddle() { /* ... */ }
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }
function checkWinCondition() { /* ... */ }
function brickCollisionDetection(ball) { /* ... */ }

function ballWallAndPaddleCollision(ball, ballIndex) {
    // 1. 좌/우 벽 충돌 (튕김)
    if (ball.x + ball.dx > WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
        playSound('ping');
    }
    
    // 2. 상단 벽 충돌 (✨ 상단 벽을 뚫고 사라지는 오류 해결: 튕김으로 복구)
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy; // 방향 반전
        playSound('ping');
    } 
    
    // 3. 패들 충돌
    else if (ball.y + ball.dy > HEIGHT - ball.radius - PADDLE_HEIGHT) { 
        if (ball.x > paddleX && ball.x < paddleX + PADDLE_WIDTH) { 
            if (ball.y < HEIGHT - PADDLE_HEIGHT) {
                ball.dy = -ball.dy; 
                playSound('crash'); 
                
                const relativeIntersectX = (ball.x - (paddleX + PADDLE_WIDTH / 2));
                ball.dx = relativeIntersectX * 0.2; 
            }
        } 
        // 4. 바닥 충돌 (공 손실 처리)
        else if (ball.y + ball.dy > HEIGHT + ball.radius) { 
            balls.splice(ballIndex, 1); 
            handleBallLoss();
        }
    }
}

function handleBallLoss() {
    if (balls.length === 0) {
        lives--;
        if (!lives) {
            clearTimeout(descentTimer); 
            sounds.bgm01.pause(); sounds.bgm02.pause(); playSound('gameOver'); 
            alert("GAME OVER! 최종 점수: " + score);
            document.location.reload(); 
        } else {
            const config = LEVEL_CONFIGS[level];
            const speed = BALL_SPEED_BASE * config.speed_ratio;
            balls.push({x: WIDTH / 2, y: HEIGHT - 30, dx: speed, dy: -speed, radius: 8, color: "#FFDD00"});
            paddleX = (WIDTH - PADDLE_WIDTH) / 2;
        }
    }
}


// =======================================================
// 7. 메인 루프 및 시작 (Final)
// =======================================================
let animationId;

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    drawBricks();
    drawPaddle();
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
