/**
 * MILIRO SIMPLIFIED PHYSICS SYSTEM
 * Handles procedural terrain height tracking, boundary clamps, and static obstacle collisions.
 */

import * as THREE from 'three';

export class Physics {
  constructor() {
    this.mapRadius = 80.0; // Level radius
    this.obstacles = [];   // List of collision obstacles (cylinders, boxes)
  }

  // Set up world boundary obstacles (ruin walls, pillars, castle gates)
  addObstacle(type, params) {
    // type: 'cylinder' (center x, z, radius), 'box' (center x, z, width, depth)
    this.obstacles.push({ type, ...params });
  }

  clearObstacles() {
    this.obstacles = [];
  }

  // Get procedural height of the terrain at any X, Z coordinate
  getTerrainHeight(x, z) {
    // Distance from center
    const dist = Math.sqrt(x * x + z * z);
    
    // Out of bounds height drop-off
    if (dist > this.mapRadius) {
      return -5.0;
    }

    // 1. Large scale hills & valleys using simple trigonometric combinations
    let height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 4.0;
    
    // 2. Small scale bumps / paths
    height += Math.cos(x * 0.15) * Math.sin(z * 0.15) * 0.8;
    
    // 3. Central castle ruin plateau (elevated zone at center x=0, z=-40)
    const castleDist = Math.sqrt(x * x + (z + 40) * (z + 40));
    if (castleDist < 25.0) {
      // Smooth plateau interpolation
      const factor = 1.0 - (castleDist / 25.0); // 1 at center, 0 at outer edge
      height += factor * factor * 5.0; // raised center platform
    }

    // 4. Ruin stairs/stone pillars steps
    // Let's add slight elevation bumps near specified ruin coords to feel solid
    return height;
  }

  // Resolve collision against bounding boundaries and obstacles
  resolveCollisions(position, radius) {
    // 1. Map boundary circle clamp
    const dist = Math.sqrt(position.x * position.x + position.z * position.z);
    if (dist > this.mapRadius - radius) {
      const angle = Math.atan2(position.z, position.x);
      position.x = Math.cos(angle) * (this.mapRadius - radius);
      position.z = Math.sin(angle) * (this.mapRadius - radius);
    }

    // 2. Static obstacle collisions
    for (const obs of this.obstacles) {
      if (obs.type === 'cylinder') {
        const dx = position.x - obs.x;
        const dz = position.z - obs.z;
        const dDist = Math.sqrt(dx * dx + dz * dz);
        const minDist = obs.radius + radius;
        
        if (dDist < minDist) {
          // Push out of cylinder obstacle
          const angle = Math.atan2(dz, dx);
          position.x = obs.x + Math.cos(angle) * minDist;
          position.z = obs.z + Math.sin(angle) * minDist;
        }
      } else if (obs.type === 'box') {
        // AABB check
        const halfW = obs.w / 2;
        const halfD = obs.d / 2;
        
        const dx = position.x - obs.x;
        const dz = position.z - obs.z;
        
        const overlapX = (halfW + radius) - Math.abs(dx);
        const overlapZ = (halfD + radius) - Math.abs(dz);
        
        if (overlapX > 0 && overlapZ > 0) {
          // Push out of box along the shortest axis
          if (overlapX < overlapZ) {
            position.x += dx > 0 ? overlapX : -overlapX;
          } else {
            position.z += dz > 0 ? overlapZ : -overlapZ;
          }
        }
      }
    }

    // 3. Ground height snap
    const groundY = this.getTerrainHeight(position.x, position.z);
    // Keep entity from falling under ground
    if (position.y < groundY) {
      position.y = groundY;
    } else {
      // Apply simple gravity if above ground
      // (Used when falling off stairs or jumps, though this is primarily ground-locked action)
      position.y = Math.max(groundY, position.y - 9.8 * 0.016); // basic step gravity
    }
  }
}
