// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 NEON BREAKOUT - Phase 1 (안정화 버전)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// 패들 설정
const PADDLE_WIDTH_BASE = 120;
let PADDLE_WIDTH = PADDLE_WIDTH_BASE;
const PADDLE_HEIGHT = 15;
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;

// 볼 설정
const BALL_SPEED_BASE = 4;
let balls = [];

// 벽돌 설정
const brickRowCount = 6;
const brickColumnCount = 10;
const brickWidth = 70;
const brickHeight = 25;
const brickPadding = 10;
const brickOffsetTop = 80;
const brickOffsetLeft = 35;

let bricks = [];
let bricksRemaining = 0;

// 게임 상태
let score = 0;
let lives = 3;
let level = 1;
let isPaused = false;
let isLevelingUp = false;

// 입력 상태
let rightPressed = false;
let leftPressed = false;

// 파워업
let powerups = [];
const POWERUP_PROBABILITY = 0.15;

// 파티클
let particles = [];

// 타이머
let descentTimer = null;
const descentInterval = 30000;
let descentCount = 0;
const maxDescent = 3;

// 파워업 타이머
let isLongPaddleActive = false;
let longPaddleTimer = null;
const LONG_PADDLE_DURATION = 15000;

let isMagneticActive = false;
let magneticTimer = null;
const MAGNETIC_DURATION = 10000;
const MAGNETIC_RANGE = 150;
const MAGNETIC_FORCE = 0.8;

let activePowerups = {
    long: { active: false, remaining: 0 },
    mega: { active: false, remaining: 0 },
    fire: { active: false, remaining: 0 },
    magnetic: { active: false, remaining: 0 }
};

// 레벨 설정
const LEVEL_CONFIGS = [
    { speed_ratio: 1.0, paddle_ratio: 1.0 },
    { speed_ratio: 1.0, paddle_ratio: 1.0 },
    { speed_ratio: 1.1, paddle_ratio: 0.95 },
    { speed_ratio: 1.2, paddle_ratio: 0.9 },
    { speed_ratio: 1.3, paddle_ratio: 0.85 },
    { speed_ratio: 1.4, paddle_ratio: 0.8 }
];

// 레벨업 애니메이션
let levelUpAnimation = {
    particles: [],
    progress: 0,
    maxDuration: 3000
};

// 메뉴 상태
let isMenuOpen = false;

// 튜토리얼
let showTutorial = true;

// 파티클 클래스
class Particle {
    constructor(x, y, color, isFirework = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * (isFirework ? 8 : 4);
        this.vy = (Math.random() - 0.5) * (isFirework ? 8 : 4) - (isFirework ? 2 : 0);
        this.gravity = isFirework ? 0.15 : 0.3;
        this.life = 1.0;
        this.size = isFirework ? Math.random() * 4 + 2 : Math.random() * 3 + 1;
    }
}

// 파워업 클래스
class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.dy = 2;
        const types = ['LONG_PADDLE', 'MULTIBALL', 'MEGA_BALL', 'FIRE_BALL', 'MAGNETIC'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        const colors = {
            'LONG_PADDLE': '#00FF00',
            'MULTIBALL': '#FFFF00',
            'MEGA_BALL': '#FF00FF',
            'FIRE_BALL': '#FF4500',
            'MAGNETIC': '#00FFFF'
        };
        this.color = colors[this.type];
        
        const icons = {
            'LONG_PADDLE': '⬌',
            'MULTIBALL': '⚉',
            'MEGA_BALL': '●',
            'FIRE_BALL': '🔥',
            'MAGNETIC': '🧲'
        };
        this.icon = icons[this.type];
    }
}

