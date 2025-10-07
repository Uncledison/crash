// 캔버스 및 Context 설정
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// 게임 상태 변수
let score = 0;
let lives = 3;

// ===== 공 (Ball) 설정: 단일 객체에서 배열로 변경! =====
// balls 배열에 초기 공 1개를 추가합니다.
let balls = [];
balls.push({
    x: canvas.width / 2,
    y: canvas.height - 30,
    dx: 3, // 공 속도 증가
    dy: -3, // 공 속도 증가
    radius: 10,
    color: "#0095DD"
});

// 패들 (Paddle) 설정
const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

// 키보드 입력 상태
let rightPressed = false;
let leftPressed = false;

// ===== 벽돌 (Bricks) 설정 및 중앙 배치 로직 적용 =====
const brickRowCount = 5;
const brickColumnCount = 8; // 벽돌 개수 조절 (가운데 배치 효과 극대화)
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;

// 벽돌 전체 너비를 계산하여 중앙에 배치될 수 있도록 왼쪽 오프셋 계산
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (canvas.width - totalBrickAreaWidth) / 2; // 중앙 배치 오프셋

const bricks = [];
for(let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for(let r = 0; r < brickRowCount; r++) {
        // status: 1 (존재), 0 (파괴됨)
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}
// =======================================================


// ===== 멀티볼 파워업 (Powerup) 설정 및 로직 추가 =====
let powerups = [];
const POWERUP_PROBABILITY = 0.1; // 10% 확률로 파워업 드롭

// Powerup 클래스/객체 생성자
function Powerup(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.dy = 1.5; // 하강 속도
    this.color = "yellow"; 
    this.type = 'MULTIBALL'; 
}
// =======================================================


// ===== 이벤트 리스너 =====
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);

function keyDownHandler(e) {
    if(e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if(e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if(e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if(e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    if(relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth/2;
    }
}


// ===== 그리기 함수들 =====

// 공 그리기
function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

// 패들 그리기
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

// 벽돌 그리기 (좌/우/상단 오프셋 적용)
function drawBricks() {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            if(bricks[c][r].status === 1) {
                // ✨ 벽돌 좌표 계산 로직에 오프셋 변수 적용 (중앙 배치)
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                // 첫번째 줄의 오른쪽 상단 벽돌 제외 로직은 
                // 전체 벽돌 배치를 중앙에 맞추면서 벽돌 개수를 줄이는 것으로 대체했습니다.
                // 만약 특정 벽돌만 빼고 싶다면, 아래와 같이 조건문을 추가할 수 있습니다.
                // if (c === (brickColumnCount - 1) && r === 0) continue; 
                ctx.fillStyle = "#0095DD";
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// 점수판 그리기
function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + score, 8, 20);
}

// 생명(Lives) 그리기
function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Lives: " + lives, canvas.width - 65, 20);
}

// 파워업 그리기 및 이동
function drawPowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let powerup = powerups[i];
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2);
        ctx.fillStyle = powerup.color;
        ctx.fill();
        ctx.closePath();
        
        // 파워업 이동
        powerup.y += powerup.dy;
        
        // 화면 아래로 벗어나면 제거
        if (powerup.y - powerup.radius > canvas.height) {
            powerups.splice(i, 1);
        }
    }
}


// ===== 충돌 감지 및 게임 로직 =====

// 벽돌 충돌 감지 및 파워업 드롭
function brickCollisionDetection(ball) {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if(ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score++;
                    
                    // ✨ 멀티볼 파워업 드롭 로직
                    if (Math.random() < POWERUP_PROBABILITY) {
                        powerups.push(new Powerup(b.x + brickWidth/2, b.y + brickHeight));
                    }
                    // ✨

                    if(score === brickRowCount * brickColumnCount) {
                        alert("YOU WIN, CONGRATULATIONS!");
                        document.location.reload();
                    }
                }
            }
        }
    }
}

