// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  // 480
const HEIGHT = canvas.height; // 768

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
// 2. 사운드 및 벽돌 설정
// =======================================================
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'), crash: new Audio('assets/sounds/crash.wav'), gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3'), bgm01: new Audio('assets/sounds/bgm01.mp3'), bgm02: new Audio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true; sounds.bgm02.loop = true;

function playSound(name) {
    const audio = sounds[name];
    if (audio) { audio.currentTime = 0; audio.play().catch(e => console.log("사운드 재생 실패:", e)); }
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
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    
    lives = 3; score = 0; balls = []; powerups = [];
    paddleX = (WIDTH - PADDLE_WIDTH) / 2; brickOffsetTop = 30; 
    
    balls.push({ x: WIDTH / 2, y: HEIGHT - 30, dx: speed, dy: -speed, radius: 8, color: "#FFDD00" });
    initBricksForPattern(newLevel); 
    
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
// 4. 이벤트 핸들러 및 그리기 함수
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
// 5. 파워업 로직
// =======================================================
function activateLongPaddle() { /* ... */ }
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }


// =======================================================
// 6. 충돌 처리 및 로직
// =======================================================

function checkWinCondition() { /* ... */ }
function brickCollisionDetection(ball) { /* ... */ }

// ✨ 볼 충돌 로직 최종 수정
function ballWallAndPaddleCollision(ball, ballIndex) {
    // 1. 좌/우 벽 충돌 (튕김 로직)
    if (ball.x + ball.dx > WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
        playSound('ping');
    }
    
    // 2. 상단 벽 충돌 (사라짐 로직 - 사용자 요청 반영)
    if (ball.y + ball.dy < ball.radius) {
        // 공이 상단 벽을 넘어섰으므로, 공을 제거하고 생명 감소 처리로 이동
        balls.splice(ballIndex, 1);
        handleBallLoss();
        return; 
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

// 공 손실 처리 로직 통합 함수 (중복 코드를 줄이고 안정성 향상)
function handleBallLoss() {
    if (balls.length === 0) {
        lives--;
        if (!lives) {
            clearTimeout(descentTimer); 
            sounds.bgm01.pause(); sounds.bgm02.pause(); playSound('gameOver'); 
            alert("GAME OVER! 최종 점수: " + score);
            document.location.reload(); 
        } else {
            // 공 재생성
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

// 게임 시작 통합 함수 (초기화 안정화)
function initializeAndStartGame() {
    resetGame(1); 
    descentTimer = setTimeout(descentBricks, descentInterval);
    draw();
}

initializeAndStartGame();
