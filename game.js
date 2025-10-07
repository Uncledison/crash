// =======================================================
// 벽돌깨기 게임 - PHASE 1 UPGRADE
// Part 1: 캔버스, 초기 설정, 사운드, 벽돌 시스템
// =======================================================

// 1. 캔버스 및 초기 설정
const canvas = document.getElementById('myGameCanvas');

if (!canvas) {
    console.error("Fatal Error: Canvas element not found.");
    throw new Error("Canvas element not found. Check index.html ID='myGameCanvas'."); 
}

const ctx = canvas.getContext('2d');

canvas.width = 480; 
canvas.height = 768;

const WIDTH = canvas.width;  
const HEIGHT = canvas.height; 

// 기본 설정 상수
const BALL_SPEED_BASE = 4;
const PADDLE_HEIGHT = 12;
const PADDLE_WIDTH_BASE = 75; 

const LEVEL_CONFIGS = [
    null,
    { name: "Level 1 (Easy)", paddle_ratio: 2.0, speed_ratio: 1.0, bgColor: '#1a1a2e' },
    { name: "Level 2 (Normal)", paddle_ratio: 1.0, speed_ratio: 1.5, bgColor: '#0f0f1e' },
    { name: "Level 3 (Hard)", paddle_ratio: 0.8, speed_ratio: 2.0, bgColor: '#000000' }
];

// 게임 상태 변수
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

// 새로운 파워업 상태
let isMagneticActive = false;
let magneticTimer = null;
const MAGNETIC_DURATION = 15000;
const MAGNETIC_FORCE = 0.3;
const MAGNETIC_RANGE = 100;

// ✨ Phase 1: 파워업 타이머 관리
let activePowerups = {
    fire: { active: false, remaining: 0, max: 12000 },
    mega: { active: false, remaining: 0, max: 10000 },
    magnetic: { active: false, remaining: 0, max: 15000 },
    long: { active: false, remaining: 0, max: 10000 }
};

// ✨ Phase 1: 튜토리얼 툴팁 상태
let showTutorial = true;
let tutorialOpacity = 1.0;

// 2. 사운드 설정
const createSafeAudio = (path) => {
    try {
        const audio = new Audio(path);
        audio.onerror = () => console.warn(`Sound file failed to load: ${path}`);
        return audio;
    } catch (e) {
        console.warn(`Could not create Audio object for ${path}: ${e.message}`);
        return { play: () => {}, pause: () => {}, loop: false, currentTime: 0 }; 
    }
};

const sounds = {
    ping: createSafeAudio('assets/sounds/ping.mp3'),
    crash: createSafeAudio('assets/sounds/crash.wav'),
    gameOver: createSafeAudio('assets/sounds/game_over.wav'),
    powerup: createSafeAudio('assets/sounds/powerup.mp3'),
    bgm01: createSafeAudio('assets/sounds/bgm01.mp3'),
    bgm02: createSafeAudio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true;
sounds.bgm02.loop = true;

function playSound(name) {
    const audio = sounds[name];
    if (audio && audio.play) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log(`Sound playback failed for ${name}:`, e));
    }
}

// 3. 벽돌 설정
const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
let brickOffsetTop = 60;  // ✨ UI 공간 확보를 위해 증가
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (WIDTH - totalBrickAreaWidth) / 2; 

let bricks = [];
let bricksRemaining = 0;
let powerups = [];
const POWERUP_PROBABILITY = 0.20; 

// 파티클 시스템
let particles = [];

function Particle(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4 - 2;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 3 + 2;
}

function Powerup(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.dy = 1.5; 
    
    const rand = Math.random();
    if (rand < 0.25) {
        this.color = "yellow";
        this.type = 'MULTIBALL';
        this.icon = 'M';
    } else if (rand < 0.5) {
        this.color = "lime";
        this.type = 'LONG_PADDLE';
        this.icon = 'L';
    } else if (rand < 0.7) {
        this.color = "orange";
        this.type = 'MEGA_BALL';
        this.icon = 'G';
    } else if (rand < 0.85) {
        this.color = "red";
        this.type = 'FIRE_BALL';
        this.icon = 'F';
    } else {
        this.color = "cyan";
        this.type = 'MAGNETIC';
        this.icon = 'A';
    }
}