// 키보드 이벤트
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        isPaused = !isPaused;
    } else if (e.key === "Escape") {
        e.preventDefault();
        isMenuOpen = !isMenuOpen;
        isPaused = isMenuOpen;
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

// 터치 이벤트
let touchX = null;

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchX = e.touches[0].clientX;
});

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!touchX) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    
    paddleX = x - PADDLE_WIDTH / 2;
    if (paddleX < 0) paddleX = 0;
    if (paddleX + PADDLE_WIDTH > WIDTH) paddleX = WIDTH - PADDLE_WIDTH;
});

canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchX = null;
});

// 게임 초기화
function resetGame(newLevel) {
    level = newLevel;
    const config = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
    paddleX = (WIDTH - PADDLE_WIDTH) / 2;
    
    const speed = BALL_SPEED_BASE * config.speed_ratio;
    balls = [{
        x: WIDTH / 2,
        y: HEIGHT - 80,
        dx: speed,
        dy: -speed,
        radius: 8,
        color: "#FFDD00",
        isMega: false,
        isFire: false,
        trail: []
    }];
    
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = {
                x: brickOffsetLeft + c * (brickWidth + brickPadding),
                y: brickOffsetTop + r * (brickHeight + brickPadding),
                status: 1
            };
        }
    }
    
    bricksRemaining = brickRowCount * brickColumnCount;
    powerups = [];
    particles = [];
    descentCount = 0;
    
    isLongPaddleActive = false;
    isMagneticActive = false;
    if (longPaddleTimer) clearTimeout(longPaddleTimer);
    if (magneticTimer) clearTimeout(magneticTimer);
    
    activePowerups = {
        long: { active: false, remaining: 0 },
        mega: { active: false, remaining: 0 },
        fire: { active: false, remaining: 0 },
        magnetic: { active: false, remaining: 0 }
    };
}

// 벽돌 하강
function descentBricks() {
    if (isPaused || isLevelingUp) {
        descentTimer = setTimeout(descentBricks, 1000);
        return;
    }
    
    if (descentCount >= maxDescent) return;
    
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                bricks[c][r].y += brickHeight + brickPadding;
            }
        }
    }
    
    descentCount++;
    
    if (descentCount < maxDescent) {
        descentTimer = setTimeout(descentBricks, descentInterval);
    }
}

// 그리기 함수들
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawTopUI() {
    ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
    ctx.fillRect(0, 0, WIDTH, 60);
    
    ctx.font = "bold 20px 'Courier New'";
    ctx.fillStyle = "#0ff";
    ctx.fillText(`점수: ${score}`, 20, 35);
    ctx.fillText(`레벨: ${level}`, WIDTH / 2 - 40, 35);
    ctx.fillText(`생명: ${"❤️".repeat(lives)}`, WIDTH - 150, 35);
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const b = bricks[c][r];
                const hue = (360 / brickRowCount) * r;
                
                ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
                ctx.fillRect(b.x, b.y, brickWidth, brickHeight);
                ctx.shadowBlur = 0;
                
                ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
                ctx.lineWidth = 2;
                ctx.strokeRect(b.x, b.y, brickWidth, brickHeight);
            }
        }
    }
}

function drawPaddle() {
    const gradient = ctx.createLinearGradient(paddleX, 0, paddleX + PADDLE_WIDTH, 0);
    gradient.addColorStop(0, '#00FFFF');
    gradient.addColorStop(0.5, '#FF00FF');
    gradient.addColorStop(1, '#00FFFF');
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#0FF';
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;
}

