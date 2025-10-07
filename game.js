// =======================================================
// 1. 캔버스 및 초기 설정 (480x768 세로형 해상도)
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  // 480
const HEIGHT = canvas.height; // 768

// 기본 설정 상수
const BALL_SPEED_BASE = 4;
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75; 

// 난이도별 설정 정의 (Level 1이 기본 시작 난이도)
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
let level = 1; // 현재 설정된 난이도 레벨 (1, 2, 3)

// 상태 변수
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
    ping: new Audio('assets/sounds/ping.mp3'),
    crash: new Audio('assets/sounds/crash.wav'),
    gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3'),
    bgm01: new Audio('assets/sounds/bgm01.mp3'), 
    bgm02: new Audio('assets/sounds/bgm02.mp3') 
};

sounds.bgm01.loop = true;
sounds.bgm02.loop = true;

function playSound(name) {
    const audio = sounds[name];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("사운드 재생 실패:", e)); 
    }
}

// 벽돌 설정 변수
const brickRowCount = 5;    
const brickColumnCount = 8; 
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
let brickOffsetTop = 30;  
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (WIDTH - totalBrickAreaWidth) / 2; 

let bricks = [];
let bricksRemaining = 0;

// 파워업 설정
let powerups = [];
const POWERUP_PROBABILITY = 0.15; 

function Powerup(x, y) {
    this.x = x; this.y = y; this.radius = 8; this.dy = 1.5; 
    
    if (Math.random() < 0.5) {
        this.color = "yellow"; this.type = 'MULTIBALL'; 
    } else {
        this.color = "lime"; this.type = 'LONG_PADDLE';
    }
}

// 레벨별 벽돌 배치 패턴 정의 (총 40개)
const levelPatterns = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]
];

// 레벨에 맞는 벽돌 패턴 초기화
function initBricksForPattern(patternIndex) {
    const pattern = levelPatterns[(patternIndex - 1) % levelPatterns.length]; 
    bricksRemaining = 0;
    
    for(let c=0; c<brickColumnCount; c++) {
        bricks[c] = [];
        for(let r=0; r<brickRowCount; r++) {
            const index = r * brickColumnCount + c;
            const status = pattern[index];
            
            bricks[c][r] = { x: 0, y: 0, status: status };
            if (status === 1) {
                bricksRemaining++;
            }
        }
    }
}

// 벽돌 하강 로직
function descentBricks() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
            
            if (bricks[c][r].status === 1 && brickY + brickHeight >= HEIGHT - PADDLE_HEIGHT) {
                clearTimeout(descentTimer);
                sounds.bgm01.pause(); 
                sounds.bgm02.pause();
                playSound('gameOver'); 
                alert(`Game Over! 벽돌에 깔렸습니다! 최종 점수: ${score}`);
                document.location.reload();
                return;
            }
        }
    }
    brickOffsetTop += (brickHeight + brickPadding);
    descentTimer = setTimeout(descentBricks, descentInterval);
}


// =======================================================
// 3. 레벨 변경 및 게임 초기화 로직 (핵심)
// =======================================================

function resetGame(newLevel) {
    const config = LEVEL_CONFIGS[newLevel];
    
    // 1. 난이도 설정 적용
    level = newLevel;
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    
    // 2. 게임 상태 초기화
    lives = 3; 
    score = 0;
    balls = [];
    powerups = [];
    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
    brickOffsetTop = 30; // 벽돌 위치 초기화
    
    // 3. 공 생성 및 속도 적용
    balls.push({ x: WIDTH / 2, y: HEIGHT - 30, dx: speed, dy: -speed, radius: 8, color: "#FFDD00" });

    // 4. 벽돌 패턴 초기화
    initBricksForPattern(newLevel); 

    // 5. 타이머 리셋
    clearTimeout(descentTimer);
    descentTimer = setTimeout(descentBricks, descentInterval);
    
    // 6. BGM 전환
    sounds.bgm01.pause();
    sounds.bgm02.pause();
    if (isBgmPlaying) {
        (newLevel === 2 ? sounds.bgm02 : sounds.bgm01).play().catch(e => console.log("BGM 재생 실패:", e));
    }
}

// 버튼 클릭 시 호출되는 함수
function changeGameLevel(newLevel) {
    if (newLevel < 1 || newLevel > 3) return;
    
    const config = LEVEL_CONFIGS[newLevel];
    resetGame(newLevel);
    
    document.getElementById('currentLevelDisplay').innerText = `현재 레벨: ${config.name}`;
    alert(`${config.name}으로 난이도를 설정하고 게임을 다시 시작합니다!`);
}


