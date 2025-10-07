// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기 변수 (HTML width/height와 일치)
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// 공 초기 설정
let ballRadius = 8;
let x = WIDTH / 2;
let y = HEIGHT - 30;
let dx = 3;  // X축 속도
let dy = -3; // Y축 속도 (위로 이동)

// 패들 초기 설정
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH = 75;
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;


// =======================================================
// 2. 사운드 객체 초기화 (업로드한 경로 사용)
// =======================================================
const sounds = {
    ping: new Audio('assets/sounds/ping.mp3'),
    crash: new Audio('assets/sounds/crash.wav'),
    gameOver: new Audio('assets/sounds/game_over.wav')
};

function playSound(name) {
    const audio = sounds[name];
    if (audio) {
        audio.currentTime = 0; // 즉시 재생을 위해 처음으로 되감기
        audio.play().catch(e => console.log("사운드 재생 실패:", e)); 
        // 모바일 환경에서 사용자 터치 없이 자동 재생 막히는 경우 대비
    }
}


// =======================================================
// 3. 주요 그리기 함수
// =======================================================

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFDD00"; // 공 색상
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = "#0095DD"; // 패들 색상
    ctx.fill();
    ctx.closePath();
}

// =======================================================
// 4. 벽과의 충돌 처리 (기초)
// =======================================================

function collisionDetection() {
    // 벽 충돌 (좌/우)
    if (x + dx > WIDTH - ballRadius || x + dx < ballRadius) {
        dx = -dx;
        playSound('ping'); // 벽에 부딪히면 ping 소리 재생
    }
    
    // 벽 충돌 (상단)
    if (y + dy < ballRadius) {
        dy = -dy;
        playSound('ping'); // 상단에 부딪히면 ping 소리 재생
    } 
    
    // 바닥 충돌 (게임 오버 조건)
    else if (y + dy > HEIGHT - ballRadius) {
        // 패들 충돌 로직이 여기에 추가되어야 함

        // 임시 게임 오버 처리
        playSound('gameOver'); 
        alert("게임 오버!");
        document.location.reload(); // 새로고침
        cancelAnimationFrame(animationId);
    }
}


// =======================================================
// 5. 게임 루프 (핵심)
// =======================================================
let animationId;

function draw() {
    // 1. 화면 지우기
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // 2. 요소 그리기
    drawBall();
    drawPaddle();

    // 3. 충돌 검사 및 위치 업데이트
    collisionDetection();
    x += dx;
    y += dy;

    // 4. 다음 프레임 요청
    animationId = requestAnimationFrame(draw);
}

// 게임 시작
draw();
