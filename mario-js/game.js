class InputHandler {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false
        };

        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
    }

    handleKey(e, isPressed) {
        const code = e.code;

        if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = isPressed;
        if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = isPressed;
        if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
            this.keys.up = isPressed;
            this.keys.jump = isPressed;
        }
        if (code === 'ArrowDown' || code === 'KeyS') this.keys.down = isPressed;
    }
}

class Level {
    constructor(width, height) {
        this.tileSize = 40;
        this.rows = height / this.tileSize;
        // Make level 3x wider than screen
        this.cols = (width * 3) / this.tileSize;

        // 0 = Air, 1 = Ground/Brick, 2 = Tube, 3 = Pit, 9 = Finish
        this.map = [];
        this.initMap();
    }

    initMap() {
        // Create empty map
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
                // Default Air
                let tile = 0;

                // Ground Floor (except pits)
                if (r >= this.rows - 2) {
                    tile = 1;
                    // Pit 1
                    if (c > 20 && c < 25) tile = 0;
                    // Pit 2
                    if (c > 45 && c < 50) tile = 0;
                }

                // Walls at ends
                if (c === 0 || c === this.cols - 1) {
                    tile = 1;
                }

                // Platforms
                // Area 1
                if (r === 10 && c > 5 && c < 10) tile = 1;
                if (r === 7 && c > 10 && c < 15) tile = 1;

                // Area 2 (After first pit)
                if (r === 9 && c > 28 && c < 33) tile = 1;
                if (r === 5 && c > 34 && c < 38) tile = 1;

                // Tubes (Green blocks for now)
                if (r === this.rows - 3 && c === 18) tile = 2; // Short tube
                if (r === this.rows - 4 && c === 18) tile = 2;

                if (r >= this.rows - 4 && c === 40) tile = 2; // Tall tube

                // Staircase to finish
                if (c > 52 && c < 58) {
                   if (r >= this.rows - 2 - (c - 52)) tile = 1;
                }

                // Finish line
                if (r === this.rows - 5 && c === this.cols - 3) {
                    tile = 9;
                }

                row.push(tile);
            }
            this.map.push(row);
        }
    }

    draw(ctx) {
        // Optimization: only draw visible tiles? For now draw all is fine for small maps.
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let tile = this.map[r][c];
                if (tile !== 0) {
                    let x = c * this.tileSize;
                    let y = r * this.tileSize;

                    if (tile === 1) {
                        ctx.fillStyle = '#8B4513'; // Ground Brown
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        // Bevel effect
                        ctx.strokeStyle = '#5c2e0a';
                        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
                    } else if (tile === 2) {
                        ctx.fillStyle = '#228B22'; // Tube Green
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.strokeStyle = '#006400';
                        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
                    } else if (tile === 9) {
                        ctx.fillStyle = '#FFD700'; // Gold finish
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    }
                }
            }
        }
    }

    // Collision detection helper
    getTileAt(x, y) {
        let c = Math.floor(x / this.tileSize);
        let r = Math.floor(y / this.tileSize);

        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
            return 0; // Out of bounds is air (or handled separately)
        }
        return this.map[r][c];
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 30;
        this.height = 30;
        // Start position
        this.x = 100;
        this.y = 100;

        this.vx = 0;
        this.vy = 0;

        this.speed = 0.5;
        this.maxSpeed = 6;
        this.friction = 0.8;
        this.gravity = 0.8;
        this.jumpStrength = -16;

        this.grounded = false;

        this.color = '#ff0000'; // Mario Red
    }

    update(deltaTime) {
        // Input Handling
        if (this.game.input.keys.left) {
            this.vx -= this.speed;
        }
        if (this.game.input.keys.right) {
            this.vx += this.speed;
        }
        if (this.game.input.keys.jump && this.grounded) {
            this.vy = this.jumpStrength;
            this.grounded = false;
        }

        // Apply Physics
        this.vx *= this.friction;
        this.vy += this.gravity;

        // Clamp Speed
        if (this.vx > this.maxSpeed) this.vx = this.maxSpeed;
        if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;

        // Move X
        this.x += this.vx;
        this.checkCollisionX();

        // Move Y
        this.y += this.vy;
        this.grounded = false; // Assume in air until collision proves otherwise
        this.checkCollisionY();

        // Screen Boundaries
        if (this.x < 0) { this.x = 0; this.vx = 0; }
        // Remove right boundary check relative to screen, now it's map
        let mapWidth = this.game.map.cols * this.game.map.tileSize;
        if (this.x + this.width > mapWidth) { this.x = mapWidth - this.width; this.vx = 0; }

        // Fall off map
        if (this.y > this.game.height) {
            this.reset();
        }
    }

    checkCollisionX() {
        let left = this.x;
        let right = this.x + this.width;
        let top = this.y;
        let bottom = this.y + this.height - 1; // -1 to avoid getting stuck on flat ground

        let tl = this.game.map.getTileAt(left, top);
        let tr = this.game.map.getTileAt(right, top);
        let bl = this.game.map.getTileAt(left, bottom);
        let br = this.game.map.getTileAt(right, bottom);

        if (this.vx > 0) { // Moving Right
            if (tr === 1 || br === 1) {
                this.x = (Math.floor(right / this.game.map.tileSize) * this.game.map.tileSize) - this.width - 0.1;
                this.vx = 0;
            }
        } else if (this.vx < 0) { // Moving Left
            if (tl === 1 || bl === 1) {
                this.x = (Math.floor(left / this.game.map.tileSize) + 1) * this.game.map.tileSize + 0.1;
                this.vx = 0;
            }
        }

        // Check for Win
        if (tr === 9 || br === 9 || tl === 9 || bl === 9) {
             this.game.win = true;
        }
    }

    checkEntityCollision(enemies) {
        // Iterate backwards to allow removal
        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            if (
                this.x < enemy.x + enemy.width &&
                this.x + this.width > enemy.x &&
                this.y < enemy.y + enemy.height &&
                this.y + this.height > enemy.y
            ) {
                // Collision detected
                // Check if landing on top
                if (this.vy > 0 && this.y + this.height < enemy.y + enemy.height / 2) {
                    // Kill enemy
                    this.vy = -8; // Bounce
                    enemies.splice(i, 1);
                } else {
                    // Die
                    this.game.gameOver = true;
                }
            }
        }
    }

    checkCollisionY() {
        let left = this.x;
        let right = this.x + this.width;
        let top = this.y;
        let bottom = this.y + this.height;

        let tl = this.game.map.getTileAt(left, top);
        let tr = this.game.map.getTileAt(right, top);
        let bl = this.game.map.getTileAt(left, bottom);
        let br = this.game.map.getTileAt(right, bottom);

        if (this.vy > 0) { // Falling
            if (bl === 1 || br === 1) {
                this.y = (Math.floor(bottom / this.game.map.tileSize) * this.game.map.tileSize) - this.height;
                this.vy = 0;
                this.grounded = true;
            }
        } else if (this.vy < 0) { // Jumping up
            if (tl === 1 || tr === 1) {
                this.y = (Math.floor(top / this.game.map.tileSize) + 1) * this.game.map.tileSize;
                this.vy = 0;
            }
        }
    }

    reset() {
        // Fall off map
        this.game.gameOver = true;
    }

    draw(ctx) {
        // Body (Red Square)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Hat (Visor)
        ctx.fillStyle = "#8b0000";
        if (this.vx >= 0) {
            ctx.fillRect(this.x + 10, this.y, 24, 6);
        } else {
            ctx.fillRect(this.x - 4, this.y, 24, 6);
        }

        // Face (Flesh tone)
        ctx.fillStyle = "#ffcc99";
        if (this.vx >= 0) {
            ctx.fillRect(this.x + 10, this.y + 6, 16, 14);
        } else {
            ctx.fillRect(this.x + 4, this.y + 6, 16, 14);
        }

        // Eye
        ctx.fillStyle = "black";
        if (this.vx >= 0) {
            ctx.fillRect(this.x + 18, this.y + 8, 4, 4);
        } else {
            ctx.fillRect(this.x + 8, this.y + 8, 4, 4);
        }

        // Mustache
        if (this.vx >= 0) {
            ctx.fillRect(this.x + 20, this.y + 14, 8, 4);
        } else {
            ctx.fillRect(this.x + 2, this.y + 14, 8, 4);
        }

        // Overalls
        ctx.fillStyle = "#0000cc";
        ctx.fillRect(this.x + 4, this.y + 20, 22, 10);
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.input = new InputHandler();

        this.lastTime = 0;

        // Placeholders for future modules
        this.player = new Player(this);
        this.map = new Level(this.width, this.height);
        // Correctly placed enemies on platforms
        this.enemies = [
            new Enemy(this, 260, 360),
            new Enemy(this, 460, 240),
            new Enemy(this, 1140, 320), // Area 2 platform
            new Enemy(this, 1500, 480)  // Near pit 2
        ];

        this.camera = { x: 0, y: 0 };
        this.gameOver = false;
        this.win = false;
    }

    start() {
        requestAnimationFrame(timestamp => this.loop(timestamp));
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(timestamp => this.loop(timestamp));
    }

    restart() {
        this.player = new Player(this);
        // Re-init enemies? Simplification: Just respawn enemies
        this.enemies = [
            new Enemy(this, 260, 360),
            new Enemy(this, 460, 240),
            new Enemy(this, 1140, 320),
            new Enemy(this, 1500, 480)
        ];
        this.camera = { x: 0, y: 0 };
        this.gameOver = false;
        this.win = false;
    }

    update(deltaTime) {
        if (this.gameOver || this.win) {
            if (this.input.keys.jump) {
                this.restart();
            }
            return;
        }

        this.player.update(deltaTime);
        this.player.checkEntityCollision(this.enemies);

        this.enemies.forEach(enemy => enemy.update(deltaTime));

        // Update Camera
        // Center camera on player
        this.camera.x = this.player.x - this.width / 2;

        // Clamp camera to map bounds
        if (this.camera.x < 0) this.camera.x = 0;
        let mapWidth = this.map.cols * this.map.tileSize;
        if (this.camera.x > mapWidth - this.width) this.camera.x = mapWidth - this.width;
    }

    draw() {
        // Clear screen
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, 0);

        // Draw Clouds (Parallax effect)
        this.drawClouds();

        // Draw Map
        this.map.draw(this.ctx);

        // Draw Enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw Player
        this.player.draw(this.ctx);

        this.ctx.restore();

        // UI Overlay
        if (this.gameOver) {
            this.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = "red";
            this.ctx.font = "40px Courier New";
            this.ctx.textAlign = "center";
            this.ctx.fillText("GAME OVER", this.width / 2, this.height / 2);
            this.ctx.fillStyle = "white";
            this.ctx.font = "20px Courier New";
            this.ctx.fillText("Press Jump to Restart", this.width / 2, this.height / 2 + 40);
        } else if (this.win) {
            this.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = "gold";
            this.ctx.font = "40px Courier New";
            this.ctx.textAlign = "center";
            this.ctx.fillText("LEVEL CLEAR!", this.width / 2, this.height / 2);
            this.ctx.fillStyle = "white";
            this.ctx.font = "20px Courier New";
            this.ctx.fillText("Press Jump to Play Again", this.width / 2, this.height / 2 + 40);
        }
    }

    drawClouds() {
        // Draw some simple clouds
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

        // Positions relative to map, but moving slower (parallax) if we wanted complex parallax,
        // but for now just static clouds in the sky relative to map
        const clouds = [
            {x: 100, y: 100}, {x: 300, y: 50}, {x: 600, y: 120},
            {x: 900, y: 80}, {x: 1300, y: 150}, {x: 1800, y: 60}
        ];

        clouds.forEach(cloud => {
             this.ctx.beginPath();
             this.ctx.arc(cloud.x, cloud.y, 30, 0, Math.PI * 2);
             this.ctx.arc(cloud.x + 25, cloud.y - 10, 35, 0, Math.PI * 2);
             this.ctx.arc(cloud.x + 50, cloud.y, 30, 0, Math.PI * 2);
             this.ctx.fill();
        });
    }
}

