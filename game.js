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
// 속도를 약간 빠르게 조정
let dx = 4;  
let dy = -4; 

// 패들 초기 설정
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH = 75;
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; // 라이프 추가


// =======================================================
// 2. 사운드 객체 초기화 (경로 확인: assets/sounds/ 로 설정되어야 함)
// =======================================================
const sounds = {
    // WAV 포맷은 브라우저 호환성이 떨어질 수 있어, ping.mp3를 범용 충돌음으로 사용
    ping: new Audio('assets/sounds/ping.mp3'),
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

// 벽돌 설정 변수
const brickRowCount = 5;    
const brickColumnCount = 8; 
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
const brickOffsetTop = 30;  
const brickOffsetLeft = 30; 

let bricks = [];
for(let c=0; c<brickColumnCount; c++) {
    bricks[c] = [];
    for(let r=0; r<brickRowCount; r++) {
        // status: 1이면 살아있음, 0이면 깨짐
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}


// =======================================================
// 4. 이벤트 핸들러 (모바일 터치 입력)
// =======================================================

document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) {
    // 캔버스의 실제 화면상 위치를 계산
    const rect = canvas.getBoundingClientRect();
    
    // 터치 지점의 X 좌표를 캔버스 내부 좌표로 변환
    const relativeX = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
    
    if (relativeX > 0 && relativeX < WIDTH) {
        // 패들이 터치 지점 중앙에 오도록 설정
        paddleX = relativeX - PADDLE_WIDTH / 2;

        // 패들이 캔버스 밖으로 나가지 않도록 경계 처리
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
                // 줄에 따라 색깔을 다르게 설정 (시각적 재미 추가)
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
// 6. 충돌 처리 (벽돌 충돌 로직 포함)
// =======================================================

function brickCollisionDetection() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                // 공이 벽돌의 경계 안에 있는지 검사
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy; // y축 방향 반전
                    b.status = 0; // 벽돌 파괴
                    playSound('crash'); // 파괴음 재생
                    
                    // 모든 벽돌을 깼는지 확인
                    checkWinCondition(); 
                }
            }
        }
    }
}

let bricksRemaining = brickColumnCount * brickRowCount;

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        playSound('gameOver'); // 승리 시에도 동일한 효과음 사용
        alert("축하합니다! 모든 벽돌을 깼어요!");
        document.location.reload(); 
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
    
    // 3. 바닥 충돌 및 패들 충돌 분기
    else if (y + dy > HEIGHT - ballRadius - PADDLE_HEIGHT) {
        // 3-1. 패들 충돌
        if (x > paddleX && x < paddleX + PADDLE_WIDTH) {
            // 공이 패들 윗면에 부딪힌 경우에만 반사되도록 정확히 검사 (y 좌표)
            if (y + ballRadius < HEIGHT - PADDLE_HEIGHT) {
                dy = -dy; // 방향 반전
                playSound('ping');
            }
        } 
        // 3-2. 바닥 충돌 (라이프 감소 및 리셋)
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
    drawLives(); // 라이프 표시

    // 3. 충돌 검사 및 위치 업데이트
    collisionDetection();
    x += dx;
    y += dy;

    // 4. 다음 프레임 요청
    animationId = requestAnimationFrame(draw);
}

// 게임 시작
draw();
