// --------------------------------------------------
// משתנים גלובליים בסיסיים
// --------------------------------------------------
let selectedGame = '';
let playerName = '';

const playerNameDisplay = document.getElementById('playerNameDisplay');
const nameInput = document.getElementById('nameInput');
const startGameButton = document.getElementById('startGameButton');
const whatsappShareButton = document.getElementById('whatsappShare');
const backToMenuButton = document.getElementById('backToMenuButton');
const touchControls = document.getElementById('touchControls');
const gameMenu = document.getElementById('gameMenu');
const trophyGameButton = document.getElementById('trophyGameButton');
const originalGameButton = document.getElementById('originalGameButton');
const scoreboardButton = document.getElementById('scoreboardButton');
const nameInputContainer = document.getElementById('nameInputContainer');

const hud = document.getElementById('hud');
const healthDisplay = document.getElementById('health');
const stageDisplay = document.getElementById('stage');
const coinsDisplay = document.getElementById('coins');

const scoreboardOverlay = document.getElementById('scoreboardOverlay');
const scoreboardBody = document.getElementById('scoreboardBody');
const closeScoreboardButton = document.getElementById('closeScoreboardButton');

// טעינת כמות המטבעות מ-LocalStorage
let savedCoins = localStorage.getItem('playerCoins'); 
let playerCoins = savedCoins ? parseInt(savedCoins) : 0; 
coinsDisplay.textContent = playerCoins;

// ערכי התחלה
let moveSpeed = 0.1;       // מהירות תנועה
let bulletDamage = 10;     // נזק כדורים
let health = 100;          // חיים במשחק המקורי
let trophyHealth = 100;    // חיים במשחק הגביע

function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
}
if (isMobileDevice()) {
    touchControls.style.display = 'flex';
}

// --------------------------------------------------
//    TROPHY GAME VARIABLES
// --------------------------------------------------
let trophyScene, trophyCamera, trophyRenderer;
let trophyPlayer, trophyObstacles = [], trophyEnemies = [];
let trophyStage = 1;
let trophyControls = { forward: false, backward: false, left: false, right: false, lookLeft: false, lookRight: false };
let canJump = true;
let lastKillerPosition = new THREE.Vector3(0, 0, 0);
let trophyAnimationId;

// --------------------------------------------------
//    ORIGINAL GAME VARIABLES
// --------------------------------------------------
let gameScene, gameCamera, gameRenderer;
let gamePlayer, enemies = [], bullets = [], enemyBullets = [];
let stage = 1;
let gameControls = { forward: false, backward: false, left: false, right: false, lookLeft: false, lookRight: false };
let gameAnimationId;
let godMode = false;
let enemySpeedMultiplier = 1;
let boss = null; 

// --------------------------------------------------
//   בוס והתקפות מיוחדות
// --------------------------------------------------
const bossAttacks = [
    { name: "מכת אש", damage: 5 },
    { name: "מכת ברק", damage: 8 },
    { name: "מכת רעל", damage: 3 }
];
function getRandomBossAttack() {
    return bossAttacks[Math.floor(Math.random() * bossAttacks.length)];
}

// --------------------------------------------------
//   טעינת scoreboard (אם תרצה)
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadScoreboard();
});

// --------------------------------------------------
//      לחצנים בתפריט הראשי
// --------------------------------------------------
trophyGameButton.addEventListener('click', () => {
    selectedGame = 'trophy';
    gameMenu.style.display = 'none';
    nameInputContainer.classList.remove('hidden');
});

originalGameButton.addEventListener('click', () => {
    selectedGame = 'original';
    gameMenu.style.display = 'none';
    nameInputContainer.classList.remove('hidden');
});

scoreboardButton.addEventListener('click', () => {
    displayScoreboard();
});

startGameButton.addEventListener('click', () => {
    playerName = nameInput.value.trim();
    if (playerName === '') {
        alert('אנא הכנס את שמך כדי להתחיל את המשחק.');
        return;
    }
    nameInputContainer.classList.add('hidden');
    playerNameDisplay.textContent = playerName;
    hud.classList.remove('hidden');
    whatsappShareButton.classList.remove('hidden');
    backToMenuButton.classList.remove('hidden');

    if (isMobileDevice()) {
        touchControls.classList.remove('hidden');
    }

    coinsDisplay.textContent = playerCoins; 

    if (selectedGame === 'trophy') {
        initTrophyGame();
    } else if (selectedGame === 'original') {
        initOriginalGame();
    }
});

