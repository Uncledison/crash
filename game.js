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
const createSafeAudio = (path) => { /* ... */ return { play: () => {}, pause: () => {}, loop: false, currentTime: 0 }; };
const sounds = { /* ... */ };
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
// 4. 이벤트 핸들러 및 그리기 함수 (업데이트)
// =======================================================
document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);
document.addEventListener('mousemove', mouseMoveHandler, false); 

function touchMoveHandler(e) { /* ... */ }
function mouseMoveHandler(e) { /* ... */ }

// ✨ 볼 디자인: 불꽃 및 광채 효과 적용
function drawBall(ball) {
    // 1. 외부 광채/불꽃 (넓고 투명하게)
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FF4500"; // 주황색 불꽃 외곽
    ctx.shadowBlur = 12; 
    ctx.shadowColor = "#FF8C00"; // 주황색/노란색 그림자
    ctx.fill();
    ctx.closePath();
    
    // 2. 내부 코어 (작고 밝은 불꽃 중심)
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFF66"; // 밝은 노란색 중심
    ctx.shadowBlur = 0; 
    ctx.fill();
    ctx.closePath();
    
    ctx.shadowBlur = 0; 
}

function drawPaddle() { /* ... */ }
function drawBricks() { /* ... */ }
function drawScore() { /* ... */ }
function drawLives() { /* ... */ }
function drawPowerups() { /* ... */ }


// =======================================================
// 5. 충돌 처리 및 로직 (생략)
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
    // ✨ 잔상(Trail) 효과 추가: 캔버스 전체를 반투명한 사각형으로 덮어 씌움
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // 투명도 0.2의 검은색
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
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

initializeAndStartGame();