// 벽/패들 충돌 감지 및 공 이동
function ballWallAndPaddleCollision(ball) {
    // 벽 충돌 (좌/우/상단)
    if(ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }
    if(ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    } 
    
    // 하단 충돌 (패들 충돌)
    else if(ball.y + ball.dy > canvas.height - ball.radius - paddleHeight) {
        if(ball.x > paddleX && ball.x < paddleX + paddleWidth) {
            ball.dy = -ball.dy;
            
            // 패들 충돌 시 공 속도/각도 조정 (중앙은 정직하게, 가장자리는 더 큰 각도로)
            const relativeIntersectX = (ball.x - (paddleX + paddleWidth / 2));
            ball.dx = relativeIntersectX * 0.2; 
        } 
        // 하단으로 공이 완전히 나갔는지는 draw 함수에서 처리합니다.
    }
}

// 파워업 패들 충돌 감지 및 멀티볼 활성화
function powerupCollisionDetection() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let powerup = powerups[i];
        
        // 패들과의 충돌 검사
        if (
            powerup.x > paddleX && 
            powerup.x < paddleX + paddleWidth && 
            powerup.y + powerup.radius > canvas.height - paddleHeight && 
            powerup.y + powerup.radius < canvas.height
        ) {
            // 파워업 획득!
            if (powerup.type === 'MULTIBALL') {
                activateMultiball();
            }
            powerups.splice(i, 1); // 파워업 제거
        }
    }
}

function activateMultiball() {
    // 현재 존재하는 모든 공을 복제하여 멀티볼 생성
    const currentBallsCount = balls.length;
    for (let i = 0; i < currentBallsCount; i++) {
        let originalBall = balls[i]; 
        
        // 새로운 공 1: 왼쪽으로 각도 변경
        balls.push({
            x: originalBall.x,
            y: originalBall.y,
            dx: originalBall.dx - 2, 
            dy: originalBall.dy,
            radius: originalBall.radius,
            color: originalBall.color
        });
        
        // 새로운 공 2: 오른쪽으로 각도 변경
        balls.push({
            x: originalBall.x,
            y: originalBall.y,
            dx: originalBall.dx + 2, 
            dy: originalBall.dy,
            radius: originalBall.radius,
            color: originalBall.color
        });
    }
    console.log(`MULTIBALL ACTIVATED! Total balls: ${balls.length}`);
}


// ===== 메인 그리기/업데이트 루프 =====
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawPaddle();
    drawScore();
    drawLives();
    drawPowerups(); // 파워업 그리기

    // 패들 이동 처리
    if(rightPressed) {
        paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
    } else if(leftPressed) {
        paddleX = Math.max(paddleX - 7, 0);
    }

    // ✨ 모든 공에 대한 루프 처리 ✨
    for (let i = balls.length - 1; i >= 0; i--) {
        let ball = balls[i];
        
        // 공 그리기, 벽돌 충돌 감지, 벽/패들 충돌 감지
        drawBall(ball);
        brickCollisionDetection(ball);
        ballWallAndPaddleCollision(ball);
        
        // 공 위치 업데이트
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 공이 화면 아래로 벗어났는지 확인 (공 손실 로직)
        if (ball.y + ball.dy > canvas.height - ball.radius) {
            balls.splice(i, 1); // 공 제거
            
            if (balls.length === 0) {
                // 모든 공을 잃었을 때만 생명 감소 및 게임 오버
                lives--;
                if(!lives) {
                    alert("GAME OVER");
                    document.location.reload();
                } else {
                    // 공 재생성
                    balls.push({
                        x: canvas.width / 2,
                        y: canvas.height - 30,
                        dx: 3, 
                        dy: -3, 
                        radius: 10,
                        color: "#0095DD"
                    });
                    paddleX = (canvas.width - paddleWidth) / 2;
                }
            }
        }
    }
    
    // 파워업 충돌 감지
    powerupCollisionDetection();

    requestAnimationFrame(draw);
}

draw();
