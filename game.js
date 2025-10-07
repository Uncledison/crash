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

// 패들 설정
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH = 75;
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;


// =======================================================
// 2. 사운드 및 벽돌 설정 (이전 로직 유지)
// =======================================================
const sounds = {
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

// 벽돌 설정 변수
const brickRowCount = 5;    
const brickColumnCount = 8; 
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
const brickOffsetTop = 30;  
// 세로형에 맞춰 중앙 배치 오프셋 재계산
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

// 멀티볼 설정
let powerups = [];
const POWERUP_PROBABILITY = 0.1; 

function Powerup(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.dy = 1.5; 
    this.color = "yellow"; 
    this.type = 'MULTIBALL'; 
}


// =======================================================
// 3. 이벤트 핸들러 (모바일 터치 입력 복구)
// =======================================================

document.addEventListener("touchmove", touchMoveHandler, false);
document.addEventListener("touchstart", touchMoveHandler, false);

function touchMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    // 모바일 터치 좌표를 캔버스 좌표로 정확히 변환하는 로직
    const relativeX = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
    
    if (relativeX > 0 && relativeX < WIDTH) {
        paddleX = relativeX - PADDLE_WIDTH / 2;
        // 경계 처리
        if (paddleX < 0) { paddleX = 0; }
        if (paddleX + PADDLE_WIDTH > WIDTH) { paddleX = WIDTH - PADDLE_WIDTH; }
    }
    e.preventDefault(); // 스크롤 방지
}


// =======================================================
// 4. 그리기 함수 (drawScore, drawLives 추가)
// =======================================================
function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
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

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Score: " + score, 8, 20);
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FFFFFF";
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
// 5. 충돌 처리 및 멀티볼 로직
// =======================================================

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        playSound('gameOver'); 
        alert("축하합니다! 모든 벽돌을 깼어요!");
        document.location.reload(); 
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
                    score++; // 점수 증가
                    playSound('ping'); 
                    
                    // 멀티볼 드롭 로직
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
            if (ball.y < HEIGHT - PADDLE_HEIGHT) { // 공이 패들 위쪽에 있을 때만 튕기도록 검사
                ball.dy = -ball.dy; 
                playSound('crash'); 
                
                // 패들 충돌 시 공 속도/각도 조정 (중앙은 정직하게, 가장자리는 더 큰 각도로)
                const relativeIntersectX = (ball.x - (paddleX + PADDLE_WIDTH / 2));
                ball.dx = relativeIntersectX * 0.2; 
            }
        } 
        // 바닥 충돌 (공 손실 처리)
        else if (ball.y + ball.dy > HEIGHT - ball.radius) {
            balls.splice(ballIndex, 1); // 해당 공 제거
            
            if (balls.length === 0) {
                lives--;
                if (!lives) {
                    playSound('gameOver'); 
                    alert("GAME OVER");
                    document.location.reload(); 
                } else {
                    // 공 재생성
                    balls.push({
                        x: WIDTH / 2, y: HEIGHT - 30, dx: 4, dy: -4, radius: 8, color: "#FFDD00"
                    });
                    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
                }
            }
        }
    }
}

function activateMultiball() {
    const currentBallsCount = balls.length;
    for (let i = 0; i < currentBallsCount; i++) {
        let originalBall = balls[i]; 
        
        balls.push({
            x: originalBall.x,
            y: originalBall.y,
            dx: originalBall.dx - 2, 
            dy: originalBall.dy,
            radius: originalBall.radius,
            color: originalBall.color
        });
        
        balls.push({
            x: originalBall.x,
            y: originalBall.y,
            dx: originalBall.dx + 2, 
            dy: originalBall.dy,
            radius: originalBall.radius,
            color: originalBall.color
        });
    }
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
            }
            powerups.splice(i, 1); 
        }
    }
}


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
        ballWallAndPaddleCollision(ball, i); // 공 인덱스를 전달하여 손실 시 제거
        
        ball.x += ball.dx;
        ball.y += ball.dy;
    }
    
    powerupCollisionDetection();

    animationId = requestAnimationFrame(draw);
}

draw();
