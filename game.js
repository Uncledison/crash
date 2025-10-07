// =======================================================
// 1. 캔버스 및 초기 설정 (Canvas 크기 강제 설정 포함)
// =======================================================
const canvas = document.getElementById('myGameCanvas');

if (!canvas) {
    console.error("Fatal Error: Canvas element not found. Check index.html ID='myGameCanvas'.");
    alert("오류: Canvas 요소를 찾을 수 없습니다. index.html 파일을 점검해 주세요.");
    throw new Error("Canvas element not found."); 
}

// 🚨 HTML 속성으로 설정된 width와 height가 확실히 적용되도록 강제 설정
// (CSS나 기타 환경적 요인으로 인해 0이 되는 것을 방지)
canvas.width = 480; 
canvas.height = 768;

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
// 2. 사운드 및 벽돌 설정 (사운드 로딩 안전 장치 추가)
// =======================================================

// 🚨 사운드 파일 로딩 실패 시 JS가 멈추지 않도록 안전하게 Audio 객체를 생성
const createSafeAudio = (path) => {
    try {
        const audio = new Audio(path);
        // 오디오 로딩 중 오류가 발생하면 콘솔에 경고만 띄우고 JS 실행은 계속함
        audio.onerror = () => console.warn(`Sound file failed to load: ${path}`);
        return audio;
    } catch (e) {
        console.warn(`Could not create Audio object for ${path}: ${e.message}`);
        // 실패 시 더미 객체 반환
        return { play: () => {}, pause: () => {}, loop: false, currentTime: 0 }; 
    }
};

const sounds = {
    ping: createSafeAudio('assets/sounds/ping.mp3'), 
    crash: createSafeAudio('assets/sounds/crash.wav'), 
    gameOver: createSafeAudio('assets/sounds/game_over.wav'),
    powerup: createSafeAudio('assets/sounds/powerup.mp3'), 
    bgm01: createSafeAudio('assets/sounds/bgm01.mp3'), 
    bgm02: createSafeAudio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true; sounds.bgm02.loop = true;

function playSound(name) {
    const audio = sounds[name];
    if (audio && audio.play) { 
        audio.currentTime = 0; 
        audio.play().catch(e => console.log(`Sound playback failed for ${name}:`, e)); 
    }
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
    lives = 3; 
    score = 0;
    balls = [];
    powerups = [];
    brickOffsetTop = 30; 
    
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    
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

function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 15; 
    ctx.shadowColor = ball.color;
    ctx.fill();
    ctx.closePath();
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; 
    ctx.shadowBlur = 0; 
    ctx.fill();
    ctx.closePath();
    
    ctx.shadowBlur = 0; 
}

function drawPaddle() {
    const gradient = ctx.createLinearGradient(paddleX, HEIGHT - PADDLE_HEIGHT, paddleX + PADDLE_WIDTH, HEIGHT);
    gradient.addColorStop(0, "#C0C0C0"); 
    gradient.addColorStop(0.5, "#4B4B4B"); 
    gradient.addColorStop(1, "#C0C0C0");

    ctx.beginPath();
    ctx.rect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
}

function drawBricks() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            if(bricks[c][r].status === 1) { 
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

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00FFFF"; 
    ctx.fillText("Score: " + score, 8, 20);
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00FFFF"; 
    ctx.fillText("Lives: " + lives, WIDTH - 65, 20);
}

function drawPowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        if (p.type === 'LONG_PADDLE') {
            const w = p.radius * 3;
            const h = p.radius * 0.8;
            ctx.beginPath();
            ctx.rect(p.x - w / 2, p.y - h / 2, w, h);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.closePath();
        } else { // MULTIBALL
            const r = p.radius * 0.5;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
            ctx.beginPath(); ctx.arc(p.x - r, p.y - r, r, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
            ctx.beginPath(); ctx.arc(p.x + r, p.y - r, r, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
        }
        
        ctx.shadowBlur = 0; 
        p.y += p.dy;
        
        if (p.y - p.radius > HEIGHT) {
            powerups.splice(i, 1);
        }
    }
}


// =======================================================
// 5. 충돌 처리 로직 (생략)
// =======================================================
function activateLongPaddle() { /* ... */ }
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }
function checkWinCondition() { /* ... */ }

function brickCollisionDetection(ball) {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ball.x + ball.radius > b.x && 
                    ball.x - ball.radius < b.x + brickWidth && 
                    ball.y + ball.radius > b.y && 
                    ball.y - ball.radius < b.y + brickHeight) 
                {
                    b.status = 0; 
                    score++; 
                    playSound('ping'); 
                    
                    const prevX = ball.x - ball.dx;
                    const prevY = ball.y - ball.dy;
                    
                    if (prevX <= b.x || prevX >= b.x + brickWidth) {
                        ball.dx = -ball.dx; 
                    } else {
                        ball.dy = -ball.dy; 
                    }
                    
                    if (Math.random() < POWERUP_PROBABILITY) {
                        powerups.push(new Powerup(b.x + brickWidth/2, b.y + brickHeight));
                    }
                    
                    checkWinCondition(); 
                    return; 
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
    // Canvas를 매번 지워줍니다.
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
        
        // 공 위치 업데이트
        ball.x += ball.dx; 
        ball.y += ball.dy; 
    }
    
    powerupCollisionDetection();

    animationId = requestAnimationFrame(draw);
}

// 🚨 게임 시작 통합 함수 (Canvas 객체 검증 후 실행)
function initializeAndStartGame() {
    if (canvas) {
        // 모든 초기화 실행
        resetGame(1); 
        // 하강 타이머 시작
        descentTimer = setTimeout(descentBricks, descentInterval);
        // 그리기 루프 시작
        draw();
    }
}

initializeAndStartGame();