class Enemy {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.vx = -2;
        this.color = '#0000ff'; // Blue Goomba for contrast
    }

    update(deltaTime) {
        this.x += this.vx;

        // Simple AI: Turn around at walls or edges
        let left = this.x;
        let right = this.x + this.width;
        // Check slightly below for ground
        let bottom = this.y + this.height + 1;

        let bl = this.game.map.getTileAt(left, bottom);
        let br = this.game.map.getTileAt(right, bottom);

        let tl = this.game.map.getTileAt(left, this.y);
        let tr = this.game.map.getTileAt(right, this.y);

        // Turn if wall
        if (this.vx < 0 && (tl === 1 || bl === 0)) {
            this.vx = -this.vx;
        } else if (this.vx > 0 && (tr === 1 || br === 0)) {
            this.vx = -this.vx;
        }
    }

    draw(ctx) {
        // Mushroom body (Brown/Blue)
        ctx.fillStyle = this.color; // Blueish body? Goombas are usually brown but let's keep blue for contrast or change to brown
        // Let's make it brown like a Goomba
        ctx.fillStyle = "#8B4513";

        // Triangle/Trapezoid shape for head
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + this.height);
        ctx.lineTo(this.x, this.y + 10);
        ctx.quadraticCurveTo(this.x + this.width / 2, this.y - 5, this.x + this.width, this.y + 10);
        ctx.lineTo(this.x + this.width - 4, this.y + this.height);
        ctx.fill();

        // Stem / Feet area
        ctx.fillStyle = "black";
        ctx.fillRect(this.x + 6, this.y + this.height - 6, 8, 6);
        ctx.fillRect(this.x + 16, this.y + this.height - 6, 8, 6);

        // Angry eyes
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.ellipse(this.x + 10, this.y + 15, 5, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + 20, this.y + 15, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y + 15, 2, 0, Math.PI*2);
        ctx.arc(this.x + 20, this.y + 15, 2, 0, Math.PI*2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 6, this.y + 10);
        ctx.lineTo(this.x + 14, this.y + 14);
        ctx.moveTo(this.x + 24, this.y + 10);
        ctx.lineTo(this.x + 16, this.y + 14);
        ctx.stroke();
    }
}

// Initialize when window loads
window.onload = () => {
    const game = new Game('gameCanvas');
    game.start();
};