function drawBall(ball) {
    if (ball.trail && ball.trail.length > 0) {
        for (let i = 0; i < ball.trail.length; i++) {
            const alpha = (i + 1) / ball.trail.length * 0.3;
            ctx.fillStyle = `rgba(255, 221, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(ball.trail[i].x, ball.trail[i].y, ball.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, ball.color || '#FFDD00');
    gradient.addColorStop(1, 'rgba(255, 221, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = ball.color || '#FFDD00';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawPowerups() {
    for (let p of powerups) {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.font = "16px Arial";
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.icon, p.x, p.y);
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= 0.02;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawPowerupTimers() {
    let y = 70;
    const powerupNames = {
        long: '⬌ 긴 패들',
        mega: '● 메가볼',
        fire: '🔥 파이어볼',
        magnetic: '🧲 자석'
    };
    
    for (let key in activePowerups) {
        if (activePowerups[key].active) {
            const remaining = activePowerups[key].remaining;
            const maxDuration = key === 'long' ? 15000 : key === 'mega' ? 10000 : key === 'fire' ? 12000 : 10000;
            const progress = remaining / maxDuration;
            
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(10, y, 150, 25);
            
            const colors = {
                long: '#00FF00',
                mega: '#FF00FF',
                fire: '#FF4500',
                magnetic: '#00FFFF'
            };
            
            ctx.fillStyle = colors[key];
            ctx.fillRect(10, y, 150 * progress, 25);
            
            ctx.strokeStyle = colors[key];
            ctx.lineWidth = 2;
            ctx.strokeRect(10, y, 150, 25);
            
            ctx.font = "12px Arial";
            ctx.fillStyle = "#FFF";
            ctx.textAlign = "left";
            ctx.fillText(powerupNames[key], 15, y + 17);
            
            y += 30;
        }
    }
}

function drawTutorial() {
    if (!showTutorial) return;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(WIDTH / 2 - 200, HEIGHT / 2 - 100, 400, 200);
    
    ctx.strokeStyle = "#0FF";
    ctx.lineWidth = 2;
    ctx.strokeRect(WIDTH / 2 - 200, HEIGHT / 2 - 100, 400, 200);
    
    ctx.font = "20px Arial";
    ctx.fillStyle = "#0FF";
    ctx.textAlign = "center";
    ctx.fillText("🎮 조작법", WIDTH / 2, HEIGHT / 2 - 60);
    
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FFF";
    ctx.fillText("← → : 패들 이동", WIDTH / 2, HEIGHT / 2 - 20);
    ctx.fillText("SPACE : 일시정지", WIDTH / 2, HEIGHT / 2 + 10);
    ctx.fillText("ESC : 메뉴", WIDTH / 2, HEIGHT / 2 + 40);
    
    ctx.fillStyle = "#0FF";
    ctx.fillText("클릭하여 시작", WIDTH / 2, HEIGHT / 2 + 80);
}

canvas.addEventListener('click', function hideTutorial() {
    if (showTutorial) {
        showTutorial = false;
        canvas.removeEventListener('click', hideTutorial);
    }
});

function drawPauseOverlay() {
    if (!isPaused || isMenuOpen) return;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "#0FF";
    ctx.textAlign = "center";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#0FF";
    ctx.fillText("일시정지", WIDTH / 2, HEIGHT / 2);
    ctx.shadowBlur = 0;
    
    ctx.font = "20px Arial";
    ctx.fillStyle = "#FFF";
    ctx.fillText("SPACE를 눌러 계속", WIDTH / 2, HEIGHT / 2 + 50);
}

function drawMenu() {
    if (!isMenuOpen) return;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#0FF";
    ctx.textAlign = "center";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#0FF";
    ctx.fillText("메뉴", WIDTH / 2, 100);
    ctx.shadowBlur = 0;
    
    ctx.font = "20px Arial";
    ctx.fillStyle = "#FFF";
    ctx.fillText("다시 시작 (R키)", WIDTH / 2, 250);
    ctx.fillText("ESC로 돌아가기", WIDTH / 2, 350);
}

document.addEventListener("keydown", function(e) {
    if (!isMenuOpen) return;
    if (e.key === 'r' || e.key === 'R') {
        document.location.reload();
    }
});

function drawLevelUpAnimation() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    for (let p of levelUpAnimation.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    ctx.font = "bold 64px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#FFD700";
    ctx.fillText(`레벨 ${level} 완료!`, WIDTH / 2, HEIGHT / 2 - 50);
    ctx.shadowBlur = 0;
    
    ctx.font = "36px Arial";
    ctx.fillStyle = "#FFF";
    ctx.fillText(`다음 레벨: ${(level % (LEVEL_CONFIGS.length - 1)) + 1}`, WIDTH / 2, HEIGHT / 2 + 50);
}

// 파워업 활성화
function activateLongPaddle() {
    if (isLongPaddleActive && longPaddleTimer) clearTimeout(longPaddleTimer);
    const config = LEVEL_CONFIGS[level];
    PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio * 2;
    isLongPaddleActive = true;
    activePowerups.long.active = true;
    activePowerups.long.remaining = LONG_PADDLE_DURATION;
    longPaddleTimer = setTimeout(() => {
        PADDLE_WIDTH = PADDLE_WIDTH_BASE * config.paddle_ratio;
        isLongPaddleActive = false;
        longPaddleTimer = null;
        activePowerups.long.active = false;
    }, LONG_PADDLE_DURATION);
}

function activateMegaBall() {
    balls.forEach(ball => {
        ball.radius = 24;
        ball.isMega = true;
    });
    activePowerups.mega.active = true;
    activePowerups.mega.remaining = 10000;
    setTimeout(() => {
        balls.forEach(ball => {
            ball.radius = 8;
            ball.isMega = false;
        });
        activePowerups.mega.active = false;
    }, 10000);
}

function activateFireBall() {
    balls.forEach(ball => ball.isFire = true);
    activePowerups.fire.active = true;
    activePowerups.fire.remaining = 12000;
    setTimeout(() => {
        balls.forEach(ball => ball.isFire = false);
        activePowerups.fire.active = false;
    }, 12000);
}

function activateMagnetic() {
    if (isMagneticActive && magneticTimer) clearTimeout(magneticTimer);
    isMagneticActive = true;
    activePowerups.magnetic.active = true;
    activePowerups.magnetic.remaining = MAGNETIC_DURATION;
    magneticTimer = setTimeout(() => {
        isMagneticActive = false;
        magneticTimer = null;
        activePowerups.magnetic.active = false;
    }, MAGNETIC_DURATION);
}

function activateMultiball(ball) {
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    balls.push({
        x: ball.x, y: ball.y,
        dx: speed * Math.cos(Math.PI / 6),
        dy: -speed * Math.sin(Math.PI / 6),
        radius: ball.radius, color: "#FFFF00",
        isMega: ball.isMega, isFire: ball.isFire, trail: []
    });
    balls.push({
        x: ball.x, y: ball.y,
        dx: speed * Math.cos(-Math.PI / 6),
        dy: -speed * Math.sin(-Math.PI / 6),
        radius: ball.radius, color: "#FFFF00",
        isMega: ball.isMega, isFire: ball.isFire, trail: []
    });
}

function updatePowerupTimers(deltaTime) {
    if (isPaused || isLevelingUp) return;
    for (let key in activePowerups) {
        if (activePowerups[key].active) {
            activePowerups[key].remaining -= deltaTime;
            if (activePowerups[key].remaining <= 0) {
                activePowerups[key].remaining = 0;
            }
        }
    }
}

function startLevelUpAnimation() {
    isLevelingUp = true;
    isPaused = true;
    levelUpAnimation.particles = [];
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF', '#FFD700', '#FFF'];
    for (let i = 0; i < 80; i++) {
        levelUpAnimation.particles.push(new Particle(WIDTH / 2, HEIGHT / 2, colors[Math.floor(Math.random() * colors.length)], true));
    }
    levelUpAnimation.progress = 0;
    
    setTimeout(() => {
        isLevelingUp = false;
        isPaused = false;
        const nextLevel = (level % (LEVEL_CONFIGS.length - 1)) + 1;
        resetGame(nextLevel);
        descentTimer = setTimeout(descentBricks, descentInterval);
    }, levelUpAnimation.maxDuration);
}

function updateLevelUpAnimation(deltaTime) {
    if (!isLevelingUp) return;
    levelUpAnimation.progress += deltaTime;
    for (let i = levelUpAnimation.particles.length - 1; i >= 0; i--) {
        const p = levelUpAnimation.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= 0.015;
        if (p.life <= 0) {
            levelUpAnimation.particles.splice(i, 1);
        }
    }
}

// 충돌 처리
function powerupCollisionDetection() {
    if (isPaused || isLevelingUp) return;
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (p.y + p.radius >= HEIGHT - PADDLE_HEIGHT &&
            p.y - p.radius <= HEIGHT &&
            p.x >= paddleX && 
            p.x <= paddleX + PADDLE_WIDTH) {
            if (p.type === 'LONG_PADDLE') activateLongPaddle();
            else if (p.type === 'MULTIBALL' && balls.length > 0) activateMultiball(balls[0]);
            else if (p.type === 'MEGA_BALL') activateMegaBall();
            else if (p.type === 'FIRE_BALL') activateFireBall();
            else if (p.type === 'MAGNETIC') activateMagnetic();
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
        startLevelUpAnimation();
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
                    ball.y - ball.radius < b.y + brickHeight) {
                    b.status = 0;
                    score += 10;
                    bricksRemaining--;
                    
                    const brickColor = `hsl(${360 / brickRowCount * r}, 80%, 50%)`;
                    for (let i = 0; i < 15; i++) {
                        particles.push(new Particle(b.x + brickWidth / 2, b.y + brickHeight / 2, brickColor));
                    }
                    
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
                    
                    if (!ball.isMega) {
                        const prevX = ball.x - ball.dx;
                        const prevY = ball.y - ball.dy;
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
    if (!ball.trail) ball.trail = [];
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 5) ball.trail.shift();
    
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
    
    if (ball.x + ball.dx > WIDTH - ball.radius) {
        ball.dx = -Math.abs(ball.dx);
        ball.x = WIDTH - ball.radius;
    } else if (ball.x + ball.dx < ball.radius) {
        ball.dx = Math.abs(ball.dx);
        ball.x = ball.radius;
    }
    
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = Math.abs(ball.dy);
        ball.y = ball.radius;
    }
    
    if (ball.y + ball.radius >= HEIGHT - PADDLE_HEIGHT) {
        if (ball.x >= paddleX && ball.x <= paddleX + PADDLE_WIDTH && ball.dy > 0) {
            ball.dy = -Math.abs(ball.dy);
            ball.y = HEIGHT - PADDLE_HEIGHT - ball.radius;
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
            setTimeout(() => {
                if (confirm(`게임 오버!\n최종 점수: ${score}\n\n다시 시작하시겠습니까?`)) {
                    document.location.reload();
                }
            }, 100);
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

function movePaddle() {
    if (rightPressed && paddleX < WIDTH - PADDLE_WIDTH) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }
}

// 메인 게임 루프
let lastTime = Date.now();

function draw() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    drawBackground();
    drawTopUI();
    drawBricks();
    drawPaddle();
    drawPowerups();
    drawParticles();
    updatePowerupTimers(deltaTime);
    drawPowerupTimers();
    drawTutorial();
    
    if (isLevelingUp) {
        updateLevelUpAnimation(deltaTime);
        drawLevelUpAnimation();
    }
    
    if (!isPaused && !isLevelingUp) {
        movePaddle();
        for (let i = balls.length - 1; i >= 0; i--) {
            let ball = balls[i];
            drawBall(ball);
            brickCollisionDetection(ball);
            ballWallAndPaddleCollision(ball, i);
            ball.x += ball.dx;
            ball.y += ball.dy;
        }
        powerupCollisionDetection();
    } else {
        for (let ball of balls) {
            drawBall(ball);
        }
    }
    
    drawPauseOverlay();
    drawMenu();
    requestAnimationFrame(draw);
}

// 게임 시작
resetGame(1);
descentTimer = setTimeout(descentBricks, descentInterval);
draw();

console.log("🎉 게임 시작!");