const levelPatterns = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]
];

function initBricksForPattern(patternIndex) {
    const pattern = levelPatterns[(patternIndex - 1) % levelPatterns.length]; 
    bricksRemaining = 0;
    bricks = []; 
    for(let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for(let r = 0; r < brickRowCount; r++) {
            const index = r * brickColumnCount + c;
            bricks[c][r] = { x: 0, y: 0, status: pattern[index] };
            if (pattern[index] === 1) {
                bricksRemaining++;
            }
        }
    }
}

function descentBricks() {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
            if (bricks[c][r].status === 1 && brickY + brickHeight >= HEIGHT - PADDLE_HEIGHT - 50) {
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

// 4. 레벨 변경 및 게임 초기화
function resetGame(newLevel) {
    const config = LEVEL_CONFIGS[newLevel];
    
    level = newLevel;
    lives = 3; 
    score = 0;
    balls = [];
    powerups = [];
    particles = [];
    brickOffsetTop = 60; 
    
    isLongPaddleActive = false;
    isMagneticActive = false;
    
    // ✨ Phase 1: 파워업 상태 초기화
    for (let key in activePowerups) {
        activePowerups[key].active = false;
        activePowerups[key].remaining = 0;
    }
    
    if (longPaddleTimer) {
        clearTimeout(longPaddleTimer);
        longPaddleTimer = null;
    }
    if (magneticTimer) {
        clearTimeout(magneticTimer);
        magneticTimer = null;
    }
    
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    
    initBricksForPattern(newLevel); 
    balls.push({
        x: WIDTH / 2,
        y: HEIGHT - 80,
        dx: speed,
        dy: -speed,
        radius: 8,
        color: "#FFDD00",
        isMega: false,
        isFire: false,
        trail: []
    });
    
    if (descentTimer) {
        clearTimeout(descentTimer);
        descentTimer = null;
    }
    
    sounds.bgm01.pause();
    sounds.bgm02.pause();
    sounds.bgm01.currentTime = 0;
    sounds.bgm02.currentTime = 0;
    
    if (isBgmPlaying) {
        const bgmToPlay = (newLevel === 2 ? sounds.bgm02 : sounds.bgm01);
        bgmToPlay.play().catch(e => console.log("BGM 재생 실패:", e));
    }
}

function changeGameLevel(newLevel) {
    if (newLevel < 1 || newLevel > 3) return;
    const config = LEVEL_CONFIGS[newLevel];
    resetGame(newLevel);
    descentTimer = setTimeout(descentBricks, descentInterval); 
    alert(`${config.name}으로 난이도를 설정하고 게임을 다시 시작합니다!`);
}

// 5. 이벤트 핸들러
function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    if(relativeX > 0 && relativeX < WIDTH) {
        paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, relativeX - PADDLE_WIDTH / 2));
    }
    
    // ✨ Phase 1: 첫 움직임 시 튜토리얼 숨기기
    if (showTutorial) {
        showTutorial = false;
    }
}

function touchMoveHandler(e) { 
    const touchX = e.touches[0].clientX - canvas.offsetLeft;
    if(touchX > 0 && touchX < WIDTH) {
        paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, touchX - PADDLE_WIDTH / 2));
    }
    e.preventDefault(); 
    
    // ✨ Phase 1: 첫 터치 시 튜토리얼 숨기기
    if (showTutorial) {
        showTutorial = false;
    }
    
    if (!isBgmPlaying) {
        const bgmToPlay = (level === 2 ? sounds.bgm02 : sounds.bgm01);
        bgmToPlay.play().then(() => {
            isBgmPlaying = true;
        }).catch(e => {
            console.warn("BGM playback blocked or failed:", e);
        });
    }
}

