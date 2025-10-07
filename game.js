// =======================================================
// 1. 캔버스 및 초기 설정 (480x768 세로형 해상도)
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  // 480
const HEIGHT = canvas.height; // 768 (기존 640 + 20%)

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

// 패들 설정
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75;
let PADDLE_WIDTH = PADDLE_WIDTH_BASE; 
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;
let level = 1; // ✨ 레벨 변수 추가

// 패들 확장 타이머 변수
let isLongPaddleActive = false;
let longPaddleTimer = null;
const LONG_PADDLE_DURATION = 10000;

// 벽돌 하강 타이머 변수
let descentInterval = 10000; // 10초마다 하강
let descentTimer = null;


// =======================================================
// 2. 사운드 및 벽돌 설정
// =======================================================
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'),
    crash: new Audio('assets/sounds/crash.wav'),
    gameOver: new Audio('assets/sounds/game_over.wav'),
    powerup: new Audio('assets/sounds/powerup.mp3') 
};

function playSound(name) { /* ... */ } // 이전과 동일


// 벽돌 설정 변수
const brickRowCount = 5;    
const brickColumnCount = 8; 
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
const brickOffsetTop = 30;  
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (WIDTH - totalBrickAreaWidth) / 2; 

let bricks = [];
let bricksRemaining = 0;


// ✨ 레벨별 벽돌 배치 패턴 정의 (1은 벽돌 있음, 0은 벽돌 없음)
const levelPatterns = [
    // Level 1: 모든 벽돌 배치
    [1, 1, 1, 1, 1, 1, 1, 1,
     1, 1, 1, 1, 1, 1, 1, 1,
     1, 1, 1, 1, 1, 1, 1, 1,
     1, 1, 1, 1, 1, 1, 1, 1,
     1, 1, 1, 1, 1, 1, 1, 1],

    // Level 2: 가운데 비우기 패턴
    [1, 0, 1, 0, 0, 1, 0, 1,
     1, 1, 0, 1, 1, 0, 1, 1,
     0, 1, 1, 1, 1, 1, 1, 0,
     1, 1, 1, 0, 0, 1, 1, 1,
     1, 0, 1, 1, 1, 1, 0, 1],
    
    // Level 3: 대각선 패턴 (난이도 상승)
    [1, 0, 0, 0, 0, 0, 0, 1,
     0, 1, 0, 0, 0, 0, 1, 0,
     0, 0, 1, 0, 0, 1, 0, 0,
     0, 0, 0, 1, 1, 0, 0, 0,
     1, 0, 0, 0, 0, 0, 0, 1]
];

// ✨ 레벨 초기화 함수
function initBricksForLevel(levelNum) {
    const pattern = levelPatterns[(levelNum - 1) % levelPatterns.length]; // 패턴 순환
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

// 초기 레벨 시작
initBricksForLevel(level);

// ✨ 벽돌 하강 로직
function descentBricks() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
            
            // 벽돌이 패들보다 낮은 위치까지 내려오면 게임 오버
            if (bricks[c][r].status === 1 && brickY + brickHeight >= HEIGHT - PADDLE_HEIGHT) {
                clearTimeout(descentTimer);
                playSound('gameOver'); 
                alert(`Game Over! Level ${level}에서 벽돌에 깔렸습니다!`);
                document.location.reload();
                return;
            }
        }
    }

    // 벽돌 전체를 아래로 한 칸 내림 (OffsetTop 증가)
    brickOffsetTop += (brickHeight + brickPadding);
    
    // 다음 하강 타이머 재설정
    descentTimer = setTimeout(descentBricks, descentInterval);
}
// 게임 시작 시 타이머 설정
descentTimer = setTimeout(descentBricks, descentInterval);


// =======================================================
// 3. 이벤트 핸들러 (모바일 터치 입력 - 이전과 동일)
// =======================================================
document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) { /* ... */ }


// =======================================================
// 4. 그리기 함수 (그라데이션 색감 적용)
// =======================================================

function drawPaddle() {
    // ✨ 패들 그라데이션 (입체적인 쇠 느낌)
    const gradient = ctx.createLinearGradient(paddleX, HEIGHT - PADDLE_HEIGHT, paddleX + PADDLE_WIDTH, HEIGHT);
    gradient.addColorStop(0, "#C0C0C0"); // 밝은 은색
    gradient.addColorStop(0.5, "#4B4B4B"); // 진한 회색
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
                
                // ✨ 벽돌 그라데이션 (줄별로 다른 색상)
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

// (drawBall, drawScore, drawLives, drawPowerups 함수는 생략 - 이전과 동일하게 유지)


// =======================================================
// 5. 충돌 처리 및 레벨 클리어 로직 (업데이트)
// =======================================================

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        clearTimeout(descentTimer); // 벽돌 하강 중지
        level++;
        if (level > levelPatterns.length) {
            playSound('gameOver'); 
            alert(`최고 레벨(${level - 1})을 모두 클리어했습니다!`);
            document.location.reload(); 
        } else {
            playSound('powerup'); // 레벨 클리어 효과음으로 사용
            alert(`Level ${level - 1} 클리어! Level ${level}로 넘어갑니다.`);
            
            // 다음 레벨 초기화
            initBricksForLevel(level);
            // 공 위치 리셋
            balls = [{x: WIDTH / 2, y: HEIGHT - 30, dx: 4 + (level * 0.5), dy: -4 - (level * 0.5), radius: 8, color: "#FFDD00"}];
            paddleX = (WIDTH - PADDLE_WIDTH) / 2;
            brickOffsetTop = 30; // 벽돌 상단 위치 리셋
            
            // 하강 타이머 재시작
            descentTimer = setTimeout(descentBricks, descentInterval);
        }
    }
}

// (brickCollisionDetection, ballWallAndPaddleCollision, powerupCollisionDetection, activateLongPaddle, activateMultiball 함수는 이전과 동일하게 유지)


// =======================================================
// 6. 메인 그리기/업데이트 루프
// =======================================================
let animationId;

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // (모든 그리기 및 충돌 로직은 이전과 동일하게 유지)
    // ...
    
    animationId = requestAnimationFrame(draw);
}

// draw()
// (모든 함수 정의가 완료된 후 draw()를 호출해야 합니다.)