// =======================================================
// 4. 이벤트 핸들러 및 그리기 함수 (로직 유지)
// =======================================================

document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
    
    if (relativeX > 0 && relativeX < WIDTH) {
        paddleX = relativeX - PADDLE_WIDTH / 2; 
        
        if (paddleX < 0) { paddleX = 0; }
        if (paddleX + PADDLE_WIDTH > WIDTH) { paddleX = WIDTH - PADDLE_WIDTH; }
    }
    
    if (!isBgmPlaying) {
        (level === 2 ? sounds.bgm02 : sounds.bgm01).play().catch(e => {
            console.log("BGM 자동 재생 차단됨. 첫 터치 후 재생 시작:", e);
        });
        isBgmPlaying = true;
    }
    
    e.preventDefault(); 
}

function drawBall(ball) { /* ... */ } 
function drawPaddle() { /* ... */ }
function drawBricks() { /* ... */ }
function drawScore() { /* ... */ }
function drawLives() { /* ... */ }
function drawPowerups() { /* ... */ }


// =======================================================
// 5. 파워업 로직 (롱패들, 멀티볼)
// =======================================================

function activateLongPaddle() {
    if (isLongPaddleActive) { clearTimeout(longPaddleTimer); }
    isLongPaddleActive = true;
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * 2; 
    playSound('powerup');
    paddleX = paddleX - (PADDLE_WIDTH / 4); 
    if (paddleX < 0) paddleX = 0;
    
    longPaddleTimer = setTimeout(() => {
        PADDLE_WIDTH = PADDLE_WIDTH_BASE; 
        isLongPaddleActive = false;
        paddleX = paddleX + (PADDLE_WIDTH_BASE / 2); 
        if (paddleX + PADDLE_WIDTH > WIDTH) paddleX = WIDTH - PADDLE_WIDTH;
    }, LONG_PADDLE_DURATION);
}

function activateMultiball() {
    const currentBallsCount = balls.length;
    for (let i = 0; i < currentBallsCount; i++) {
        let originalBall = balls[i]; 
        
        balls.push({ x: originalBall.x, y: originalBall.y, dx: originalBall.dx - 2, dy: originalBall.dy, radius: originalBall.radius, color: originalBall.color });
        balls.push({ x: originalBall.x, y: originalBall.y, dx: originalBall.dx + 2, dy: originalBall.dy, radius: originalBall.radius, color: originalBall.color });
    }
    playSound('powerup');
}

function powerupCollisionDetection() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let powerup = powerups[i];
        
        if (powerup.x > paddleX && powerup.x < paddleX + PADDLE_WIDTH && powerup.y + powerup.radius > HEIGHT - PADDLE_HEIGHT && powerup.y + powerup.radius < HEIGHT) {
            if (powerup.type === 'MULTIBALL') {
                activateMultiball();
            } else if (powerup.type === 'LONG_PADDLE') {
                activateLongPaddle();
            }
            powerups.splice(i, 1); 
        }
    }
}


// =======================================================
// 6. 충돌 처리 및 승리 조건 로직
// =======================================================

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        clearTimeout(descentTimer);
        let nextPattern = level + 1;
        
        sounds.bgm01.pause();
        sounds.bgm02.pause();

        if (nextPattern > levelPatterns.length) {
            playSound('gameOver'); 
            alert(`축하합니다! 최고 난이도 패턴(${level})까지 모두 클리어했습니다! 최종 점수: ${score}`);
            document.location.reload(); 
        } else {
            playSound('powerup'); 
            alert(`패턴 ${level} 클리어! 다음 패턴 ${nextPattern}로 넘어갑니다.`);
            
            // 다음 패턴으로 초기화 (난이도 설정은 유지)
            level = nextPattern; 
            initBricksForPattern(nextPattern);
            
            // 공 속도 설정은 현재 난이도(level)의 설정을 따름
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

function brickCollisionDetection(ball) { /* ... */ }

function ballWallAndPaddleCollision(ball, ballIndex) { /* ... */ }


// =======================================================
// 7. 메인 루프 및 시작
// =======================================================
let animationId;

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // ✨ 모든 그리기 함수를 호출
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

// 게임 시작: Level 1 (Easy) 설정으로 초기화하고 시작
resetGame(1);
draw();
