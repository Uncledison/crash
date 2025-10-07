// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  
const HEIGHT = canvas.height; 

// 기본 설정 상수
const BALL_SPEED_BASE = 4;
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75; 

// 난이도별 설정 정의
const LEVEL_CONFIGS = [
    null,
    { name: "Level 1 (Easy)", paddle_ratio: 2.0, speed_ratio: 1.0 },
    { name: "Level 2 (Normal)", paddle_ratio: 1.0, speed_ratio: 1.5 },
    { name: "Level 3 (Hard)", paddle_ratio: 0.8, speed_ratio: 2.0 }
];

// 게임 상태 변수
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
// 2. 사운드 및 벽돌 설정 (생략: 이전과 동일)
// =======================================================
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'), crash: new Audio('assets/sounds/crash.wav'), gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3'), bgm01: new Audio('assets/sounds/bgm01.mp3'), bgm02: new Audio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true; sounds.bgm02.loop = true;
function playSound(name) { /* ... */ }

// 벽돌 설정 변수
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

function initBricksForPattern(patternIndex) { /* ... */ }
function descentBricks() { /* ... */ }


// =======================================================
// 3. 레벨 변경 및 초기화 로직 (생략: 이전과 동일)
// =======================================================

function resetGame(newLevel) { /* ... */ }
function changeGameLevel(newLevel) { /* ... */ }


// =======================================================
// 4. 이벤트 핸들러 및 그리기 함수 (디자인 업그레이드)
// =======================================================

document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) { /* ... */ }

// ✨ 볼 디자인: 에너지 코어 효과 적용
function drawBall(ball) {
    // 1. 외부 광채/그림자
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 15; // 더 넓은 광채
    ctx.shadowColor = ball.color;
    ctx.fill();
    ctx.closePath();
    
    // 2. 내부 코어 (더 작고 밝은 원)
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; // 코어는 흰색
    ctx.shadowBlur = 0; // 코어는 그림자 없음
    ctx.fill();
    ctx.closePath();
    
    // 그림자 초기화 (캔버스 전체에 영향을 주지 않도록)
    ctx.shadowBlur = 0; 
}

function drawPaddle() { /* ... */ } // 이전과 동일 (그라데이션 유지)
function drawBricks() { /* ... */ } // 이전과 동일 (그라데이션 및 테두리 유지)
function drawScore() { /* ... */ } 
function drawLives() { /* ... */ } 

// ✨ 아이템 디자인: 기능에 맞는 모양 적용
function drawPowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        if (p.type === 'LONG_PADDLE') {
            // 롱 패들: 가로로 긴 캡슐 모양
            const w = p.radius * 3;
            const h = p.radius * 0.8;
            ctx.beginPath();
            ctx.rect(p.x - w / 2, p.y - h / 2, w, h);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.closePath();
        } else { // MULTIBALL
            // 멀티볼: 작은 원 3개가 모인 형태
            const r = p.radius * 0.5;
            ctx.fillStyle = p.color;
            
            // 중앙 원
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
            // 좌측 상단 원
            ctx.beginPath(); ctx.arc(p.x - r, p.y - r, r, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
            // 우측 상단 원
            ctx.beginPath(); ctx.arc(p.x + r, p.y - r, r, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
        }
        
        ctx.shadowBlur = 0; // 그림자 초기화
        p.y += p.dy;
        
        if (p.y - p.radius > HEIGHT) {
            powerups.splice(i, 1);
        }
    }
}


// =======================================================
// 5. 충돌 처리 및 메인 루프 (생략: 이전과 동일)
// =======================================================

function activateLongPaddle() { /* ... */ }
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }
function checkWinCondition() { /* ... */ }
function brickCollisionDetection(ball) { /* ... */ }
function ballWallAndPaddleCollision(ball, ballIndex) { /* ... */ }


let animationId;
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // 모든 그리기 함수 호출
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

// 게임 시작
resetGame(1);
draw();