document.addEventListener('mousemove', mouseMoveHandler, false); 
document.addEventListener('touchmove', touchMoveHandler, false);

console.log("✅ Phase 1 - Part 1 로드 완료");
// =======================================================
// 벽돌깨기 게임 - PHASE 1 UPGRADE
// Part 2: 그리기 함수 (UI 개선 적용)
// =======================================================

// ✨ Phase 1: 배경 그리기
function drawBackground() {
    const config = LEVEL_CONFIGS[level];
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// ✨ Phase 1: 향상된 하트 아이콘 그리기
function drawHeart(x, y, size, filled = true) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size * 0.5, -size * 0.3, -size, size * 0.1, 0, size);
    ctx.bezierCurveTo(size, size * 0.1, size * 0.5, -size * 0.3, 0, size * 0.3);
    ctx.closePath();
    
    if (filled) {
        ctx.fillStyle = '#FF1744';
        ctx.fill();
        // 하이라이트
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-size * 0.2, size * 0.1, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    ctx.restore();
}

// ✨ Phase 1: 상단 UI 바 그리기
function drawTopUI() {
    // 반투명 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, WIDTH, 50);
    
    // 왼쪽: 하트 생명
    let heartX = 15;
    for (let i = 0; i < 3; i++) {
        drawHeart(heartX, 25, 8, i < lives);
        heartX += 25;
    }
    
    // 중앙: 점수
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, WIDTH / 2, 32);
    
    // 점수 아이콘
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('🏆', WIDTH / 2 - 40, 30);
    
    // 오른쪽: 레벨 표시
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'right';
    ctx.fillText(`Lv.${level}`, WIDTH - 15, 30);
}

// ✨ Phase 1: 파워업 타이머 게이지 그리기
function drawPowerupTimers() {
    let yOffset = 55;
    const barWidth = 100;
    const barHeight = 8;
    const xPos = WIDTH - barWidth - 15;
    
    for (let key in activePowerups) {
        const pw = activePowerups[key];
        if (pw.active && pw.remaining > 0) {
            const percentage = pw.remaining / pw.max;
            
            // 아이콘 매핑
            const icons = {
                fire: '🔥',
                mega: '⚫',
                magnetic: '🧲',
                long: '📏'
            };
            
            const colors = {
                fire: '#FF4500',
                mega: '#FFA500',
                magnetic: '#00FFFF',
                long: '#32CD32'
            };
            
            // 배경 바
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(xPos - 5, yOffset - 5, barWidth + 30, barHeight + 10);
            
            // 아이콘
            ctx.font = '12px Arial';
            ctx.fillText(icons[key], xPos - 18, yOffset + 6);
            
            // 게이지 배경
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(xPos, yOffset, barWidth, barHeight);
            
            // 게이지 진행
            ctx.fillStyle = colors[key];
            ctx.fillRect(xPos, yOffset, barWidth * percentage, barHeight);
            
            // 테두리
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(xPos, yOffset, barWidth, barHeight);
            
            yOffset += 18;
        }
    }
}

// ✨ Phase 1: 튜토리얼 툴팁 그리기
function drawTutorial() {
    if (showTutorial && tutorialOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = tutorialOpacity;
        
        // 반투명 배경
        const boxWidth = 280;
        const boxHeight = 60;
        const boxX = (WIDTH - boxWidth) / 2;
        const boxY = HEIGHT / 2 - 50;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // 테두리
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // 텍스트
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👆 화면을 터치하여', WIDTH / 2, boxY + 25);
        ctx.fillText('패들을 이동하세요', WIDTH / 2, boxY + 45);
        
        ctx.restore();
        
        // 페이드아웃 효과
        tutorialOpacity -= 0.005;
        if (tutorialOpacity <= 0) {
            showTutorial = false;
        }
    }
}

