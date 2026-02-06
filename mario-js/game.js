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
        this.cols = width / this.tileSize;

        // 0 = Air, 1 = Ground/Brick, 2 = Platform, 9 = Finish
        // Simple map generation
        this.map = [];
        this.initMap();
    }

    initMap() {
        // Create empty map
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
                // Floor
                if (r === this.rows - 1 || r === this.rows - 2) {
                    row.push(1);
                }
                // Walls
                else if (c === 0 || c === this.cols - 1) {
                    row.push(1);
                }
                // Platforms
                else if (r === 10 && c > 5 && c < 10) {
                    row.push(1);
                }
                else if (r === 7 && c > 10 && c < 15) {
                    row.push(1);
                }
                else if (r === 4 && c > 2 && c < 6) {
                    row.push(1);
                }
                 // Finish line (Castle area)
                else if (r === this.rows - 3 && c === this.cols - 2) {
                    row.push(9);
                }
                else {
                    row.push(0);
                }
            }
            this.map.push(row);
        }
    }

    draw(ctx) {
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
        if (this.x + this.width > this.game.width) { this.x = this.game.width - this.width; this.vx = 0; }
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
             alert("YOU WIN!");
             this.reset();
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
                    this.reset();
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
        this.x = 100;
        this.y = 100;
        this.vx = 0;
        this.vy = 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Simple eyes to show direction
        ctx.fillStyle = "white";
        if (this.vx >= 0) {
             ctx.fillRect(this.x + 20, this.y + 5, 5, 5);
        } else {
             ctx.fillRect(this.x + 5, this.y + 5, 5, 5);
        }
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
            new Enemy(this, 260, 360), // On platform row 10
            new Enemy(this, 460, 240)  // On platform row 7
        ];
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

    update(deltaTime) {
        this.player.update(deltaTime);
        this.player.checkEntityCollision(this.enemies);

        this.enemies.forEach(enemy => enemy.update(deltaTime));
    }

    draw() {
        // Clear screen
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Map
        this.map.draw(this.ctx);

        // Draw Enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw Player
        this.player.draw(this.ctx);
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Angry eyes
        ctx.fillStyle = "white";
        ctx.fillRect(this.x + 5, this.y + 10, 8, 8);
        ctx.fillRect(this.x + 17, this.y + 10, 8, 8);
    }
}

// Initialize when window loads
window.onload = () => {
    const game = new Game('gameCanvas');
    game.start();
};
