class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                life: 1,
                decay: Math.random() * 0.05 + 0.02,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life -= p.decay;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner glow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
const particleSystem = new ParticleSystem();