whatsappShareButton.addEventListener('click', () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`הצטרף אליי למשחק 3D מאתגר! שמי ${playerName}. הנה הקישור: `);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${text}${url}`;
    window.open(whatsappUrl, '_blank');
});

backToMenuButton.addEventListener('click', returnToMenu);

closeScoreboardButton.addEventListener('click', () => {
    scoreboardOverlay.style.display = 'none';
});

// --------------------------------------------------
//  פונקציה לחזרה לתפריט הראשי
// --------------------------------------------------
function returnToMenu() {
    hud.classList.add('hidden');
    whatsappShareButton.classList.add('hidden');
    backToMenuButton.classList.add('hidden');
    touchControls.classList.add('hidden');
    gameMenu.style.display = 'block';
    nameInputContainer.classList.add('hidden');
    nameInput.value = '';

    if (trophyAnimationId) cancelAnimationFrame(trophyAnimationId);
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);

    if (trophyRenderer) {
        trophyRenderer.domElement.parentNode.removeChild(trophyRenderer.domElement);
        trophyRenderer.dispose();
        trophyRenderer = null;
    }
    if (gameRenderer) {
        gameRenderer.domElement.parentNode.removeChild(gameRenderer.domElement);
        gameRenderer.dispose();
        gameRenderer = null;
    }
    removeGameEventListeners();
    removeTrophyEventListeners();
    removeTouchEventListeners();

    selectedGame = '';
    playerName = '';
    playerNameDisplay.textContent = '';
    godMode = false; 
    enemySpeedMultiplier = 1;
}

// --------------------------------------------------
//   שדרוגים (מהירות / חיים / נזק)
// --------------------------------------------------
const SPEED_UPGRADE_COST = 20;
const HEALTH_UPGRADE_COST = 30;
const DAMAGE_UPGRADE_COST = 40;

const upgradeSpeedButton = document.getElementById('upgradeSpeed');
if (upgradeSpeedButton) {
    upgradeSpeedButton.addEventListener('click', () => {
        if (playerCoins >= SPEED_UPGRADE_COST) {
            playerCoins -= SPEED_UPGRADE_COST;
            localStorage.setItem('playerCoins', playerCoins);
            coinsDisplay.textContent = playerCoins;

            moveSpeed += 0.05; 
            alert('המהירות שודרגה!');
        } else {
            alert('אין לך מספיק מטבעות לשדרוג מהירות!');
        }
    });
}

const upgradeHealthButton = document.getElementById('upgradeHealth');
if (upgradeHealthButton) {
    upgradeHealthButton.addEventListener('click', () => {
        if (playerCoins >= HEALTH_UPGRADE_COST) {
            playerCoins -= HEALTH_UPGRADE_COST;
            localStorage.setItem('playerCoins', playerCoins);
            coinsDisplay.textContent = playerCoins;

            health += 20;      
            trophyHealth += 20;
            alert('החיים שודרגו!');
        } else {
            alert('אין לך מספיק מטבעות לשדרוג חיים!');
        }
    });
}

const upgradeDamageButton = document.getElementById('upgradeDamage');
if (upgradeDamageButton) {
    upgradeDamageButton.addEventListener('click', () => {
        if (playerCoins >= DAMAGE_UPGRADE_COST) {
            playerCoins -= DAMAGE_UPGRADE_COST;
            localStorage.setItem('playerCoins', playerCoins);
            coinsDisplay.textContent = playerCoins;

            bulletDamage += 5; 
            alert('הנזק שודרג!');
        } else {
            alert('אין לך מספיק מטבעות לשדרוג נזק!');
        }
    });
}

// --------------------------------------------------
//   כפתור תפריט השדרוגים
// --------------------------------------------------
const upgradeMenuMainButton = document.getElementById('upgradeMenuMainButton'); 
if (upgradeMenuMainButton) {
    upgradeMenuMainButton.addEventListener('click', () => {
        gameMenu.style.display = 'none';
        document.getElementById('upgradeMenu').style.display = 'block';
    });
}

const upgradeMenuBackButton = document.getElementById('upgradeMenuBackButton'); 
if (upgradeMenuBackButton) {
    upgradeMenuBackButton.addEventListener('click', () => {
        document.getElementById('upgradeMenu').style.display = 'none';
        gameMenu.style.display = 'block';
    });
}

// --------------------------------------------------
//     פונקציות למשחק הגביע (Trophy)
// --------------------------------------------------
function initTrophyGame() {
    if (trophyAnimationId) cancelAnimationFrame(trophyAnimationId);
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);

    // ביטול רינדור קודם (אם יש)
    if (trophyRenderer) {
        trophyRenderer.domElement.parentNode.removeChild(trophyRenderer.domElement);
        trophyRenderer.dispose();
    }
    if (gameRenderer) {
        gameRenderer.domElement.parentNode.removeChild(gameRenderer.domElement);
        gameRenderer.dispose();
    }

    // איפוס ערכים
    trophyHealth = 100;
    trophyStage = 1;
    healthDisplay.textContent = trophyHealth;
    stageDisplay.textContent = trophyStage;
    coinsDisplay.textContent = playerCoins; 
    trophyObstacles = [];
    trophyEnemies = [];
    canJump = true;
    trophyControls = { forward: false, backward: false, left: false, right: false, lookLeft: false, lookRight: false };
    lastKillerPosition = new THREE.Vector3(0, 0, 0);
    moveSpeed = 0.1;

    // סצנה
    trophyScene = new THREE.Scene();
    trophyScene.background = new THREE.Color(0x87CEEB);

    // מצלמה
    trophyCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    trophyCamera.position.set(0, 5, 10);

    // רנדרר
    trophyRenderer = new THREE.WebGLRenderer({ antialias: true });
    trophyRenderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(trophyRenderer.domElement);

    // תאורה
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    trophyScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7);
    trophyScene.add(directionalLight);

    // רצפה
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'floor';
    floor.position.y = 0;
    trophyScene.add(floor);

    // שחקן
    const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
    const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    trophyPlayer = new THREE.Mesh(playerGeometry, playerMaterial);
    trophyPlayer.position.set(0, 1, 0);
    trophyPlayer.velocityY = 0;
    trophyScene.add(trophyPlayer);

    createTrophy();

    window.addEventListener('keydown', onKeyDownTrophy);
    window.addEventListener('keyup', onKeyUpTrophy);

    setupTouchControlsTrophy();

    animateTrophy();
}

function createTrophy() {
    // מנקה מכשולים קיימים
    trophyObstacles.forEach(obstacle => trophyScene.remove(obstacle));
    trophyObstacles = [];
    // מנקה אויבים קיימים
    trophyEnemies.forEach(e => trophyScene.remove(e.mesh));
    trophyEnemies = [];

    // יצירת אובייקט "גביע"
    const trophyGeometry = new THREE.ConeGeometry(0.5, 1, 32);
    const trophyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    const trophy = new THREE.Mesh(trophyGeometry, trophyMaterial);

    // ממקמים את הגביע במקום רנדומלי
    let x, z;
    let isValid = false;
    while(!isValid) {
        x = Math.random() * 180 - 90; 
        z = Math.random() * 180 - 90;
        const distanceToPlayer = Math.hypot(x - trophyPlayer.position.x, z - trophyPlayer.position.z);
        if (distanceToPlayer > 10) { 
            isValid = true;
        }
    }

    trophy.position.set(x, 0.5, z);
    trophy.rotation.x = Math.PI;
    trophy.name = 'trophy';
    trophyScene.add(trophy);

    createObstacles();
    if (trophyStage >= 3) {
        createGuards(trophy.position);
    }
}

function createObstacles() {
    // יצירת מכשולים בסיסית
    const baseCount = 5 + (trophyStage - 1)*2; 
    for (let i = 0; i < baseCount; i++) {
        const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
        const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

        let x, z;
        let isValid = false;
        while (!isValid) {
            x = Math.random() * 180 - 90;
            z = Math.random() * 180 - 90;
            const distanceToPlayer = Math.hypot(x - trophyPlayer.position.x, z - trophyPlayer.position.z);
            const trophyObj = trophyScene.getObjectByName('trophy');
            const distanceToTrophy = trophyObj ? Math.hypot(x - trophyObj.position.x, z - trophyObj.position.z) : 100;
            if (distanceToPlayer > 10 && distanceToTrophy > 5) {
                isValid = true;
            }
        }

        obstacle.position.set(x, 1, z);
        obstacle.name = 'obstacle';
        trophyScene.add(obstacle);
        trophyObstacles.push(obstacle);
    }
}

function createGuards(trophyPosition) {
    // יצירת אוייבים/שומרים סביב הגביע
    const guardGeometry = new THREE.BoxGeometry(1, 2, 1);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    const numGuards = Math.min(4 + trophyStage, 10); 
    const radius = 5 + trophyStage;
    for (let i = 0; i < numGuards; i++) {
        const angle = (i / numGuards) * Math.PI * 2;
        const x = trophyPosition.x + Math.cos(angle) * radius;
        const z = trophyPosition.z + Math.sin(angle) * radius;

        const guardMesh = new THREE.Mesh(guardGeometry, guardMaterial);
        guardMesh.position.set(x, 1, z);
        guardMesh.name = 'guard';

        trophyScene.add(guardMesh);

        trophyEnemies.push({
            mesh: guardMesh,
            angle: angle,
            radius: radius,
            speed: 0.01 + trophyStage * 0.005,
            center: trophyPosition.clone()
        });
    }
}

function onKeyDownTrophy(event) {
    switch (event.key) {
        case 'w':
        case 'ArrowUp':
            trophyControls.forward = true;
            break;
        case 's':
        case 'ArrowDown':
            trophyControls.backward = true;
            break;
        case 'a':
        case 'ArrowLeft':
            trophyControls.left = true;
            break;
        case 'd':
        case 'ArrowRight':
            trophyControls.right = true;
            break;
        case 'q':
            trophyControls.lookLeft = true;
            break;
        case 'e':
            trophyControls.lookRight = true;
            break;
        case ' ':
            if (canJump) {
                trophyPlayer.velocityY = 0.2;
                canJump = false;
            }
            break;
    }
}

function onKeyUpTrophy(event) {
    switch (event.key) {
        case 'w':
        case 'ArrowUp':
            trophyControls.forward = false;
            break;
        case 's':
        case 'ArrowDown':
            trophyControls.backward = false;
            break;
        case 'a':
        case 'ArrowLeft':
            trophyControls.left = false;
            break;
        case 'd':
        case 'ArrowRight':
            trophyControls.right = false;
            break;
        case 'q':
            trophyControls.lookLeft = false;
            break;
        case 'e':
            trophyControls.lookRight = false;
            break;
    }
}

function setupTouchControlsTrophy() {
    removeTouchEventListeners();
    document.getElementById('moveForward').addEventListener('touchstart', () => { trophyControls.forward = true; });
    document.getElementById('moveForward').addEventListener('touchend', () => { trophyControls.forward = false; });
    document.getElementById('moveBackward').addEventListener('touchstart', () => { trophyControls.backward = true; });
    document.getElementById('moveBackward').addEventListener('touchend', () => { trophyControls.backward = false; });
    document.getElementById('moveLeft').addEventListener('touchstart', () => { trophyControls.left = true; });
    document.getElementById('moveLeft').addEventListener('touchend', () => { trophyControls.left = false; });
    document.getElementById('moveRight').addEventListener('touchstart', () => { trophyControls.right = true; });
    document.getElementById('moveRight').addEventListener('touchend', () => { trophyControls.right = false; });
    document.getElementById('lookLeft').addEventListener('touchstart', () => { trophyControls.lookLeft = true; });
    document.getElementById('lookLeft').addEventListener('touchend', () => { trophyControls.lookLeft = false; });
    document.getElementById('lookRight').addEventListener('touchstart', () => { trophyControls.lookRight = true; });
    document.getElementById('lookRight').addEventListener('touchend', () => { trophyControls.lookRight = false; });
    document.getElementById('jump').addEventListener('touchstart', () => {
        if (canJump) {
            trophyPlayer.velocityY = 0.2;
            canJump = false;
        }
    });
}

function animateTrophy() {
    trophyAnimationId = requestAnimationFrame(animateTrophy);
    movePlayerTrophy();
    checkCollisionsTrophy();
    moveGuards();
    trophyCamera.position.set(
        trophyPlayer.position.x + Math.sin(trophyPlayer.rotation.y) * 10,
        trophyPlayer.position.y + 5,
        trophyPlayer.position.z + Math.cos(trophyPlayer.rotation.y) * 10
    );
    trophyCamera.lookAt(trophyPlayer.position);
    trophyRenderer.render(trophyScene, trophyCamera);
}

function movePlayerTrophy() {
    if (trophyControls.left) {
        trophyPlayer.rotation.y += 0.05;
    }
    if (trophyControls.right) {
        trophyPlayer.rotation.y -= 0.05;
    }

    const direction = new THREE.Vector3();
    if (trophyControls.forward) {
        direction.x -= Math.sin(trophyPlayer.rotation.y) * moveSpeed;
        direction.z -= Math.cos(trophyPlayer.rotation.y) * moveSpeed;
    }
    if (trophyControls.backward) {
        direction.x += Math.sin(trophyPlayer.rotation.y) * moveSpeed;
        direction.z += Math.cos(trophyPlayer.rotation.y) * moveSpeed;
    }

    const oldPosition = trophyPlayer.position.clone();
    trophyPlayer.position.add(direction);
    trophyPlayer.position.x = Math.max(-100, Math.min(100, trophyPlayer.position.x));
    trophyPlayer.position.z = Math.max(-100, Math.min(100, trophyPlayer.position.z));

    // כבידה פשוטה
    trophyPlayer.velocityY -= 0.01;
    trophyPlayer.position.y += trophyPlayer.velocityY;
    if (trophyPlayer.position.y <= 1) {
        trophyPlayer.position.y = 1;
        trophyPlayer.velocityY = 0;
        canJump = true;
    }

    // בדיקת התנגשות במכשולים
    const playerBox = new THREE.Box3().setFromObject(trophyPlayer);
    let collided = false;
    trophyObstacles.forEach(obstacle => {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (playerBox.intersectsBox(obstacleBox)) {
            collided = true;
        }
    });
    if (collided) {
        trophyPlayer.position.copy(oldPosition);
        trophyHealth -= 10;
        healthDisplay.textContent = trophyHealth;
        if (trophyHealth <= 0) {
            updateScoreboard('trophy', trophyStage);
            resetTrophyGame();
        }
    }
}

function moveGuards() {
    trophyEnemies.forEach(guard => {
        guard.angle += guard.speed;
        guard.mesh.position.x = guard.center.x + Math.cos(guard.angle) * guard.radius;
        guard.mesh.position.z = guard.center.z + Math.sin(guard.angle) * guard.radius;
        guard.mesh.rotation.y = -guard.angle + Math.PI / 2;
        if (trophyPlayer.position.distanceTo(guard.mesh.position) < 1.5) {
            trophyHealth -= 10;
            healthDisplay.textContent = trophyHealth;
            if (trophyHealth <= 0) {
                updateScoreboard('trophy', trophyStage);
                resetTrophyGame();
            }
        }
    });
}

function checkCollisionsTrophy() {
    const trophy = trophyScene.getObjectByName('trophy');
    if (trophy && trophyPlayer.position.distanceTo(trophy.position) < 1) {
        // השחקן אוסף את הגביע
        trophyScene.remove(trophy);
        playerCoins += 50;
        coinsDisplay.textContent = playerCoins;
        localStorage.setItem('playerCoins', playerCoins);
        trophyStage++;
        stageDisplay.textContent = trophyStage;
        increaseDifficulty();
        createTrophy();
    }
}

function resetTrophyGame() {
    trophyPlayer.position.set(0,1,0);
    trophyPlayer.rotation.y = 0;
    trophyStage = 1;
    trophyHealth = 100;
    healthDisplay.textContent = trophyHealth;
    stageDisplay.textContent = trophyStage;
    coinsDisplay.textContent = playerCoins; 
    moveSpeed = 0.1;
    trophyObstacles.forEach(o => trophyScene.remove(o));
    trophyObstacles = [];
    trophyEnemies.forEach(e => trophyScene.remove(e.mesh));
    trophyEnemies =[];

    const trophyObj = trophyScene.getObjectByName('trophy');
    if (trophyObj) trophyScene.remove(trophyObj);

    createTrophy();
}

// --------------------------------------------------
//     פונקציות למשחק המקורי (Original)
// --------------------------------------------------
function initOriginalGame() {
    if (trophyAnimationId) cancelAnimationFrame(trophyAnimationId);
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);

    // ביטול רינדור קודם (אם יש)
    if (gameRenderer) {
        gameRenderer.domElement.parentNode.removeChild(gameRenderer.domElement);
        gameRenderer.dispose();
    }
    if (trophyRenderer) {
        trophyRenderer.domElement.parentNode.removeChild(trophyRenderer.domElement);
        trophyRenderer.dispose();
    }

    // איפוס ערכים
    health = 100;
    stage = 1; 
    bulletDamage = 10;
    healthDisplay.textContent = health;
    stageDisplay.textContent = stage;
    coinsDisplay.textContent = playerCoins; 
    enemies = [];
    bullets = [];
    enemyBullets = [];
    gameControls = { forward: false, backward: false, left: false, right: false, lookLeft: false, lookRight: false };
    lastKillerPosition = new THREE.Vector3(0, 0, 0);
    moveSpeed = 0.1; 
    enemySpeedMultiplier = 1;
    godMode = false;
    boss = null;

    // סצנה
    gameScene = new THREE.Scene();
    gameScene.background = new THREE.Color(0x87CEEB);

    // מצלמה
    gameCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    gameCamera.position.set(0, 5, 10);

    // רנדרר
    gameRenderer = new THREE.WebGLRenderer({ antialias: true });
    gameRenderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(gameRenderer.domElement);

    // תאורה
    const ambientLightGame = new THREE.AmbientLight(0xffffff, 0.6);
    gameScene.add(ambientLightGame);

    const directionalLightGame = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLightGame.position.set(5, 10, 7);
    gameScene.add(directionalLightGame);

    // רצפה
    const floorGeometryGame = new THREE.PlaneGeometry(200, 200);
    const floorMaterialGame = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const floorGame = new THREE.Mesh(floorGeometryGame, floorMaterialGame);
    floorGame.rotation.x = -Math.PI / 2;
    floorGame.name = 'floor';
    floorGame.position.y = 0;
    gameScene.add(floorGame);

    // שחקן
    const playerGeometryGame = new THREE.BoxGeometry(1, 2, 1);
    const playerMaterialGame = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    gamePlayer = new THREE.Mesh(playerGeometryGame, playerMaterialGame);
    gamePlayer.position.set(0, 1, 0);
    gameScene.add(gamePlayer);

    createEnemiesOriginalGame(); 

    window.addEventListener('keydown', onKeyDownGame);
    window.addEventListener('keyup', onKeyUpGame);
    window.addEventListener('keydown', handleOriginalGameCheats);

    setupTouchControlsGame();

    animateGame();
}

function handleOriginalGameCheats(event) {
    switch(event.key) {
        case 'i':
            godMode = !godMode;
            break;
        case 'l':
            stage++;
            stageDisplay.textContent = stage;
            enemySpeedMultiplier += 0.1;
            bulletDamage += 5; 
            createEnemiesOriginalGame();
            break;
        case 'c':
            playerCoins += 100;
            coinsDisplay.textContent = playerCoins;
            localStorage.setItem('playerCoins', playerCoins);
            break;
    }
}

function onKeyDownGame(event) {
    switch (event.key) {
        case 'w':
        case 'ArrowUp':
            gameControls.forward = true;
            break;
        case 's':
        case 'ArrowDown':
            gameControls.backward = true;
            break;
        case 'a':
        case 'ArrowLeft':
            gameControls.left = true;
            break;
        case 'd':
        case 'ArrowRight':
            gameControls.right = true;
            break;
        case 'q':
            gameControls.lookLeft = true;
            break;
        case 'e':
            gameControls.lookRight = true;
            break;
        case ' ':
            shootBullet();
            break;
    }
}

function onKeyUpGame(event) {
    switch (event.key) {
        case 'w':
        case 'ArrowUp':
            gameControls.forward = false;
            break;
        case 's':
        case 'ArrowDown':
            gameControls.backward = false;
            break;
        case 'a':
        case 'ArrowLeft':
            gameControls.left = false;
            break;
        case 'd':
        case 'ArrowRight':
            gameControls.right = false;
            break;
        case 'q':
            gameControls.lookLeft = false;
            break;
        case 'e':
            gameControls.lookRight = false;
            break;
    }
}

function createEnemiesOriginalGame() {
    const enemyCount = stage; 
    const types = ['normal', 'fast', 'strong', 'shooter'];

    for (let i = 0; i < enemyCount; i++) {
        const enemyGeometry = new THREE.BoxGeometry(1, 2, 1);
        let enemyMaterial;
        const enemyType = types[Math.floor(Math.random() * types.length)];

        let enemyHealth = 20 + stage * 5;
        let enemySpeed = (0.02 + stage * 0.005) * enemySpeedMultiplier; 
        let enemyDamage = 10;

        switch (enemyType) {
            case 'fast':
                enemyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
                enemySpeed *= 1.5;
                enemyHealth *= 0.8;
                break;
            case 'strong':
                enemyMaterial = new THREE.MeshLambertMaterial({ color: 0x800080 });
                enemySpeed *= 0.7;
                enemyHealth *= 2;
                enemyDamage *= 1.5;
                break;
            case 'shooter':
                enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                enemySpeed *= 0.9;
                enemyHealth *= 1.2;
                break;
            default:
                enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        }

        const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemyMesh.position.set(Math.random()*180-90,1,Math.random()*180-90);

        enemies.push({
            mesh: enemyMesh,
            type: enemyType,
            health: enemyHealth,
            speed: enemySpeed,
            damage: enemyDamage
        });
        gameScene.add(enemyMesh);
    }
}

function setupTouchControlsGame() {
    removeTouchEventListeners();
    document.getElementById('moveForward').addEventListener('touchstart', () => { gameControls.forward = true; });
    document.getElementById('moveForward').addEventListener('touchend', () => { gameControls.forward = false; });
    document.getElementById('moveBackward').addEventListener('touchstart', () => { gameControls.backward = true; });
    document.getElementById('moveBackward').addEventListener('touchend', () => { gameControls.backward = false; });
    document.getElementById('moveLeft').addEventListener('touchstart', () => { gameControls.left = true; });
    document.getElementById('moveLeft').addEventListener('touchend', () => { gameControls.left = false; });
    document.getElementById('moveRight').addEventListener('touchstart', () => { gameControls.right = true; });
    document.getElementById('moveRight').addEventListener('touchend', () => { gameControls.right = false; });
    document.getElementById('lookLeft').addEventListener('touchstart', () => { gameControls.lookLeft = true; });
    document.getElementById('lookLeft').addEventListener('touchend', () => { gameControls.lookLeft = false; });
    document.getElementById('lookRight').addEventListener('touchstart', () => { gameControls.lookRight = true; });
    document.getElementById('lookRight').addEventListener('touchend', () => { gameControls.lookRight = false; });
    document.getElementById('shoot').addEventListener('touchstart', () => { shootBullet(); });
}

function animateGame() {
    gameAnimationId = requestAnimationFrame(animateGame);
    movePlayerGame();
    moveEnemiesOriginalGame();
    moveBullets();
    moveEnemyBullets();
    moveBoss();
    checkOriginalGameProgress();
    gameCamera.position.set(
        gamePlayer.position.x + Math.sin(gamePlayer.rotation.y) * 10,
        gamePlayer.position.y + 5,
        gamePlayer.position.z + Math.cos(gamePlayer.rotation.y) * 10
    );
    gameCamera.lookAt(gamePlayer.position);
    gameRenderer.render(gameScene, gameCamera);
}

function movePlayerGame() {
    if (gameControls.left) {
        gamePlayer.rotation.y += 0.05;
    }
    if (gameControls.right) {
        gamePlayer.rotation.y -= 0.05;
    }

    const direction = new THREE.Vector3();
    if (gameControls.forward) {
        direction.x -= Math.sin(gamePlayer.rotation.y) * moveSpeed;
        direction.z -= Math.cos(gamePlayer.rotation.y) * moveSpeed;
    }
    if (gameControls.backward) {
        direction.x += Math.sin(gamePlayer.rotation.y) * moveSpeed;
        direction.z += Math.cos(gamePlayer.rotation.y) * moveSpeed;
    }

    const oldPosition = gamePlayer.position.clone();
    gamePlayer.position.add(direction);
    gamePlayer.position.x = Math.max(-100, Math.min(100, gamePlayer.position.x));
    gamePlayer.position.z = Math.max(-100, Math.min(100, gamePlayer.position.z));

    // בדיקת התנגשות באויבים (אם נוגעים בשחקן)
    const playerBox = new THREE.Box3().setFromObject(gamePlayer);
    enemies.forEach(enemy => {
        const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
        if (playerBox.intersectsBox(enemyBox)) {
            if (!godMode) {
                health -= enemy.damage;
                healthDisplay.textContent = health;
                if (health <= 0) {
                    updateScoreboard('original', playerCoins);
                    resetOriginalGame();
                }
            }
            gamePlayer.position.copy(oldPosition);
        }
    });
}

function moveEnemiesOriginalGame() {
    enemies.forEach(enemy => {
        const direction = gamePlayer.position.clone().sub(enemy.mesh.position).normalize();
        enemy.mesh.position.add(direction.multiplyScalar(enemy.speed));

        if (Math.random() < 0.01) {
            shootEnemyBullet(enemy);
        }
    });
}

function shootEnemyBullet(enemy) {
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(enemy.mesh.position);
    bullet.direction = gamePlayer.position.clone().sub(enemy.mesh.position).normalize();
    bullet.enemyBullet = true; 
    enemyBullets.push(bullet);
    gameScene.add(bullet);
}

function moveBullets() {
    bullets.forEach((bullet,index) => {
        bullet.position.add(bullet.direction.clone().multiplyScalar(0.2));

        if (Math.abs(bullet.position.x) > 100 || Math.abs(bullet.position.z) > 100) {
            gameScene.remove(bullet);
            bullets.splice(index,1);
            return;
        }

        // פגיעה באויבים
        enemies.forEach((enemy, enemyIndex) => {
            const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
            const bulletBox = new THREE.Box3().setFromObject(bullet);
            if (bulletBox.intersectsBox(enemyBox)) {
                enemy.health -= bulletDamage;
                gameScene.remove(bullet);
                bullets.splice(index,1);
                if (enemy.health <= 0) {
                    gameScene.remove(enemy.mesh);
                    enemies.splice(enemyIndex, 1);
                    playerCoins += 10;
                    coinsDisplay.textContent = playerCoins;
                    localStorage.setItem('playerCoins', playerCoins);
                }
            }
        });

        // פגיעה בבוס
        if (boss) {
            const bossBox = new THREE.Box3().setFromObject(boss.mesh);
            const bulletBox = new THREE.Box3().setFromObject(bullet);
            if (bulletBox.intersectsBox(bossBox)) {
                boss.health -= bulletDamage;
                gameScene.remove(bullet);
                bullets.splice(index,1);
                if (boss.health <= 0) {
                    playerCoins += 100;
                    coinsDisplay.textContent = playerCoins;
                    localStorage.setItem('playerCoins', playerCoins);
                    gameScene.remove(boss.mesh);
                    boss = null;

                    stage++;
                    stageDisplay.textContent = stage;
                    bulletDamage += 5;
                    enemySpeedMultiplier += 0.1;
                    createEnemiesOriginalGame();
                }
            }
        }

        // התנגשות בין כדורי השחקן לכדורי האויב
        enemyBullets.forEach((enemyBullet) => {
            const enemyBulletBox = new THREE.Box3().setFromObject(enemyBullet);
            const bulletBox = new THREE.Box3().setFromObject(bullet);
            if (bulletBox.intersectsBox(enemyBulletBox)) {
                // הכדור שלנו הורס את הכדור של האויב
                gameScene.remove(bullet);
                bullets.splice(index,1);
                // ריקושט
                const normal = enemyBullet.position.clone().sub(bullet.position).normalize();
                const vOld = enemyBullet.direction.clone();
                const dot = vOld.dot(normal);
                const reflection = vOld.sub(normal.multiplyScalar(2 * dot));
                enemyBullet.direction = reflection.normalize();
            }
        });
    });
}

function moveEnemyBullets() {
    enemyBullets.forEach((bullet,index) => {
        bullet.position.add(bullet.direction.clone().multiplyScalar(0.05));
        if (Math.abs(bullet.position.x) > 100 || Math.abs(bullet.position.z) > 100) {
            gameScene.remove(bullet);
            enemyBullets.splice(index,1);
            return;
        }

        const playerBox = new THREE.Box3().setFromObject(gamePlayer);
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        if (bulletBox.intersectsBox(playerBox)) {
            if (!godMode) {
                if (bullet.bossAttack) {
                    health -= bullet.bossAttack.damage;
                } else {
                    health -= 10;
                }
                healthDisplay.textContent = health;
                if (health <= 0) {
                    updateScoreboard('original', playerCoins);
                    resetOriginalGame();
                }
            }
            gameScene.remove(bullet);
            enemyBullets.splice(index,1);
        }
    });
}

function shootBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.2,8,8);
    const bulletMaterial = new THREE.MeshLambertMaterial({color:0x00ff00});
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(gamePlayer.position);
    bullet.direction = new THREE.Vector3(
        -Math.sin(gamePlayer.rotation.y),0,-Math.cos(gamePlayer.rotation.y)
    );
    bullets.push(bullet);
    gameScene.add(bullet);
}

function checkOriginalGameProgress() {
    if (enemies.length === 0 && !boss) {
        if (stage % 5 === 0) {
            createBoss(stage);
        } else {
            stage++;
            stageDisplay.textContent = stage;
            bulletDamage += 5; 
            enemySpeedMultiplier += 0.1;
            createEnemiesOriginalGame();
        }
    }
}

function createBoss(currentStage) {
    const bossGeometry = new THREE.BoxGeometry(3, 6, 3);
    const bossMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
    const bossMesh = new THREE.Mesh(bossGeometry, bossMaterial);
    bossMesh.position.set(Math.random()*50-25, 3, Math.random()*50-25);

    boss = {
        mesh: bossMesh,
        health: 200 + currentStage * 50,
        speed: 0.015 + currentStage * 0.001, 
        damage: 20,
        shootCooldown: 0
    };

    gameScene.add(bossMesh);
}

function moveBoss() {
    if (!boss) return;

    const direction = gamePlayer.position.clone().sub(boss.mesh.position).normalize();
    boss.mesh.position.add(direction.multiplyScalar(boss.speed));

    boss.shootCooldown--;
    if (boss.shootCooldown <= 0) {
        shootBossBullets();
        boss.shootCooldown = 120; 
    }

    const playerBox = new THREE.Box3().setFromObject(gamePlayer);
    const bossBox = new THREE.Box3().setFromObject(boss.mesh);
    if (playerBox.intersectsBox(bossBox)) {
        if (!godMode) {
            health -= boss.damage;
            healthDisplay.textContent = health;
            if (health <= 0) {
                updateScoreboard('original', playerCoins);
                resetOriginalGame();
            }
        }
    }

    if (boss.health <= 0) {
        playerCoins += 100; 
        coinsDisplay.textContent = playerCoins;
        localStorage.setItem('playerCoins', playerCoins);

        gameScene.remove(boss.mesh);
        boss = null;

        stage++;
        stageDisplay.textContent = stage;
        bulletDamage += 5;
        enemySpeedMultiplier += 0.1;
        createEnemiesOriginalGame();
    }
}

function shootBossBullets() {
    for (let i=0; i<2; i++) {
        const bulletGeometry = new THREE.SphereGeometry(0.4,8,8);
        const bulletMaterial = new THREE.MeshLambertMaterial({ color:0x8B0000 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.copy(boss.mesh.position);

        const angle = Math.atan2(
            gamePlayer.position.z - boss.mesh.position.z,
            gamePlayer.position.x - boss.mesh.position.x
        ) + (Math.random() - 0.5)*0.5;

        bullet.direction = new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)).normalize();
        const randomAttack = getRandomBossAttack();
        bullet.bossAttack = {
            name: randomAttack.name,
            damage: randomAttack.damage
        };

        enemyBullets.push(bullet);
        gameScene.add(bullet);
    }
}

function resetOriginalGame() {
    health = 100; 
    stage = 1; 
    bulletDamage = 10; 
    enemySpeedMultiplier = 1;
    healthDisplay.textContent = health;
    stageDisplay.textContent = stage;
    coinsDisplay.textContent = playerCoins;
    godMode = false;

    enemies.forEach(e => gameScene.remove(e.mesh));
    enemies = [];
    bullets.forEach(b => gameScene.remove(b));
    bullets = [];
    enemyBullets.forEach(b => gameScene.remove(b));
    enemyBullets = [];

    if (boss) {
        gameScene.remove(boss.mesh);
        boss = null;
    }

    gamePlayer.position.set(0,1,0);
    gamePlayer.rotation.y = 0;
    createEnemiesOriginalGame();
}

function updateScoreboard(gameType, score) {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${playerName}</td>
        <td>${gameType === 'trophy' ? score : '-'}</td>
        <td>${gameType === 'original' ? score : '-'}</td>
    `;
    scoreboardBody.appendChild(newRow);
}

function displayScoreboard() {
    scoreboardOverlay.style.display = 'flex';
}

function loadScoreboard() {
    // אפשר בעתיד לטעון/לשמור תוצאות מ-LocalStorage או DB
}

function removeGameEventListeners() {
    window.removeEventListener('keydown', onKeyDownGame);
    window.removeEventListener('keyup', onKeyUpGame);
    window.removeEventListener('keydown', handleOriginalGameCheats);
}

function removeTrophyEventListeners() {
    window.removeEventListener('keydown', onKeyDownTrophy);
    window.removeEventListener('keyup', onKeyUpTrophy);
}

function removeTouchEventListeners() {
    [
        'moveForward','moveBackward','moveLeft','moveRight',
        'lookLeft','lookRight','jump','shoot'
    ].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.replaceWith(el.cloneNode(true));
        }
    });
}