// =======================================================
// 벽돌깨기 게임 - 완전 통합 버전
// =======================================================

// 1. 캔버스 및 초기 설정
const canvas = document.getElementById('myGameCanvas');

if (!canvas) {
    console.error("Fatal Error: Canvas element not found.");
    alert("게임을 로드할 수 없습니다. 페이지를 새로고침해주세요.");
    throw new Error("Canvas element not found.");
}

const ctx = canvas.getContext('2d');

canvas.width = 480; 
canvas.height = 768;

const WIDTH = canvas.width;  
const HEIGHT = canvas.height; 

const BALL_SPEED_BASE = 4;
const PADDLE_HEIGHT = 12;
const PADDLE_WIDTH_BASE = 75; 

const LEVEL_CONFIGS = [
    null,
    { name: "Easy", icon: "⭐", paddle_ratio: 2.0, speed_ratio: 1.0, bgColor: '#1a1a2e' },
    { name: "Normal", icon: "⚡", paddle_ratio: 1.0, speed_ratio: 1.5, bgColor: '#0f0f1e' },
    { name: "Hard", icon: "🔥", paddle_ratio: 0.8, speed_ratio: 2.0, bgColor: '#000000' }
];

let balls = [];
let PADDLE_WIDTH = PADDLE_WIDTH_BASE; 
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let lives = 3; 
let score = 0;
let level = 1; 
let isPaused = false;
let isBgmPlaying = false; 
let isSfxEnabled = true;
let isLongPaddleActive = false;
let longPaddleTimer = null;
const LONG_PADDLE_DURATION = 10000;
let descentInterval = 10000;
let descentTimer = null;
let isMagneticActive = false;
let magneticTimer = null;
const MAGNETIC_DURATION = 15000;
const MAGNETIC_FORCE = 0.3;
const MAGNETIC_RANGE = 100;
let isLevelingUp = false;
let levelUpAnimation = {
    progress: 0,
    maxDuration: 2000,
    particles: []
};
let isMenuOpen = false;
let menuAnimation = 0;
let activePowerups = {
    fire: { active: false, remaining: 0, max: 12000 },
    mega: { active: false, remaining: 0, max: 10000 },
    magnetic: { active: false, remaining: 0, max: 15000 },
    long: { active: false, remaining: 0, max: 10000 }
};
let showTutorial = true;
let tutorialOpacity = 1.0;

const createSafeAudio = (path) => {
    try {
        const audio = new Audio(path);
        audio.onerror = () => console.warn(`Sound file failed to load: ${path}`);
        return audio;
    } catch (e) {
        console.warn(`Could not create Audio object for ${path}`);
        return { play: () => {}, pause: () => {}, loop: false, currentTime: 0 }; 
    }
};

const sounds = {
    ping: createSafeAudio('assets/sounds/ping.mp3'),
    crash: createSafeAudio('assets/sounds/crash.wav'),
    gameOver: createSafeAudio('assets/sounds/game_over.wav'),
    powerup: createSafeAudio('assets/sounds/powerup.mp3'),
    levelup: createSafeAudio('assets/sounds/powerup.mp3'),
    bgm01: createSafeAudio('assets/sounds/bgm01.mp3'),
    bgm02: createSafeAudio('assets/sounds/bgm02.mp3') 
};
sounds.bgm01.loop = true;
sounds.bgm02.loop = true;

function playSound(name) {
    if (!isSfxEnabled && name !== 'bgm01' && name !== 'bgm02') return;
    const audio = sounds[name];
    if (audio && audio.play) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log(`Sound failed: ${name}`));
    }
}

const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 10;
let brickOffsetTop = 60;
const totalBrickAreaWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (WIDTH - totalBrickAreaWidth) / 2; 
let bricks = [];
let bricksRemaining = 0;
let powerups = [];
const POWERUP_PROBABILITY = 0.20; 
let particles = [];

function Particle(x, y, color, isFirework = false) {
    this.x = x;
    this.y = y;
    if (isFirework) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    } else {
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4 - 2;
    }
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 3 + 2;
    this.gravity = 0.2;
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
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,1,0,0,1,0,1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,0,0,1,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,1,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,1]
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
            if (pattern[index] === 1) bricksRemaining++;
        }
    }
}