// 공 그리기
function drawBall(ball) {
    // 트레일
    if (ball.trail && ball.trail.length > 0) {
        for (let i = 0; i < ball.trail.length; i++) {
            const t = ball.trail[i];
            const alpha = (i + 1) / ball.trail.length * 0.5;
            ctx.beginPath();
            ctx.arc(t.x, t.y, ball.radius * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = ball.isFire ? `rgba(255, 100, 0, ${alpha})` : `rgba(255, 221, 0, ${alpha})`;
            ctx.fill();
            ctx.closePath();
        }
    }
    
    // 메가볼 후광
    if (ball.isMega) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(ball.x, ball.y, ball.radius, ball.x, ball.y, ball.radius + 8);
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }
    
    // 파이어볼 불꽃
    if (ball.isFire) {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * ball.radius;
            const x = ball.x + Math.cos(angle) * dist;
            const y = ball.y + Math.sin(angle) * dist;
            
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.5 ? '#FF4500' : '#FFA500';
            ctx.fill();
            ctx.closePath();
        }
    }
    
    // 메인 공
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    
    if (ball.isFire) {
        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        gradient.addColorStop(0, '#FFFF00');
        gradient.addColorStop(0.5, '#FF4500');
        gradient.addColorStop(1, '#FF0000');
        ctx.fillStyle = gradient;
    } else if (ball.isMega) {
        ctx.fillStyle = '#FFA500';
    } else {
        ctx.fillStyle = ball.color || "#FFDD00";
    }
    
    ctx.fill();
    ctx.closePath();
    
    // 하이라이트
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.closePath();
}

// ✨ Phase 1: 향상된 패들 그리기 (입체감)
function drawPaddle() {
    // 자석 효과
    if (isMagneticActive) {
        const paddleCenterX = paddleX + PADDLE_WIDTH / 2;
        const paddleCenterY = HEIGHT - PADDLE_HEIGHT / 2;
        
        const time = Date.now() / 1000;
        for (let i = 0; i < 3; i++) {
            const wave = ((time * 2 + i * 0.5) % 2) * MAGNETIC_RANGE;
            ctx.beginPath();
            ctx.arc(paddleCenterX, paddleCenterY, wave, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${1 - wave / MAGNETIC_RANGE / 2})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }
    
    // ✨ Phase 1: 그림자 효과
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(paddleX + 2, HEIGHT - PADDLE_HEIGHT + 2, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // 패들 그라데이션
    const gradient = ctx.createLinearGradient(paddleX, HEIGHT - PADDLE_HEIGHT, paddleX, HEIGHT);
    
    if (isMagneticActive) {
        gradient.addColorStop(0, '#00FFFF');
        gradient.addColorStop(1, '#0088AA');
    } else if (isLongPaddleActive) {
        gradient.addColorStop(0, '#FF6B35');
        gradient.addColorStop(1, '#CC3300');
    } else {
        gradient.addColorStop(0, '#0095DD');
        gradient.addColorStop(1, '#006699');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // ✨ Phase 1: 상단 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, 3);
    
    // 테두리
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
}

// ✨ Phase 1: 향상된 벽돌 그리기 (입체감 + 그림자)
function drawBricks() {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            if(bricks[c] && bricks[c][r] && bricks[c][r].status === 1) { 
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                // ✨ Phase 1: 그림자
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(brickX + 2, brickY + 2, brickWidth, brickHeight);
                
                // 벽돌 그라데이션
                const hue = 360 / brickRowCount * r;
                const gradient = ctx.createLinearGradient(brickX, brickY, brickX, brickY + brickHeight);
                gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
                gradient.addColorStop(1, `hsl(${hue}, 80%, 40%)`);
                
                ctx.fillStyle = gradient;
                ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                
                // ✨ Phase 1: 상단 하이라이트 (입체감)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(brickX, brickY, brickWidth, 3);
                
                // ✨ Phase 1: 하단 어둡게 (입체감)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(brickX, brickY + brickHeight - 3, brickWidth, 3);
                
                // 테두리
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(brickX, brickY, brickWidth, brickHeight);
            }
        }
    }
}

// ✨ Phase 1: 향상된 파워업 그리기
function drawPowerups() {
    for (const p of powerups) {
        // 후광 펄스 효과
        const pulseSize = 3 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '40';
        ctx.fill();
        ctx.closePath();
        
        // 파워업 본체
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        
        // 아이콘
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.icon, p.x, p.y);
    }
}

