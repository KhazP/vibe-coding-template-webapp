
import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

// Particle class to handle individual points in the flow field
class Particle {
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  maxSpeed: number;
  p: p5;
  prevPos: p5.Vector;

  constructor(p: p5) {
    this.p = p;
    this.pos = p.createVector(p.random(p.width), p.random(p.height));
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.maxSpeed = 2; // Speed of flow
    this.prevPos = this.pos.copy();
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  follow(angle: number) {
    // Fix: create vector manually using trigonometry instead of relying on static p5.Vector.fromAngle
    // which is not available on the p5 instance 'this.p'
    const force = this.p.createVector(this.p.cos(angle), this.p.sin(angle));
    force.setMag(0.5); // Strength of the noise influence
    this.applyForce(force);
  }

  applyForce(force: p5.Vector) {
    this.acc.add(force);
  }

  show() {
    // Subtle gradient coloring based on velocity or random tint
    // We use the theme color (Emerald/Teal) logic but very desaturated for background
    // R: 16-52, G: 185-211, B: 129-153
    this.p.stroke(200, 255, 230, 40); // Whitish-Emerald with low opacity
    this.p.strokeWeight(1);
    
    // Draw point
    this.p.point(this.pos.x, this.pos.y);
  }

  edges() {
    if (this.pos.x > this.p.width) {
        this.pos.x = 0;
        this.prevPos = this.pos.copy();
    }
    if (this.pos.x < 0) {
        this.pos.x = this.p.width;
        this.prevPos = this.pos.copy();
    }
    if (this.pos.y > this.p.height) {
        this.pos.y = 0;
        this.prevPos = this.pos.copy();
    }
    if (this.pos.y < 0) {
        this.pos.y = this.p.height;
        this.prevPos = this.pos.copy();
    }
  }
}

const FlowFieldBackground: React.FC = () => {
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let myP5: p5;

    const sketch = (p: p5) => {
      const particles: Particle[] = [];
      // Dynamic particle count based on screen size
      const numParticles = Math.min(2000, Math.floor((window.innerWidth * window.innerHeight) / 500)); 
      const noiseScale = 0.005; // Looseness of the flow
      let zOff = 0;

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.background(5, 5, 5); // Start with dark background matches #050505
        
        for (let i = 0; i < numParticles; i++) {
          particles.push(new Particle(p));
        }
      };

      p.draw = () => {
        // Create the trail effect by drawing a semi-transparent rectangle over everything
        p.noStroke();
        p.fill(5, 5, 5, 20); // Hex #050505 is roughly rgb(5,5,5). Low alpha creates trails.
        p.rect(0, 0, p.width, p.height);

        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            
            // Calculate noise value for this position
            const n = p.noise(
                particle.pos.x * noiseScale, 
                particle.pos.y * noiseScale, 
                zOff
            );
            
            // Convert noise to angle (multiply by Two PI or more for rotation)
            const angle = n * p.TWO_PI * 4;
            
            particle.follow(angle);
            particle.update();
            particle.show();
            particle.edges();
        }

        // Advance time in the noise field slowly
        zOff += 0.002;
      };

      p.windowResized = () => {
        // Prevent background reset on mobile address bar scroll (vertical resize only)
        if (p.windowWidth === p.width) return;

        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.background(5, 5, 5);
      };
    };

    if (renderRef.current) {
      myP5 = new p5(sketch, renderRef.current);
    }

    return () => {
      if (myP5) {
        myP5.remove();
      }
    };
  }, []);

  return (
    <div 
        ref={renderRef} 
        className="fixed inset-0 z-[-1] pointer-events-none bg-[#050505] blur-[10px]"
        aria-hidden="true"
    />
  );
};

export default FlowFieldBackground;
