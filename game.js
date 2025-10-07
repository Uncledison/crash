// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  
const HEIGHT = canvas.height; 

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

// 레벨별 벽돌 배치 패턴 정의
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

// 벽돌 하강 로직 (버그 수정 없음)
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
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio; // 패들 폭 설정
    const speed = BALL_SPEED_BASE * config.speed_ratio; // 공 속도 설정
    
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

    // 5. 타이머 리셋 및 재설정
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
// 4. 이벤트 핸들러 및 그리기 함수 (전체 복구)
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
    ctx.shadowBlur = 10; 
    ctx.shadowColor = ball.color;
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
        let powerup = powerups[i];
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2);
        ctx.fillStyle = powerup.color;
        ctx.fill();
        ctx.closePath();
        
        powerup.y += powerup.dy;
        
        if (powerup.y - powerup.radius > HEIGHT) {
            powerups.splice(i, 1);
        }
    }
}


// =======================================================
// 5. 파워업 로직
// =======================================================

function activateLongPaddle() {
    if (isLongPaddleActive) { clearTimeout(longPaddleTimer); }
    isLongPaddleActive = true;
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * 2; 
    playSound('powerup');
    paddleX = paddleX - (PADDLE_WIDTH / 4); 
    if (paddleX < 0) paddleX = 0;
    
    longPaddleTimer = setTimeout(() => {
        PADDLE_WIDTH = PADDLE_WIDTH_BASE * LEVEL_CONFIGS[level].paddle_ratio; // 현재 레벨 설정으로 복귀
        isLongPaddleActive = false;
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
// 6. 충돌 처리 및 레벨 클리어 로직
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

function brickCollisionDetection(ball) {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                    ball.dy = -ball.dy; 
                    b.status = 0; 
                    score++; 
                    playSound('ping'); 
                    
                    if (Math.random() < POWERUP_PROBABILITY) {
                        powerups.push(new Powerup(b.x + brickWidth/2, b.y + brickHeight));
                    }
                    
                    checkWinCondition(); 
                }
            }
        }
    }
}

function ballWallAndPaddleCollision(ball, ballIndex) {
    // 벽 충돌 (좌/우/상단)
    if (ball.x + ball.dx > WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
        playSound('ping');
    }
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
        playSound('ping'); 
    } 
    
    // 패들 충돌
    else if (ball.y + ball.dy > HEIGHT - ball.radius - PADDLE_HEIGHT) { 
        if (ball.x > paddleX && ball.x < paddleX + PADDLE_WIDTH) { 
            if (ball.y < HEIGHT - PADDLE_HEIGHT) {
                ball.dy = -ball.dy; 
                playSound('crash'); 
                
                const relativeIntersectX = (ball.x - (paddleX + PADDLE_WIDTH / 2));
                ball.dx = relativeIntersectX * 0.2; 
            }
        } 
        // 바닥 충돌 (공 손실 처리)
        else if (ball.y + ball.dy > HEIGHT + ball.radius) { 
            balls.splice(ballIndex, 1); 
            
            if (balls.length === 0) {
                lives--;
                if (!lives) {
                    clearTimeout(descentTimer); 
                    sounds.bgm01.pause(); 
                    sounds.bgm02.pause();
                    playSound('gameOver'); 
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
    }
}


// =======================================================
// 7. 메인 루프 및 시작
// =======================================================
let animationId;

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // ✨ 핵심: 모든 그리기 함수 호출로 요소 표시 복구
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