// 파티클 그리기
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('rgb', 'rgba');
        ctx.fill();
        ctx.closePath();
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

console.log("✅ Phase 1 - Part 2 로드 완료");
// =======================================================
// 벽돌깨기 게임 - PHASE 1 UPGRADE
// Part 3: 충돌 처리, 게임 로직, 메인 루프
// =======================================================

// 파워업 활성화 함수들

function activateLongPaddle() {
    if (isLongPaddleActive && longPaddleTimer) {
        clearTimeout(longPaddleTimer);
    }
    
    const config = LEVEL_CONFIGS[level];
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio * 2;
    isLongPaddleActive = true;
    
    // ✨ Phase 1: 타이머 상태 업데이트
    activePowerups.long.active = true;
    activePowerups.long.remaining = LONG_PADDLE_DURATION;
    
    longPaddleTimer = setTimeout(() => {
        PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
        isLongPaddleActive = false;
        longPaddleTimer = null;
        activePowerups.long.active = false;
    }, LONG_PADDLE_DURATION);
    
    playSound('powerup');
}

function activateMegaBall() {
    balls.forEach(ball => {
        ball.radius = 24;
        ball.isMega = true;
    });
    
    // ✨ Phase 1: 타이머 상태 업데이트
    activePowerups.mega.active = true;
    activePowerups.mega.remaining = 10000;
    
    playSound('powerup');
    
    setTimeout(() => {
        balls.forEach(ball => {
            ball.radius = 8;
            ball.isMega = false;
        });
        activePowerups.mega.active = false;
    }, 10000);
}

function activateFireBall() {
    balls.forEach(ball => {
        ball.isFire = true;
    });
    
    // ✨ Phase 1: 타이머 상태 업데이트
    activePowerups.fire.active = true;
    activePowerups.fire.remaining = 12000;
    
    playSound('powerup');
    
    setTimeout(() => {
        balls.forEach(ball => {
            ball.isFire = false;
        });
        activePowerups.fire.active = false;
    }, 12000);
}

function activateMagnetic() {
    if (isMagneticActive && magneticTimer) {
        clearTimeout(magneticTimer);
    }
    
    isMagneticActive = true;
    
    // ✨ Phase 1: 타이머 상태 업데이트
    activePowerups.magnetic.active = true;
    activePowerups.magnetic.remaining = MAGNETIC_DURATION;
    
    playSound('powerup');
    
    magneticTimer = setTimeout(() => {
        isMagneticActive = false;
        magneticTimer = null;
        activePowerups.magnetic.active = false;
    }, MAGNETIC_DURATION);
}

function activateMultiball(ball) {
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    const angle1 = Math.PI / 6;
    const angle2 = -Math.PI / 6;
    
    balls.push({
        x: ball.x,
        y: ball.y,
        dx: speed * Math.cos(angle1),
        dy: -speed * Math.sin(angle1),
        radius: ball.radius,
        color: "#FFFF00",
        isMega: ball.isMega,
        isFire: ball.isFire,
        trail: []
    });
    
    balls.push({
        x: ball.x,
        y: ball.y,
        dx: speed * Math.cos(angle2),
        dy: -speed * Math.sin(angle2),
        radius: ball.radius,
        color: "#FFFF00",
        isMega: ball.isMega,
        isFire: ball.isFire,
        trail: []
    });
    
    playSound('powerup');
}

