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

        // 0 = Air, 1 = Ground/Brick, 2 = Tube, 3 = Brick, 4 = Question, 5 = Used, 9 = Finish
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
                if (r === 10 && c > 5 && c < 10) tile = 3; // Bricks
                if (r === 7 && c > 10 && c < 15) tile = 1;

                // Area 2 (After first pit)
                if (r === 9 && c > 28 && c < 33) tile = 3; // Bricks
                if (r === 5 && c > 34 && c < 38) tile = 1;

                // Question Blocks
                if (r === 7 && c === 8) tile = 4;
                if (r === 6 && c === 30) tile = 4;
                if (r === 10 && c === 31) tile = 4;

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
                    } else if (tile === 3) { // Brick
                        ctx.fillStyle = '#A0522D';
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.strokeStyle = 'black';
                        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
                        // Brick pattern
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(x, y+10, this.tileSize, 2);
                        ctx.fillRect(x+20, y, 2, 10);
                        ctx.fillRect(x+10, y+10, 2, 30);
                    } else if (tile === 4) { // Question
                        ctx.fillStyle = '#FFD700'; // Gold
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.strokeStyle = '#B8860B';
                        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#B8860B';
                        ctx.font = "bold 20px Courier New";
                        ctx.fillText("?", x + 12, y + 28);
                    } else if (tile === 5) { // Used
                        ctx.fillStyle = '#805030'; // Brown
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.strokeStyle = 'black';
                        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
                    } else if (tile === 9) {
                        ctx.fillStyle = '#FFD700'; // Gold finish
                        ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    }
                }
            }
        }
    }

    setTileAt(c, r, tile) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.map[r][c] = tile;
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

        // Double Jump
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.jumpPressed = false; // To prevent holding jump to fly

        // Animation
        this.animTimer = 0;
        this.frame = 0; // 0 = stand, 1 = walk1, 2 = walk2
        this.facingRight = true;

        // Powerups
        this.isBig = false;

        this.color = '#ff0000'; // Mario Red
    }

    update(deltaTime) {
        // Input Handling
        if (this.game.input.keys.left) {
            this.vx -= this.speed;
            this.facingRight = false;
        }
        if (this.game.input.keys.right) {
            this.vx += this.speed;
            this.facingRight = true;
        }

        // Animation Logic
        if (Math.abs(this.vx) > 0.1 && this.grounded) {
            this.animTimer += deltaTime;
            if (this.animTimer > 100) { // Switch frame every 100ms
                this.frame = (this.frame + 1) % 2; // Toggle 0 and 1
                this.animTimer = 0;
            }
        } else {
            this.frame = 0;
        }
        if (!this.grounded) this.frame = 2; // Jump frame

        // Jump Logic
        if (this.game.input.keys.jump) {
            if (!this.jumpPressed) {
                if (this.grounded || this.jumpCount < this.maxJumps) {
                    this.vy = this.jumpStrength;
                    this.grounded = false;
                    this.jumpCount++;
                    this.game.playSound('jump');

                    // Slightly weaker second jump? Optional.
                    // if (this.jumpCount > 1) this.vy = this.jumpStrength * 0.8;
                }
                this.jumpPressed = true;
            }
        } else {
            this.jumpPressed = false;
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

    // Check collision with Items
    checkItemCollision(items) {
        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            if (
                this.x < item.x + item.width &&
                this.x + this.width > item.x &&
                this.y < item.y + item.height &&
                this.y + this.height > item.y
            ) {
                // Collect Item
                if (item.type === 'mushroom') {
                    this.grow();
                    this.game.score += 1000;
                    this.game.playSound('powerup');
                }
                items.splice(i, 1);
            }
        }
    }

    grow() {
        if (!this.isBig) {
            this.isBig = true;
            this.y -= 30; // Shift up to avoid ground clip
            this.height = 60;
            // Visual change? Handled in draw
        }
    }

    takeDamage() {
        if (this.isBig) {
            this.isBig = false;
            this.height = 30;
            this.y += 30;
            // Invincibility frames could be added here
        } else {
            this.game.gameOver = true;
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
                    // Take Damage
                    this.takeDamage();
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
                this.jumpCount = 0; // Reset jumps on landing
            }
        } else if (this.vy < 0) { // Jumping up
            if (tl !== 0 || tr !== 0) { // Hit something
                // Check blocks
                let tileLeft = tl;
                let tileRight = tr;

                // Which block did we hit?
                // Calculate center column to be more precise or check both
                // If hit block 3 (Brick) or 4 (Question)

                let r = Math.floor(top / this.game.map.tileSize);
                let cLeft = Math.floor(left / this.game.map.tileSize);
                let cRight = Math.floor(right / this.game.map.tileSize);

                // Prioritize center/one contact
                if (tileLeft === 3 || tileLeft === 4) {
                    this.hitBlock(cLeft, r, tileLeft);
                } else if (tileRight === 3 || tileRight === 4) {
                    this.hitBlock(cRight, r, tileRight);
                }

                // Stop upward momentum if hit any solid block
                if (tl === 1 || tr === 1 || tl === 3 || tr === 3 || tl === 4 || tr === 4 || tl === 5 || tr === 5) {
                    this.y = (Math.floor(top / this.game.map.tileSize) + 1) * this.game.map.tileSize;
                    this.vy = 0;
                }
            }
        }
    }

    hitBlock(c, r, tile) {
        if (tile === 3) { // Brick
             // Break it!
             this.game.map.setTileAt(c, r, 0);
             // Add score
             this.game.score += 50;
             this.game.playSound('bump');
        } else if (tile === 4) { // Question
             // Change to used
             this.game.map.setTileAt(c, r, 5);
             // Give reward (Coin for now)
             this.game.score += 100;
             this.game.playSound('coin');

             // Chance to spawn Mushroom?
             // For test, let's say block at (8, 7) spawns Mushroom
             if (c === 8 && r === 7) {
                 this.game.spawnMushroom(c * 40, (r - 1) * 40);
             }
        }
    }

    reset() {
        // Fall off map
        this.game.gameOver = true;
    }

    draw(ctx) {
        // Draw Mario based on frame and direction

        let dir = this.facingRight ? 1 : -1;

        // Helper to draw relative to center x
        let cx = this.x + this.width / 2;
        let cy = this.y;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(dir, 1); // Flip if facing left
        ctx.translate(-this.width/2, 0); // Back to top-left coords relative to flipped origin

        // Scale for Big Mario
        if (this.isBig) {
            ctx.scale(1, 2); // Stretch vertically for simple big effect
            ctx.translate(0, -15); // Adjust for scaling center
        }

        // Body (Red Shirt)
        ctx.fillStyle = this.color;
        ctx.fillRect(4, 4, 22, 26);

        // Overalls (Blue)
        ctx.fillStyle = "#0000cc";
        ctx.fillRect(4, 20, 22, 8); // Base
        ctx.fillRect(4, 16, 6, 12); // Strap L
        ctx.fillRect(20, 16, 6, 12); // Strap R

        // Legs Animation
        if (this.frame === 0) { // Stand
            ctx.fillRect(4, 28, 8, 2); // Leg L
            ctx.fillRect(18, 28, 8, 2); // Leg R
        } else if (this.frame === 1) { // Walk
             // Scissor legs
             ctx.fillRect(2, 28, 8, 2); // Leg L Back
             ctx.fillRect(20, 28, 8, 2); // Leg R Forward
        } else if (this.frame === 2) { // Jump
             ctx.fillRect(2, 26, 8, 4); // Legs tucked
             ctx.fillRect(20, 24, 8, 4);
        }

        // Head / Face
        ctx.fillStyle = "#ffcc99";
        ctx.fillRect(4, 4, 20, 14);

        // Hat (Visor)
        ctx.fillStyle = "#8b0000";
        ctx.fillRect(4, 0, 26, 4); // Hat top/brim

        // Eye
        ctx.fillStyle = "black";
        ctx.fillRect(18, 6, 4, 4);

        // Mustache
        ctx.fillRect(18, 12, 8, 4);

        // Arms
        ctx.fillStyle = this.color;
        if (this.frame === 1) {
            ctx.fillRect(10, 16, 12, 6); // Swinging arm
        } else {
            ctx.fillRect(2, 16, 8, 10); // Arm side
        }

        ctx.restore();
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
        this.score = 0;
        this.items = [];

        // Audio
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    resumeAudio() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playSound(type) {
        if (!this.audioCtx) return;

        // Ensure audio is running
        this.resumeAudio();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        if (type === 'jump') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.setValueAtTime(1200, now + 0.05);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'bump') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'powerup') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'die') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
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
        this.score = 0;
    }

    update(deltaTime) {
        // Resume audio on any input key active
        if (this.input.keys.jump || this.input.keys.left || this.input.keys.right) {
            this.resumeAudio();
        }

        if (this.gameOver || this.win) {
            if (this.input.keys.jump) {
                this.restart();
            }
            return;
        }

        this.player.update(deltaTime);
        this.player.checkEntityCollision(this.enemies);
        this.player.checkItemCollision(this.items);

        this.enemies.forEach(enemy => enemy.update(deltaTime));
        this.items.forEach(item => item.update(deltaTime));

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

        // Draw Items
        this.items.forEach(item => item.draw(this.ctx));

        // Draw Player
        this.player.draw(this.ctx);

        this.ctx.restore();

        // Draw HUD (Score)
        this.ctx.fillStyle = "white";
        this.ctx.font = "20px Courier New";
        this.ctx.fillText("SCORE: " + this.score, 20, 30);

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

    spawnMushroom(x, y) {
        this.items.push(new Item(this, x, y, 'mushroom'));
    }
}