function descentBricks() {
    if (isPaused || isLevelingUp) {
        descentTimer = setTimeout(descentBricks, 100);
        return;
    }
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
            if (bricks[c][r].status === 1 && brickY + brickHeight >= HEIGHT - PADDLE_HEIGHT - 50) {
                clearTimeout(descentTimer);
                sounds.bgm01.pause();
                sounds.bgm02.pause();
                playSound('gameOver'); 
                setTimeout(() => {
                    if (confirm(`게임 오버!\n벽돌에 깔렸습니다.\n최종 점수: ${score}\n\n다시 시작하시겠습니까?`)) {
                        document.location.reload();
                    }
                }, 100);
                return;
            }
        }
    }
    brickOffsetTop += (brickHeight + brickPadding);
    descentTimer = setTimeout(descentBricks, descentInterval);
}

function resetGame(newLevel) {
    const config = LEVEL_CONFIGS[newLevel];
    level = newLevel;
    lives = 3; 
    score = 0;
    balls = [];
    powerups = [];
    particles = [];
    brickOffsetTop = 60; 
    isPaused = false;
    isLevelingUp = false;
    isLongPaddleActive = false;
    isMagneticActive = false;
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
    if (confirm(`${config.icon} ${config.name} 난이도로 변경하시겠습니까?\n\n현재 게임이 초기화됩니다.`)) {
        resetGame(newLevel);
        descentTimer = setTimeout(descentBricks, descentInterval);
        isMenuOpen = false;
    }
}

function mouseMoveHandler(e) {
    if (isPaused || isLevelingUp) return;
    const relativeX = e.clientX - canvas.offsetLeft;
    if(relativeX > 0 && relativeX < WIDTH) {
        paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, relativeX - PADDLE_WIDTH / 2));
    }
    if (showTutorial) showTutorial = false;
}

function touchMoveHandler(e) {
    if (isPaused || isLevelingUp) return;
    const touchX = e.touches[0].clientX - canvas.offsetLeft;
    if(touchX > 0 && touchX < WIDTH) {
        paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, touchX - PADDLE_WIDTH / 2));
    }
    e.preventDefault(); 
    if (showTutorial) showTutorial = false;
    if (!isBgmPlaying) {
        const bgmToPlay = (level === 2 ? sounds.bgm02 : sounds.bgm01);
        bgmToPlay.play().then(() => {
            isBgmPlaying = true;
        }).catch(e => console.warn("BGM playback blocked"));
    }
}

function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    if (isMenuOpen) isPaused = true;
}

function togglePause() {
    isPaused = !isPaused;
}

function toggleBGM() {
    isBgmPlaying = !isBgmPlaying;
    if (isBgmPlaying) {
        const bgmToPlay = (level === 2 ? sounds.bgm02 : sounds.bgm01);
        bgmToPlay.play().catch(e => console.log("BGM 재생 실패"));
    } else {
        sounds.bgm01.pause();
        sounds.bgm02.pause();
    }
}

function toggleSFX() {
    isSfxEnabled = !isSfxEnabled;
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 50 && y < 50) {
        toggleMenu();
        return;
    }
    if (isMenuOpen) handleMenuClick(x, y);
});

function handleMenuClick(x, y) {
    const menuWidth = 200;
    if (x > menuWidth) {
        isMenuOpen = false;
        isPaused = false;
        return;
    }
    if (y >= 80 && y <= 130) changeGameLevel(1);
    else if (y >= 140 && y <= 190) changeGameLevel(2);
    else if (y >= 200 && y <= 250) changeGameLevel(3);
    else if (y >= 280 && y <= 310) toggleBGM();
    else if (y >= 320 && y <= 350) toggleSFX();
    else if (y >= 380 && y <= 420) {
        isMenuOpen = false;
        togglePause();
    }
    else if (y >= 430 && y <= 470) {
        if (confirm('게임을 다시 시작하시겠습니까?')) {
            resetGame(level);
            descentTimer = setTimeout(descentBricks, descentInterval);
            isMenuOpen = false;
        }
    }
    else if (y >= 480 && y <= 520) {
        isMenuOpen = false;
        isPaused = false;
    }
}