// ✨ Phase 1: 파워업 타이머 업데이트
function updatePowerupTimers(deltaTime) {
    for (let key in activePowerups) {
        if (activePowerups[key].active) {
            activePowerups[key].remaining -= deltaTime;
            if (activePowerups[key].remaining <= 0) {
                activePowerups[key].remaining = 0;
            }
        }
    }
}

// 충돌 처리 함수들

function powerupCollisionDetection() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        
        if (p.y + p.radius >= HEIGHT - PADDLE_HEIGHT &&
            p.y - p.radius <= HEIGHT &&
            p.x >= paddleX && 
            p.x <= paddleX + PADDLE_WIDTH) {
            
            if (p.type === 'LONG_PADDLE') {
                activateLongPaddle();
            } else if (p.type === 'MULTIBALL' && balls.length > 0) {
                activateMultiball(balls[0]); 
            } else if (p.type === 'MEGA_BALL') {
                activateMegaBall();
            } else if (p.type === 'FIRE_BALL') {
                activateFireBall();
            } else if (p.type === 'MAGNETIC') {
                activateMagnetic();
            }
            powerups.splice(i, 1);
        }
        else if (p.y > HEIGHT) {
            powerups.splice(i, 1);
        } else {
            p.y += p.dy;
        }
    }
}

function checkWinCondition() {
    if (bricksRemaining === 0) {
        if (descentTimer) {
            clearTimeout(descentTimer);
            descentTimer = null;
        }
        alert("YOU WIN, CONGRATULATIONS! 다음 레벨로 이동합니다.");
        const nextLevel = (level % (LEVEL_CONFIGS.length - 1)) + 1; 
        changeGameLevel(nextLevel);
    }
}

function brickCollisionDetection(ball) {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ball.x + ball.radius > b.x && 
                    ball.x - ball.radius < b.x + brickWidth && 
                    ball.y + ball.radius > b.y && 
                    ball.y - ball.radius < b.y + brickHeight) 
                {
                    b.status = 0; 
                    score += 10; 
                    bricksRemaining--;
                    playSound('crash'); 
                    
                    // 파티클 폭발
                    const brickColor = `hsl(${360 / brickRowCount * r}, 80%, 50%)`;
                    for (let i = 0; i < 15; i++) {
                        particles.push(new Particle(
                            b.x + brickWidth / 2,
                            b.y + brickHeight / 2,
                            brickColor
                        ));
                    }
                    
                    // 파이어볼 특수 효과
                    if (ball.isFire) {
                        for(let nc = Math.max(0, c - 1); nc <= Math.min(brickColumnCount - 1, c + 1); nc++) {
                            for(let nr = Math.max(0, r - 1); nr <= Math.min(brickRowCount - 1, r + 1); nr++) {
                                if (bricks[nc][nr].status === 1 && !(nc === c && nr === r)) {
                                    bricks[nc][nr].status = 0;
                                    score += 5;
                                    bricksRemaining--;
                                    
                                    for (let i = 0; i < 10; i++) {
                                        particles.push(new Particle(
                                            bricks[nc][nr].x + brickWidth / 2,
                                            bricks[nc][nr].y + brickHeight / 2,
                                            'rgb(255, 100, 0)'
                                        ));
                                    }
                                }
                            }
                        }
                    }
                    
                    const prevX = ball.x - ball.dx;
                    const prevY = ball.y - ball.dy;
                    
                    if (!ball.isMega) {
                        if (prevX <= b.x || prevX >= b.x + brickWidth) {
                            ball.dx = -ball.dx; 
                        } else {
                            ball.dy = -ball.dy; 
                        }
                    }
                    
                    if (Math.random() < POWERUP_PROBABILITY) {
                        powerups.push(new Powerup(b.x + brickWidth / 2, b.y + brickHeight / 2));
                    }
                    
                    checkWinCondition(); 
                    
                    if (!ball.isMega) return;
                }
            }
        }
    }
}

