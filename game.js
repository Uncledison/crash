// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

// HTML에서 설정한 픽셀 크기
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// 공 초기 설정
let ballRadius = 8;
let x = WIDTH / 2;
let y = HEIGHT - 30;
let dx = 4;  
let dy = -4; 

// 패들 초기 설정
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH = 75;
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; // 라이프


// =======================================================
// 2. 사운드 객체 초기화
// =======================================================
const sounds = {
    // 벽 충돌, 벽돌 충돌 시 사용
    ping: new Audio('assets/sounds/ping.mp3'),
    // 패들 충돌 시 요청된 crash 사운드 사용
    crash: new Audio('assets/sounds/crash.wav'), 
    gameOver: new Audio('assets/sounds/game_over.wav')
};

function playSound(name) {
    const audio = sounds[name];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("사운드 재생 실패:", e)); 
    }
}


// =======================================================
// 3. 벽돌 데이터 구조 생성
// =======================================================

const brickRowCount = 5;    
const brickColumnCount = 8; 
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
const brickOffsetTop = 30;  
const brickOffsetLeft = 30; 
let bricksRemaining = brickColumnCount * brickRowCount;

let bricks = [];
for(let c=0; c<brickColumnCount; c++) {
    bricks[c] = [];
    for(let r=0; r<brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}


// =======================================================
// 4. 이벤트 핸들러 (모바일 터치 입력)
// =======================================================

document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
    
    if (relativeX > 0 && relativeX < WIDTH) {
        paddleX = relativeX - PADDLE_WIDTH / 2;
        // 경계 처리
        if (paddleX < 0) {
            paddleX = 0;
        }
        if (paddleX + PADDLE_WIDTH > WIDTH) {
            paddleX = WIDTH - PADDLE_WIDTH;
        }
    }
    e.preventDefault(); // 스크롤 방지
}


// =======================================================
// 5. 그리기 함수
// =======================================================

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFDD00"; 
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = "#0095DD"; 
    ctx.fill();
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
                ctx.fillStyle = `hsl(${hue}, 70%, 50%)`; 
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Lives: " + lives, WIDTH - 65, 20);
}


// =======================================================
// 6. 충돌 처리
// =======================================================

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        playSound('gameOver'); 
        alert("축하합니다! 모든 벽돌을 깼어요!");
        document.location.reload(); 
    }
}

function brickCollisionDetection() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy; 
                    b.status = 0; 
                    playSound('ping'); // 벽돌 파괴 시 일반 충돌음 사용
                    checkWinCondition(); 
                }
            }
        }
    }
}


function collisionDetection() {
    // 1. 벽돌 충돌 처리
    brickCollisionDetection();

    // 2. 벽 충돌 (좌/우/상단)
    if (x + dx > WIDTH - ballRadius || x + dx < ballRadius) {
        dx = -dx;
        playSound('ping'); 
    }
    if (y + dy < ballRadius) {
        dy = -dy;
        playSound('ping'); 
    } 
    
    // 3. 패들 충돌 (수정된 로직)
    // 공이 패들 높이에 도달했을 때
    else if (y + dy > HEIGHT - ballRadius - PADDLE_HEIGHT) { 
        
        // 3-1. 패들 충돌 범위 확인
        if (x > paddleX && x < paddleX + PADDLE_WIDTH) { 
            
            // **[버그 수정]** 공이 패들 위쪽에 있을 때만 튕기도록 명확히 검사
            if (y < HEIGHT - PADDLE_HEIGHT) { 
                dy = -dy; // 방향 반전
                playSound('crash'); // **[요청 사항]** 패들 충돌 시 crash 사운드 재생
            }
        } 
        
        // 4. 바닥 충돌 (라이프 감소 및 리셋)
        else if (y + dy > HEIGHT - ballRadius) {
            lives--;
            if (!lives) {
                playSound('gameOver'); 
                alert("게임 오버!");
                document.location.reload(); 
            } else {
                // 공 위치 및 속도 리셋
                x = WIDTH / 2;
                y = HEIGHT - 30;
                dx = 4;
                dy = -4;
                paddleX = (WIDTH - PADDLE_WIDTH) / 2;
            }
        }
    }
}


// =======================================================
// 7. 게임 루프 (핵심)
// =======================================================
let animationId;

function draw() {
    // 1. 화면 지우기
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // 2. 요소 그리기
    drawBall();
    drawPaddle();
    drawBricks();
    drawLives(); 

    // 3. 충돌 검사 및 위치 업데이트
    collisionDetection();
    x += dx;
    y += dy;

    // 4. 다음 프레임 요청
    animationId = requestAnimationFrame(draw);
}

// 게임 시작
draw();
