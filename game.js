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
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'), crash: new Audio('assets/sounds/crash.wav'), gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3'), bgm01: new Audio('assets/sounds/bgm01.mp3'), bgm02: new Audio('assets/sounds/bgm02.mp3') 
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
// 3. 레벨 변경 및 게임 초기화 로직
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
// 5. 파워업 및 충돌 처리 로직 (수정)
// =======================================================
function activateLongPaddle() { /* ... */ }
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        clearTimeout(descentTimer);
        let nextPattern = level + 1;
        sounds.bgm01.pause(); sounds.bgm02.pause();

        if (nextPattern > levelPatterns.length) {
            playSound('gameOver'); 
            alert(`축하합니다! 최고 난이도 패턴(${level})까지 모두 클리어했습니다! 최종 점수: ${score}`);
            document.location.reload(); 
        } else {
            playSound('powerup'); 
            alert(`패턴 ${level} 클리어! 다음 패턴 ${nextPattern}로 넘어갑니다.`);
            
            level = nextPattern; 
            initBricksForPattern(nextPattern);
            
            const config = LEVEL_CONFIGS[level];
            const speed = BALL_SPEED_BASE * config.speed_ratio;
            
            balls = [{x: WIDTH / 2, y: HEIGHT - 30, dx: speed, dy: -speed, radius: 8, color: "#FFDD00"}];
            paddleX = (WIDTH - PADDLE_WIDTH) / 2;
            brickOffsetTop = 30;
            
            (level === 2 ? sounds.bgm02 : sounds.bgm01).play();
            descentTimer = setTimeout(descentBricks, descentInterval);
        }
    }
}

// ✨ 벽돌 관통 오류 해결: 충돌 검사를 현재 위치와 경계로만 판단합니다.
function brickCollisionDetection(ball) {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                // 볼의 중심이 벽돌의 경계 내에 있는지 확인
                if (ball.x + ball.radius > b.x && 
                    ball.x - ball.radius < b.x + brickWidth && 
                    ball.y + ball.radius > b.y && 
                    ball.y - ball.radius < b.y + brickHeight) 
                {
                    // 벽돌 파괴 및 방향 반전
                    b.status = 0; 
                    score++; 
                    playSound('ping'); 
                    
                    // 충돌 위치에 따라 dy 또는 dx 반전 (더 정확한 충돌 처리)
                    const prevX = ball.x - ball.dx;
                    const prevY = ball.y - ball.dy;
                    
                    if (prevX <= b.x || prevX >= b.x + brickWidth) {
                        ball.dx = -ball.dx; // 좌우 충돌
                    } else {
                        ball.dy = -ball.dy; // 상하 충돌
                    }
                    
                    if (Math.random() < POWERUP_PROBABILITY) {
                        powerups.push(new Powerup(b.x + brickWidth/2, b.y + brickHeight));
                    }
                    
                    checkWinCondition(); 
                    return; // 한 프레임에 하나의 벽돌만 깨도록 처리
                }
            }
        }
    }
}

function ballWallAndPaddleCollision(ball, ballIndex) {
    // 1. 좌/우 벽 충돌 (튕김)
    if (ball.x + ball.dx > WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
        playSound('ping');
    }
    
    // 2. 상단 벽 충돌 (사라짐 - 사용자 요청)
    if (ball.y + ball.dy < ball.radius) {
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

function handleBallLoss() { /* ... */ }


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
        // ✨ 공 움직임은 충돌 검사 후에 실행되어야 합니다.
        ballWallAndPaddleCollision(ball, i); 
        
        ball.x += ball.dx; // ✨ 공 이동
        ball.y += ball.dy; // ✨ 공 이동
    }
    
    powerupCollisionDetection();

    animationId = requestAnimationFrame(draw);
}

function initializeAndStartGame() {
    if (canvas) {
        resetGame(1); 
        descentTimer = setTimeout(descentBricks, descentInterval);
        draw();
    }
}

initializeAndStartGame();
