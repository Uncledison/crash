// =======================================================
// 1. 캔버스 및 초기 설정 (480x640 세로형 해상도)
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  // 480
const HEIGHT = canvas.height; // 640

// 공 설정
let balls = [];
balls.push({
    x: WIDTH / 2,
    y: HEIGHT - 30,
    dx: 4,  
    dy: -4, 
    radius: 8,
    color: "#FFDD00"
});

// 패들 설정 (기본 크기 및 확장 변수)
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75; // 기본 폭
let PADDLE_WIDTH = PADDLE_WIDTH_BASE; // 현재 폭
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;

// 패들 확장 타이머 관련 변수
let isLongPaddleActive = false;
let longPaddleTimer = null;
const LONG_PADDLE_DURATION = 10000; // 10초 (10000ms)


// =======================================================
// 2. 사운드 및 벽돌 설정
// =======================================================
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'),
    crash: new Audio('assets/sounds/crash.wav'),
    gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3') // 파워업 획득 소리 추가 (필요 시 파일 추가)
};

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
const brickOffsetTop = 30;  
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (WIDTH - totalBrickAreaWidth) / 2; 
let bricksRemaining = brickColumnCount * brickRowCount;

let bricks = [];
for(let c=0; c<brickColumnCount; c++) {
    bricks[c] = [];
    for(let r=0; r<brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}

// 멀티볼 및 롱패들 파워업 설정
let powerups = [];
const POWERUP_PROBABILITY = 0.15; // 드롭 확률 약간 증가

function Powerup(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.dy = 1.5; 
    
    // 무작위로 두 파워업 중 하나 선택
    if (Math.random() < 0.5) {
        this.color = "yellow"; 
        this.type = 'MULTIBALL'; 
    } else {
        this.color = "lime"; // 롱패들 색상 (라임색)
        this.type = 'LONG_PADDLE';
    }
}


// =======================================================
// 3. 이벤트 핸들러 (모바일 터치 입력)
// =======================================================

document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
    
    if (relativeX > 0 && relativeX < WIDTH) {
        // 패들 크기가 PADDLE_WIDTH로 바뀌었으므로 이를 사용
        paddleX = relativeX - PADDLE_WIDTH / 2; 
        
        // 경계 처리
        if (paddleX < 0) { paddleX = 0; }
        if (paddleX + PADDLE_WIDTH > WIDTH) { paddleX = WIDTH - PADDLE_WIDTH; }
    }
    e.preventDefault(); 
}


// =======================================================
// 4. 그리기 함수 (그래픽 스타일 개선)
// =======================================================

function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 10; // 그림자 효과
    ctx.shadowColor = ball.color;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0; // 그림자 초기화
}

function drawPaddle() {
    // ✨ 패들에 그라디언트 효과 추가 (고급스러운 느낌)
    const gradient = ctx.createLinearGradient(paddleX, HEIGHT - PADDLE_HEIGHT, paddleX + PADDLE_WIDTH, HEIGHT);
    gradient.addColorStop(0, "#4A90E2"); // 밝은 파랑
    gradient.addColorStop(0.5, "#0047AB"); // 진한 파랑
    gradient.addColorStop(1, "#4A90E2");

    ctx.beginPath();
    ctx.rect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 외곽선 추가
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
                
                // ✨ 벽돌 스타일: HSL 색상 및 외곽선 추가
                ctx.fillStyle = `hsl(${hue}, 80%, 60%)`; 
                ctx.fill();
                ctx.strokeStyle = "#000000"; // 검은색 외곽선
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

// (drawScore, drawLives, drawPowerups 함수는 생략 - 변경 없음)
function drawScore() { /* ... */ }
function drawLives() { /* ... */ }
function drawPowerups() { /* ... */ }


// =======================================================
// 5. 파워업 로직 (롱패들 활성화/비활성화)
// =======================================================

function activateLongPaddle() {
    if (isLongPaddleActive) {
        clearTimeout(longPaddleTimer); // 이미 활성화되었으면 타이머 리셋
    }
    
    isLongPaddleActive = true;
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * 2; // 패들 폭 2배 확장
    playSound('powerup');
    
    // 기존 패들 위치를 중앙에 맞추기 위해 조정
    paddleX = paddleX - (PADDLE_WIDTH / 4); 
    if (paddleX < 0) paddleX = 0;
    
    // 10초 후 원래대로 되돌리는 타이머 설정
    longPaddleTimer = setTimeout(() => {
        PADDLE_WIDTH = PADDLE_WIDTH_BASE; // 원래 폭으로 복구
        isLongPaddleActive = false;
        // 다시 중앙으로 위치 조정
        paddleX = paddleX + (PADDLE_WIDTH_BASE / 2); 
        if (paddleX + PADDLE_WIDTH > WIDTH) paddleX = WIDTH - PADDLE_WIDTH;
    }, LONG_PADDLE_DURATION);
}

function activateMultiball() {
    const currentBallsCount = balls.length;
    for (let i = 0; i < currentBallsCount; i++) {
        let originalBall = balls[i]; 
        // 2개 복제
        balls.push({
            x: originalBall.x, y: originalBall.y, dx: originalBall.dx - 2, dy: originalBall.dy, radius: originalBall.radius, color: originalBall.color
        });
        balls.push({
            x: originalBall.x, y: originalBall.y, dx: originalBall.dx + 2, dy: originalBall.dy, radius: originalBall.radius, color: originalBall.color
        });
    }
    playSound('powerup');
}


function powerupCollisionDetection() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let powerup = powerups[i];
        
        // 패들과의 충돌 검사
        if (
            powerup.x > paddleX && 
            powerup.x < paddleX + PADDLE_WIDTH && 
            powerup.y + powerup.radius > HEIGHT - PADDLE_HEIGHT && 
            powerup.y + powerup.radius < HEIGHT
        ) {
            if (powerup.type === 'MULTIBALL') {
                activateMultiball();
            } else if (powerup.type === 'LONG_PADDLE') {
                activateLongPaddle();
            }
            powerups.splice(i, 1); 
        }
    }
}


// (brickCollisionDetection, ballWallAndPaddleCollision, draw 함수는 변경된 변수(PADDLE_WIDTH)만 적용하고 로직은 동일)

function brickCollisionDetection(ball) { /* ... */ }
function ballWallAndPaddleCollision(ball, ballIndex) { /* ... */ }


// =======================================================
// 6. 메인 그리기/업데이트 루프
// =======================================================
let animationId;

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    drawBricks();
    drawPaddle();
    drawScore();
    drawLives();
    drawPowerups();

    // 모든 공에 대한 루프 처리
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

// draw()
// (편의상 draw() 함수 내의 로직만 수정하고, 로직이 동일한 함수는 주석으로 처리했습니다.
// 실제 사용 시에는 이 주석들을 제거하고 이전 코드의 함수들을 그대로 사용해 주세요.)
// 최종적으로 모든 함수가 포함된 game.js를 사용해야 합니다.