document.addEventListener('mousemove', mouseMoveHandler, false); 
document.addEventListener('touchmove', touchMoveHandler, false);

// 그리기 함수들

function drawBackground() {
    const config = LEVEL_CONFIGS[level];
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

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

function drawHamburgerIcon() {
    const x = 25, y = 25, lineWidth = 20, lineHeight = 3, spacing = 6;
    ctx.fillStyle = '#00FFFF';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;
    ctx.fillRect(x - lineWidth/2, y - spacing - lineHeight/2, lineWidth, lineHeight);
    ctx.fillRect(x - lineWidth/2, y - lineHeight/2, lineWidth, lineHeight);
    ctx.fillRect(x - lineWidth/2, y + spacing - lineHeight/2, lineWidth, lineHeight);
    ctx.shadowBlur = 0;
}

function drawTopUI() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, WIDTH, 50);
    drawHamburgerIcon();
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillText(`${score}`, WIDTH / 2, 32);
    ctx.shadowBlur = 0;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('🏆', WIDTH / 2 - 40, 30);
    let heartX = WIDTH - 85;
    for (let i = 0; i < 3; i++) {
        drawHeart(heartX, 25, 8, i < lives);
        heartX += 25;
    }
    const config = LEVEL_CONFIGS[level];
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#00FFFF';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;
    ctx.fillText(`${config.icon} ${level}`, 60, 30);
    ctx.shadowBlur = 0;
}

function drawMenu() {
    if (!isMenuOpen && menuAnimation <= 0) return;
    if (isMenuOpen && menuAnimation < 1) {
        menuAnimation = Math.min(1, menuAnimation + 0.1);
    } else if (!isMenuOpen && menuAnimation > 0) {
        menuAnimation = Math.max(0, menuAnimation - 0.1);
    }
    const menuWidth = 200;
    const slideX = -menuWidth + (menuWidth * menuAnimation);
    if (menuAnimation > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * menuAnimation})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(slideX, 0, menuWidth, HEIGHT);
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(slideX, 0, menuWidth, HEIGHT);
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 15;
    ctx.fillText('🎮 MENU', slideX + 20, 40);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(slideX + 10, 60);
    ctx.lineTo(slideX + menuWidth - 10, 60);
    ctx.stroke();
    ctx.font = '14px Arial';
    ctx.fillStyle = '#AAA';
    ctx.fillText('난이도 선택:', slideX + 20, 80);
    const levels = [
        { y: 105, level: 1, icon: '⭐', name: 'Easy' },
        { y: 155, level: 2, icon: '⚡', name: 'Normal' },
        { y: 205, level: 3, icon: '🔥', name: 'Hard' }
    ];
    levels.forEach(item => {
        const isSelected = level === item.level;
        ctx.fillStyle = isSelected ? '#00FFFF' : '#FFF';
        ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
        if (isSelected) {
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 10;
        }
        ctx.fillText(`${item.icon} ${item.name} ${isSelected ? '✓' : ''}`, slideX + 30, item.y);
        ctx.shadowBlur = 0;
    });
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(slideX + 10, 240);
    ctx.lineTo(slideX + menuWidth - 10, 240);
    ctx.stroke();
    ctx.font = '14px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`🎵 BGM`, slideX + 30, 290);
    ctx.fillStyle = isBgmPlaying ? '#00FF00' : '#FF0000';
    ctx.fillText(isBgmPlaying ? '[ON]' : '[OFF]', slideX + 130, 290);
    ctx.fillStyle = '#FFF';
    ctx.fillText(`🔊 SFX`, slideX + 30, 330);
    ctx.fillStyle = isSfxEnabled ? '#00FF00' : '#FF0000';
    ctx.fillText(isSfxEnabled ? '[ON]' : '[OFF]', slideX + 130, 330);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(slideX + 10, 360);
    ctx.lineTo(slideX + menuWidth - 10, 360);
    ctx.stroke();
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`${isPaused ? '▶️' : '⏸️'} ${isPaused ? '계속하기' : '일시정지'}`, slideX + 30, 400);
    ctx.fillText('🔄 재시작', slideX + 30, 450);
    ctx.fillText('❌ 닫기', slideX + 30, 500);
}

