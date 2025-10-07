// =======================================================
// 1. 캔버스 및 초기 설정 (480x768 세로형 해상도)
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  // 480
const HEIGHT = canvas.height; // 768

// 공 설정
let balls = [];
balls.push({ x: WIDTH / 2, y: HEIGHT - 30, dx: 4, dy: -4, radius: 8, color: "#FFDD00" });

// 패들 설정
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75;
let PADDLE_WIDTH = PADDLE_WIDTH_BASE; 
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;
let level = 1;

// 상태 변수
let isBgmPlaying = false; // BGM 재생 상태 추적 변수
let isLongPaddleActive = false;
let longPaddleTimer = null;
const LONG_PADDLE_DURATION = 10000;
let descentInterval = 10000;
let descentTimer = null;


// =======================================================
// 2. 사운드 및 벽돌 설정 (BGM 파일 경로 추가)
// =======================================================
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'),
    crash: new Audio('assets/sounds/crash.wav'),
    gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3'),
    // ✨ BGM 파일 추가
    bgm01: new Audio('assets/sounds/bgm01.mp3'), 
    bgm02: new Audio('assets/sounds/bgm02.mp3') 
};

// ✨ BGM 반복 재생 설정
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
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.dy = 1.5; 
    
    if (Math.random() < 0.5) {
        this.color = "yellow"; 
        this.type = 'MULTIBALL'; 
    } else {
        this.color = "lime"; 
        this.type = 'LONG_PADDLE';
    }
}

// ✨ 레벨별 벽돌 배치 패턴 정의 (총 40개)
const levelPatterns = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Level 1
    [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1], // Level 2
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]  // Level 3
];

// 레벨 초기화 함수
function initBricksForLevel(levelNum) {
    const pattern = levelPatterns[(levelNum - 1) % levelPatterns.length]; 
    bricksRemaining = 0;
    
    for(let c=0; c<brickColumnCount; c++) {
        bricks[c] = [];
        for(let r=0; r<brickRowCount; r++) {
            const patternIndex = r * brickColumnCount + c;
            const status = pattern[patternIndex];
            
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
                alert(`Game Over! Level ${level}에서 벽돌에 깔렸습니다!`);
                document.location.reload();
                return;
            }
        }
    }
    brickOffsetTop += (brickHeight + brickPadding);
    descentTimer = setTimeout(descentBricks, descentInterval);
}


// =======================================================
// 3. 이벤트 핸들러 (모바일 터치 입력 및 BGM 시작)
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
    
    // ✨ BGM 재생 로직: 첫 터치 시 bgm01 재생
    if (!isBgmPlaying) {
        sounds.bgm01.play().catch(e => {
            console.log("BGM 자동 재생 차단됨. 첫 터치 후 재생 시작:", e);
        });
        isBgmPlaying = true;
    }
    
    e.preventDefault(); 
}


// =======================================================
// 4. 그리기 함수 (그래픽 스타일 적용)
// =======================================================

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
    ctx.fillStyle = "#00FFFF"; // ✨ 밝은 시안색으로 변경
    ctx.fillText("Score: " + score, 8, 20);
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00FFFF"; // ✨ 밝은 시안색으로 변경
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
// 5. 파워업 로직 (이전과 동일)
// =======================================================

function activateLongPaddle() { /* ... */ } 
function activateMultiball() { /* ... */ }
function powerupCollisionDetection() { /* ... */ }


// =======================================================
// 6. 충돌 처리 및 레벨 클리어 로직 (BGM 전환 추가)
// =======================================================

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        clearTimeout(descentTimer);
        level++;
        
        // ✨ 기존 BGM 중지
        sounds.bgm01.pause();
        sounds.bgm02.pause();

        if (level > levelPatterns.length) {
            playSound('gameOver'); 
            alert(`최고 레벨(${level - 1})을 모두 클리어했습니다!`);
            document.location.reload(); 
        } else {
            playSound('powerup'); 
            alert(`Level ${level - 1} 클리어! Level ${level}로 넘어갑니다.`);
            
            // 다음 레벨 초기화
            initBricksForLevel(level);
            
            // ✨ 다음 레벨 BGM 재생
            if (level === 2) {
                sounds.bgm02.play();
            } else { 
                sounds.bgm01.play();
            }

            // 공, 패들, 벽돌 위치 리셋
            balls = [{x: WIDTH / 2, y: HEIGHT - 30, dx: 4 + (level * 0.5), dy: -4 - (level * 0.5), radius: 8, color: "#FFDD00"}];
            paddleX = (WIDTH - PADDLE_WIDTH) / 2;
            brickOffsetTop = 30;
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
    // ... (로직 생략 - GAME OVER 시 BGM 정지 로직만 추가)

    // 바닥 충돌 (공 손실 처리)
    if (ball.y + ball.dy > HEIGHT - ball.radius) {
        balls.splice(ballIndex, 1); 
        
        if (balls.length === 0) {
            lives--;
            if (!lives) {
                clearTimeout(descentTimer); 
                sounds.bgm01.pause(); 
                sounds.bgm02.pause();
                playSound('gameOver'); 
                alert("GAME OVER");
                document.location.reload(); 
            } else {
                // 공 재생성
                balls.push({x: WIDTH / 2, y: HEIGHT - 30, dx: 4, dy: -4, radius: 8, color: "#FFDD00"});
                paddleX = (WIDTH - PADDLE_WIDTH) / 2;
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

// 초기 레벨 시작 및 하강 타이머 설정
initBricksForLevel(level);
descentTimer = setTimeout(descentBricks, descentInterval);

draw();