function ballWallAndPaddleCollision(ball, ballIndex) {
    // 트레일 업데이트
    if (!ball.trail) ball.trail = [];
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 5) ball.trail.shift();
    
    // 자석 패들 효과
    if (isMagneticActive) {
        const paddleCenterX = paddleX + PADDLE_WIDTH / 2;
        const paddleCenterY = HEIGHT - PADDLE_HEIGHT / 2;
        const dx = paddleCenterX - ball.x;
        const dy = paddleCenterY - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MAGNETIC_RANGE && ball.y > HEIGHT / 2) {
            const force = (1 - distance / MAGNETIC_RANGE) * MAGNETIC_FORCE;
            ball.dx += (dx / distance) * force;
            ball.dy += (dy / distance) * force;
        }
    }
    
    // 좌/우 벽 충돌
    if (ball.x + ball.dx > WIDTH - ball.radius) {
        ball.dx = -Math.abs(ball.dx); 
        ball.x = WIDTH - ball.radius; 
        playSound('ping');
    } else if (ball.x + ball.dx < ball.radius) {
        ball.dx = Math.abs(ball.dx); 
        ball.x = ball.radius; 
        playSound('ping');
    }
    
    // 상단 벽 충돌
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = Math.abs(ball.dy); 
        ball.y = ball.radius; 
        playSound('ping');
    } 
    
    // 패들 영역 충돌
    if (ball.y + ball.radius >= HEIGHT - PADDLE_HEIGHT) {
        if (ball.x >= paddleX && ball.x <= paddleX + PADDLE_WIDTH && ball.dy > 0) {
            ball.dy = -Math.abs(ball.dy); 
            ball.y = HEIGHT - PADDLE_HEIGHT - ball.radius; 
            playSound('crash'); 
            
            const relativeIntersectX = (ball.x - (paddleX + PADDLE_WIDTH / 2));
            const normalizedIntersect = relativeIntersectX / (PADDLE_WIDTH / 2);
            ball.dx += normalizedIntersect * 2;
        } 
        else if (ball.y > HEIGHT) {
            balls.splice(ballIndex, 1); 
            handleBallLoss();
        }
    }
}

function handleBallLoss() {
    if (balls.length === 0) {
        lives--;
        if (lives <= 0) {
            if (descentTimer) {
                clearTimeout(descentTimer);
                descentTimer = null;
            }
            sounds.bgm01.pause();
            sounds.bgm02.pause();
            playSound('gameOver'); 
            alert("GAME OVER! 최종 점수: " + score);
            document.location.reload(); 
        } else {
            const config = LEVEL_CONFIGS[level];
            const speed = BALL_SPEED_BASE * config.speed_ratio;
            balls.push({
                x: WIDTH / 2,
                y: HEIGHT - 80,
                dx: speed,
                dy: -speed,
                radius: 8,
                color: "#FFDD00",
                isMega: false,
                isFire: false,
                trail: []
            });
            paddleX = (WIDTH - PADDLE_WIDTH) / 2;
        }
    }
}

// 메인 게임 루프

let animationId;
let lastTime = Date.now();

function draw() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // ✨ Phase 1: 배경 그리기
    drawBackground();
    
    // ✨ Phase 1: UI 그리기
    drawTopUI();
    drawBricks(); 
    drawPaddle(); 
    drawPowerups();
    drawParticles();
    
    // ✨ Phase 1: 파워업 타이머 업데이트 & 그리기
    updatePowerupTimers(deltaTime);
    drawPowerupTimers();
    
    // ✨ Phase 1: 튜토리얼 그리기
    drawTutorial();

    // 공 처리
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

// 게임 시작

function initializeAndStartGame() {
    if (canvas) {
        resetGame(1); 
        descentTimer = setTimeout(descentBricks, descentInterval);
        draw();
    }
}

initializeAndStartGame();

console.log("✅ Phase 1 - Part 3 로드 완료");
console.log("🎮 Phase 1 업그레이드 완료! 게임 시작!");
