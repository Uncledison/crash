// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');

if (!canvas) {
    console.error("Fatal Error: Canvas element not found.");
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
const createSafeAudio = (path) => { /* ... */ return { play: () => {}, pause: () => {}, loop: false, currentTime: 0 }; };
const sounds = {
    ping: createSafeAudio('assets/sounds/ping.mp3'), crash: createSafeAudio('assets/sounds/crash.wav'), gameOver: createSafeAudio('assets/sounds/game_over.wav'),
    powerup: createSafeAudio('assets/sounds/powerup.mp3'), bgm01: createSafeAudio('assets/sounds/bgm01.mp3'), bgm02: createSafeAudio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true; sounds.bgm02.loop = true;

function playSound(name) { /* ... */ }

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
// 4. 이벤트 핸들러 및 그리기 함수 (최종 단순화)
// =======================================================

document.addEventListener('mousemove', mouseMoveHandler, false); 
document.addEventListener('touchmove', touchMoveHandler, false);

function mouseMoveHandler(e) { /* ... */ }
function touchMoveHandler(e) { /* ... */ }

// ✨ drawBall 함수 (단순 단색 원)
function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFDD00"; // 밝은 노란색
    ctx.fill();
    ctx.closePath();
}

// ✨ drawPaddle 함수 (단순 단색 사각형)
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = isLongPaddleActive ? "#FF4500" : "#0095DD"; 
    ctx.fill();
    ctx.closePath();
}

// ✨ drawBricks 함수 (단순 단색 사각형)
function drawBricks() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            if(bricks[c] && bricks[c][r] && bricks[c][r].status === 1) { 
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                
                // 줄별 HSL 색상 사용 (가장 단순한 형태)
                const hue = 360 / brickRowCount * r;
                ctx.fillStyle = `hsl(${hue}, 80%, 50%)`; 
                
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + score, 8, 20);
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Lives: " + lives, WIDTH - 65, 20);
}

function drawPowerups() {
    for (const p of powerups) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.closePath();
    }
}


// =======================================================
// 5. 충돌 처리 로직 (생략)
// =======================================================
function activateLongPaddle() { /* ... */ }
function activateMultiball(ball) { /* ... */ }
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
    // 캔버스 초기화 (가장 안전한 방법)
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // 오브젝트 그리기
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

// 이벤트 리스너 추가
document.addEventListener('mousemove', mouseMoveHandler, false); 
document.addEventListener('touchmove', touchMoveHandler, false);

initializeAndStartGame();
