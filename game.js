// =======================================================
// 1. 캔버스 및 초기 설정
// =======================================================
const canvas = document.getElementById('myGameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;  
const HEIGHT = canvas.height; 

// 기본 설정 상수
const BALL_SPEED_BASE = 4; // 기본 공 이동 속도
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_BASE = 75; // 기본 패들 폭 (Level 2 기준)

// 난이도별 설정 정의 (Level 1이 기본 시작 난이도)
const LEVEL_CONFIGS = [
    null, // 인덱스 0은 사용하지 않음
    { 
        name: "Level 1 (Easy)", 
        paddle_ratio: 2.0, // 패들 길이 2배
        speed_ratio: 1.0   // 속도 1배
    },
    { 
        name: "Level 2 (Normal)", 
        paddle_ratio: 1.0, // 패들 길이 기본
        speed_ratio: 1.5   // 속도 1.5배
    },
    { 
        name: "Level 3 (Hard)", 
        paddle_ratio: 0.8, // 패들 길이 80%
        speed_ratio: 2.0   // 속도 2배
    }
];

// 게임 상태 변수
let balls = [];
let PADDLE_WIDTH = PADDLE_WIDTH_BASE * LEVEL_CONFIGS[1].paddle_ratio; 
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;
let level = 1; // 현재 설정된 난이도 레벨 (1, 2, 3)

let isBgmPlaying = false; 
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

// ... (벽돌 설정 변수 생략, 이전 코드와 동일)
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
let powerups = [];

// 레벨별 벽돌 배치 패턴 정의 (총 40개)
const levelPatterns = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Pattern 1
    [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1], // Pattern 2
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]  // Pattern 3
];

// 레벨에 맞는 벽돌 패턴 초기화 (난이도와는 별개로 사용)
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

// =======================================================
// 3. 레벨 변경 및 게임 초기화 로직 (핵심 수정 부분)
// =======================================================

// 게임 상태를 초기화하고 새 레벨 설정으로 시작
function resetGame(newLevel) {
    const config = LEVEL_CONFIGS[newLevel];
    
    // 1. 난이도 설정 적용
    level = newLevel;
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    
    // 2. 게임 상태 초기화
    lives = 3; 
    score = 0;
    balls = [];
    powerups = [];
    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
    brickOffsetTop = 30;

    // 3. 공 생성 및 속도 적용
    balls.push({ 
        x: WIDTH / 2, y: HEIGHT - 30, 
        dx: speed, dy: -speed, 
        radius: 8, color: "#FFDD00" 
    });

    // 4. 벽돌 패턴 초기화 (선택된 난이도 레벨의 벽돌 패턴으로 시작)
    initBricksForPattern(newLevel); 

    // 5. 타이머 리셋
    clearTimeout(descentTimer);
    descentTimer = setTimeout(descentBricks, descentInterval);
    
    // 6. BGM 전환
    sounds.bgm01.pause();
    sounds.bgm02.pause();
    if (isBgmPlaying) {
        // Level 1 또는 3은 bgm01, Level 2는 bgm02
        (newLevel === 2 ? sounds.bgm02 : sounds.bgm01).play().catch(e => console.log("BGM 재생 실패:", e));
    }
}

// 버튼 클릭 시 호출되는 함수
function changeGameLevel(newLevel) {
    if (newLevel < 1 || newLevel > 3) return;
    
    const config = LEVEL_CONFIGS[newLevel];
    
    // 레벨 변경 및 게임 리셋
    resetGame(newLevel);
    
    // 현재 레벨 표시 업데이트
    document.getElementById('currentLevelDisplay').innerText = `현재 레벨: ${config.name}`;
    
    alert(`${config.name}으로 난이도를 설정하고 게임을 다시 시작합니다!`);
}


// ... (벽돌 하강 로직 - 최종 점수 표시 로직은 유지)
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
// 4. 이벤트 핸들러 (BGM 시작 로직은 유지)
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
    
    // BGM 재생 로직: 첫 터치 시 현재 레벨의 BGM 재생
    if (!isBgmPlaying) {
        // Level 1 BGM 재생
        (level === 2 ? sounds.bgm02 : sounds.bgm01).play().catch(e => {
            console.log("BGM 자동 재생 차단됨. 첫 터치 후 재생 시작:", e);
        });
        isBgmPlaying = true;
    }
    
    e.preventDefault(); 
}


// =======================================================
// 5. 그리기 함수 (생략, 이전 코드와 동일)
// =======================================================
function drawBall(ball) { /* ... */ } 
function drawPaddle() { /* ... */ }
function drawBricks() { /* ... */ }
function drawScore() { /* ... */ }
function drawLives() { /* ... */ }
function drawPowerups() { /* ... */ }


// =======================================================
// 6. 파워업 및 충돌 처리 로직 (승리 조건 로직 수정)
// =======================================================
// ... (activateLongPaddle, activateMultiball, powerupCollisionDetection 생략)

function checkWinCondition() {
    bricksRemaining--;
    if (bricksRemaining === 0) {
        clearTimeout(descentTimer);
        
        // ✨ 난이도 변경이 아닌, 패턴 클리어로 처리
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
            level = nextPattern; // 다음 패턴 번호로 변경
            initBricksForPattern(nextPattern);
            
            // BGM은 난이도 설정(level 1, 2, 3)을 기준으로 계속 유지
            const config = LEVEL_CONFIGS[level];
            const speed = BALL_SPEED_BASE * config.speed_ratio;
            
            // 공, 패들, 벽돌 위치 리셋
            balls = [{x: WIDTH / 2, y: HEIGHT - 30, dx: speed, dy: -speed, radius: 8, color: "#FFDD00"}];
            paddleX = (WIDTH - PADDLE_WIDTH) / 2;
            brickOffsetTop = 30;
            
            (level === 2 ? sounds.bgm02 : sounds.bgm01).play();
            descentTimer = setTimeout(descentBricks, descentInterval);
        }
    }
}

// ... (brickCollisionDetection, ballWallAndPaddleCollision 생략 - 이전 수정 코드와 동일하게 유지)


// =======================================================
// 7. 메인 루프 및 시작
// =======================================================
let animationId;

function draw() {
    // ... (draw 루프 내용 생략)
    animationId = requestAnimationFrame(draw);
}

// 게임 시작: Level 1 (Easy) 설정으로 초기화하고 시작
resetGame(1);
draw();