class Item {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type; // 'mushroom'
        this.vx = 2;
        this.vy = 0;
    }

    update(deltaTime) {
        // Simple Physics (Gravity + Move)
        this.vy += 0.5;
        this.x += this.vx;
        this.y += this.vy;

        // Collision with map
        let bottom = this.y + this.height;
        let right = this.x + this.width;

        // Floor check
        let bl = this.game.map.getTileAt(this.x, bottom);
        let br = this.game.map.getTileAt(right, bottom);

        if (bl === 1 || br === 1 || bl === 3 || br === 3 || bl === 4 || br === 4 || bl === 5 || br === 5) {
             this.y = (Math.floor(bottom / 40) * 40) - this.height;
             this.vy = 0;
        }

        // Wall check (Turn around)
        let midY = this.y + 15;
        let tl = this.game.map.getTileAt(this.x, midY);
        let tr = this.game.map.getTileAt(right, midY);

        if (this.vx > 0 && (tr !== 0)) this.vx = -this.vx;
        if (this.vx < 0 && (tl !== 0)) this.vx = -this.vx;
    }

    draw(ctx) {
        if (this.type === 'mushroom') {
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 10, 15, 0, Math.PI, true); // Cap
            ctx.fill();

            ctx.fillStyle = "white"; // Spots
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 5, 5, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = "#ffcc99"; // Stem
            ctx.fillRect(this.x + 5, this.y + 10, 20, 20);

            // Eyes
            ctx.fillStyle = "black";
            ctx.fillRect(this.x + 10, this.y + 15, 2, 6);
            ctx.fillRect(this.x + 18, this.y + 15, 2, 6);
        }
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

        // Simple Gravity for enemies so they sit on ground
        this.y += 2;

        // Collision Y (Ground check for gravity)
        let bottom = this.y + this.height;
        let left = this.x;
        let right = this.x + this.width;

        // If sinking into floor, push up
        let bl_foot = this.game.map.getTileAt(left, bottom);
        let br_foot = this.game.map.getTileAt(right, bottom);

        if (bl_foot === 1 || br_foot === 1) {
             this.y = (Math.floor(bottom / this.game.map.tileSize) * this.game.map.tileSize) - this.height;
        }

        // Simple AI: Turn around at walls or edges
        // Check slightly below for ground (cliff detection)
        let checkBottom = this.y + this.height + 1;

        let bl = this.game.map.getTileAt(left, checkBottom);
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