function drawLevelUpAnimation() {
    if (!isLevelingUp) return;
    const anim = levelUpAnimation;
    const progress = anim.progress / anim.maxDuration;
    for (let p of anim.particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= 0.015;
    }
    if (progress > 0.15 && progress < 0.5) {
        ctx.save();
        ctx.translate(WIDTH / 2, HEIGHT / 2 - 50);
        const textProgress = (progress - 0.15) / 0.35;
        const scale = textProgress < 0.5 ? textProgress * 2 : 2 - textProgress * 2;
        const rotation = textProgress * Math.PI * 2;
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        const gradient = ctx.createLinearGradient(-100, 0, 100, 0);
        gradient.addColorStop(0, '#FF0000');
        gradient.addColorStop(0.2, '#FF7F00');
        gradient.addColorStop(0.4, '#FFFF00');
        gradient.addColorStop(0.6, '#00FF00');
        gradient.addColorStop(0.8, '#0000FF');
        gradient.addColorStop(1, '#8B00FF');
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = gradient;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFF';
        ctx.shadowBlur = 20;
        ctx.fillText('LEVEL UP!', 0, 0);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.strokeText('LEVEL UP!', 0, 0);
        ctx.restore();
    }
    if (progress > 0.5 && progress < 0.75) {
        const numProgress = (progress - 0.5) / 0.25;
        const y = HEIGHT / 2 - 100 + (100 * (1 - numProgress));
        const bounce = Math.abs(Math.sin(numProgress * Math.PI));
        ctx.save();
        ctx.globalAlpha = numProgress;
        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 30;
        ctx.fillText(level.toString(), WIDTH / 2, y + bounce * 20);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 4;
        ctx.strokeText(level.toString(), WIDTH / 2, y + bounce * 20);
        ctx.restore();
    }
    if (progress > 0.75) {
        const fadeProgress = (progress - 0.75) / 0.25;
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
}

function drawPowerupTimers() {
    let yOffset = 55;
    const barWidth = 100, barHeight = 8, xPos = WIDTH - barWidth - 15;
    for (let key in activePowerups) {
        const pw = activePowerups[key];
        if (pw.active && pw.remaining > 0) {
            const percentage = pw.remaining / pw.max;
            const icons = { fire: '🔥', mega: '⚫', magnetic: '🧲', long: '📏' };
            const colors = { fire: '#FF4500', mega: '#FFA500', magnetic: '#00FFFF', long: '#32CD32' };
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(xPos - 5, yOffset - 5, barWidth + 30, barHeight + 10);
            ctx.strokeStyle = colors[key];
            ctx.lineWidth = 1;
            ctx.strokeRect(xPos - 5, yOffset - 5, barWidth + 30, barHeight + 10);
            ctx.font = '12px Arial';
            ctx.fillText(icons[key], xPos - 18, yOffset + 6);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(xPos, yOffset, barWidth, barHeight);
            ctx.fillStyle = colors[key];
            ctx.shadowColor = colors[key];
            ctx.shadowBlur = 10;
            ctx.fillRect(xPos, yOffset, barWidth * percentage, barHeight);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(xPos, yOffset, barWidth, barHeight);
            yOffset += 18;
        }
    }
}

function drawTutorial() {
    if (showTutorial && tutorialOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = tutorialOpacity;
        const boxWidth = 280, boxHeight = 60;
        const boxX = (WIDTH - boxWidth) / 2, boxY = HEIGHT / 2 - 50;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 15;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👆 화면을 터치하여', WIDTH / 2, boxY + 25);
        ctx.fillText('패들을 이동하세요', WIDTH / 2, boxY + 45);
        ctx.restore();
        tutorialOpacity -= 0.005;
        if (tutorialOpacity <= 0) showTutorial = false;
    }
}

function drawBall(ball) {
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
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(paddleX + 2, HEIGHT - PADDLE_HEIGHT + 2, PADDLE_WIDTH, PADDLE_HEIGHT);
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
    ctx.shadowColor = isMagneticActive ? '#00FFFF' : isLongPaddleActive ? '#FF6B35' : '#0095DD';
    ctx.shadowBlur = 15;
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, 3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddleX, HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
}

function drawBricks() {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            if(bricks[c] && bricks[c][r] && bricks[c][r].status === 1) { 
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(brickX + 2, brickY + 2, brickWidth, brickHeight);
                const hue = 360 / brickRowCount * r;
                const gradient = ctx.createLinearGradient(brickX, brickY, brickX, brickY + brickHeight);
                gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
                gradient.addColorStop(1, `hsl(${hue}, 80%, 40%)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(brickX, brickY, brickWidth, 3);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(brickX, brickY + brickHeight - 3, brickWidth, 3);
                ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
                ctx.shadowColor = `hsl(${hue}, 80%, 50%)`;
                ctx.shadowBlur = 5;
                ctx.lineWidth = 1;
                ctx.strokeRect(brickX, brickY, brickWidth, brickHeight);
                ctx.shadowBlur = 0;
            }
        }
    }
}

function drawPowerups() {
    for (const p of powerups) {
        const pulseSize = 3 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '40';
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.icon, p.x, p.y);
    }
}

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
        p.vy += p.gravity;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawPauseOverlay() {
    if (!isPaused || isMenuOpen) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#00FFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 30;
    ctx.fillText('⏸️ PAUSED', WIDTH / 2, HEIGHT / 2);
    ctx.shadowBlur = 0;
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('메뉴를 열어 계속하기', WIDTH / 2, HEIGHT / 2 + 50);
}
// 파워업 활성화 함수들

function activateLongPaddle() {
    if (isLongPaddleActive && longPaddleTimer) {
        clearTimeout(longPaddleTimer);
    }
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
    playSound('powerup');
}

function activateMegaBall() {
    balls.forEach(ball => {
        ball.radius = 24;
        ball.isMega = true;
    });
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
    playSound('levelup');
    levelUpAnimation.particles = [];
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF', '#FFD700', '#FFF'];
    for (let i = 0; i < 80; i++) {
        levelUpAnimation.particles.push(new Particle(
            WIDTH / 2,
            HEIGHT / 2,
            colors[Math.floor(Math.random() * colors.length)],
            true
        ));
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

// 충돌 처리 함수들

function powerupCollisionDetection() {
    if (isPaused || isLevelingUp) return;
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
                    playSound('crash'); 
                    const brickColor = `hsl(${360 / brickRowCount * r}, 80%, 50%)`;
                    for (let i = 0; i < 15; i++) {
                        particles.push(new Particle(
                            b.x + brickWidth / 2,
                            b.y + brickHeight / 2,
                            brickColor
                        ));
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
        playSound('ping');
    } else if (ball.x + ball.dx < ball.radius) {
        ball.dx = Math.abs(ball.dx); 
        ball.x = ball.radius; 
        playSound('ping');
    }
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = Math.abs(ball.dy); 
        ball.y = ball.radius; 
        playSound('ping');
    } 
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

// 메인 게임 루프

let animationId;
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
    animationId = requestAnimationFrame(draw);
}

// 게임 시작

function initializeAndStartGame() {
    if (canvas) {
        console.log("🎮 게임 초기화 중...");
        resetGame(1); 
        descentTimer = setTimeout(descentBricks, descentInterval);
        console.log("✅ 게임 시작!");
        draw();
    } else {
        console.error("❌ 캔버스를 찾을 수 없습니다!");
    }
}

initializeAndStartGame();

console.log("🎉 게임 완전 로드 완료!");
console.log("━━━━━━━━━━━━━━━━━━━━━━");
console.log("📋 기능 목록:");
console.log("  ✅ 레벨업 폭죽 애니메이션");
console.log("  ✅ 사이버펑크 네온 효과");
console.log("  ✅ 햄버거 슬라이드 메뉴");
console.log("  ✅ 일시정지 기능");
console.log("  ✅ BGM/SFX 토글");
console.log("  ✅ 파워업 타이머 게이지");
console.log("  ✅ 파이어볼 (주변 폭발)");
console.log("  ✅ 메가볼 (관통)");
console.log("  ✅ 자석 패들");
console.log("━━━━━━━━━━━━━━━━━━━━━━");
