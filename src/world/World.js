/**
 * MILIRO WORLD BUILDER
 * Generates dark fantasy medieval environment (ruins, stairs, arches, bonfires, lighting, and volumetric fog aesthetics).
 */

import * as THREE from 'three';

export class World {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    
    // Interactive Objects List
    this.bonfires = [];
    this.lootChests = [];

    // Colors
    this.groundColor = 0x22252a; // Deep slate/soil
    this.stoneColor = 0x3d4147;  // Dark wet stone

    // Initial setups
    this.buildLighting();
    this.buildTerrain();
    this.buildRuins();
    this.buildBonfire();
  }

  // Cinematic Lighting & Fog matching Dark Souls (with improved brightness)
  buildLighting() {
    // 1. Dark ambient atmosphere (brightened slate)
    this.scene.background = new THREE.Color(0x15181d);
    this.scene.fog = new THREE.FogExp2(0x15181d, 0.0075); // Volumetric fog representation (clearer distance)

    const ambientLight = new THREE.AmbientLight(0x2d323d, 0.75); // Brighter slate fill light
    this.scene.add(ambientLight);

    // 2. Clear sun light
    const sunLight = new THREE.DirectionalLight(0xfff2e6, 1.45); // Brighter soft gold sunlight
    sunLight.position.set(40, 50, -50);
    sunLight.castShadow = true;
    
    // Shadow parameters optimization
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    
    const d = 80;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;

    this.scene.add(sunLight);
    this.sun = sunLight;
  }

  // High-performance procedural PBR terrain
  buildTerrain() {
    const radius = this.physics.mapRadius;
    
    // Grid geometry
    const segments = 120;
    const terrainGeo = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
    
    // Displace vertices based on our physics heightmap
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getY(i); // PlaneGeometry uses Y as Z locally
      
      const y = this.physics.getTerrainHeight(x, z);
      posAttr.setZ(i, y); // Map height to Z of Plane
    }
    
    terrainGeo.computeVertexNormals();
    
    // Rotate to lie flat (Plane lies vertically by default)
    terrainGeo.rotateX(-Math.PI / 2);

    const terrainMat = new THREE.MeshStandardMaterial({
      color: this.groundColor,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true // Gives a painterly / low-poly dark stone look
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
  }

  // Generate medieval ruins: Broken arches, pillars, walls
  buildRuins() {
    // Shared stone material
    const stoneMat = new THREE.MeshStandardMaterial({
      color: this.stoneColor,
      roughness: 0.8,
      metalness: 0.15,
      flatShading: true
    });

    // Preset positions for ruins/columns
    const ruinLocations = [
      { x: -15, z: -15, r: 2.2, h: 5.5, name: 'column1' },
      { x: 18, z: -10, r: 1.8, h: 4.0, name: 'column2' },
      { x: -25, z: 12, r: 3.0, h: 8.0, name: 'tower1' },
      { x: 30, z: 25, r: 2.0, h: 3.0, name: 'broken_column' },
      { x: -35, z: -30, r: 2.5, h: 6.0, name: 'pillar' },
      { x: 40, z: -40, r: 2.2, h: 4.5, name: 'pillar2' }
    ];

    ruinLocations.forEach(loc => {
      // Procedural segmented columns
      const colGroup = new THREE.Group();
      colGroup.position.set(loc.x, this.physics.getTerrainHeight(loc.x, loc.z), loc.z);

      const segments = Math.floor(loc.h / 1.5);
      for (let s = 0; s < segments; s++) {
        // slight jitter/rotation to make it look ancient and crumbling
        const segGeo = new THREE.CylinderGeometry(loc.r * 0.9, loc.r, 1.5, 6);
        const seg = new THREE.Mesh(segGeo, stoneMat);
        
        seg.position.y = s * 1.5 + 0.75;
        seg.rotation.y = s * (Math.PI / 12);
        seg.rotation.x = (Math.random() - 0.5) * 0.05;
        seg.rotation.z = (Math.random() - 0.5) * 0.05;
        
        seg.castShadow = true;
        seg.receiveShadow = true;
        colGroup.add(seg);
      }

      this.scene.add(colGroup);
      
      // Register collision box in physics
      this.physics.addObstacle('cylinder', {
        x: loc.x,
        z: loc.z,
        radius: loc.r
      });
    });

    // Build the CENTRAL KEEP RUIN WALLS (surrounding the boss plateau)
    // Coords centered around x=0, z=-40
    const keepX = 0;
    const keepZ = -40;
    
    // Circular perimeter walls with archway gate
    const numWallSegments = 10;
    const perimeterRadius = 22.0;
    
    for (let i = 0; i < numWallSegments; i++) {
      const angle = (i / numWallSegments) * Math.PI * 2;
      
      // Skip the front entrance (south gate) so player can walk in
      if (angle > Math.PI * 0.4 && angle < Math.PI * 0.6) continue;

      const wx = keepX + Math.cos(angle) * perimeterRadius;
      const wz = keepZ + Math.sin(angle) * perimeterRadius;
      const wy = this.physics.getTerrainHeight(wx, wz);

      const wallGroup = new THREE.Group();
      wallGroup.position.set(wx, wy, wz);
      wallGroup.rotation.y = -angle + Math.PI / 2;

      // Outer block
      const wallGeo = new THREE.BoxGeometry(7, 5, 2.5);
      const wall = new THREE.Mesh(wallGeo, stoneMat);
      wall.position.y = 2.5;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wallGroup.add(wall);

      // Crenellations/teeth
      const toothGeo = new THREE.BoxGeometry(1.2, 1, 2.5);
      for (let j = -2; j <= 2; j += 2) {
        const tooth = new THREE.Mesh(toothGeo, stoneMat);
        tooth.position.set(j, 5.5, 0);
        tooth.castShadow = true;
        wallGroup.add(tooth);
      }

      this.scene.add(wallGroup);

      // Physics box
      this.physics.addObstacle('box', {
        x: wx,
        z: wz,
        w: 6.8,
        d: 2.3
      });
    }

    // Scatter minor random debris blocks on field
    for (let i = 0; i < 15; i++) {
      const rx = (Math.random() - 0.5) * 60;
      const rz = (Math.random() - 0.5) * 60;
      
      // Keep away from central spawn
      if (Math.sqrt(rx * rx + rz * rz) < 10) continue;

      const ry = this.physics.getTerrainHeight(rx, rz);
      
      const debGeo = new THREE.BoxGeometry(1.5 + Math.random()*2, 1 + Math.random(), 1.5 + Math.random()*2);
      const deb = new THREE.Mesh(debGeo, stoneMat);
      deb.position.set(rx, ry + 0.5, rz);
      deb.rotation.set(Math.random(), Math.random(), Math.random());
      
      deb.castShadow = true;
      deb.receiveShadow = true;
      this.scene.add(deb);

      this.physics.addObstacle('cylinder', {
        x: rx,
        z: rz,
        radius: 1.8
      });
    }
  }

  // Create the legendary bonfire at spawning ground (x=0, z=0)
  buildBonfire() {
    const x = 0;
    const z = 3; // slightly offset from spawn point
    const y = this.physics.getTerrainHeight(x, z);

    const bonfireGroup = new THREE.Group();
    bonfireGroup.position.set(x, y, z);

    // Stone ring embers
    const ringGeo = new THREE.TorusGeometry(0.8, 0.15, 8, 16);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, roughness: 0.9 });
    const ring = new THREE.Mesh(ringGeo, stoneMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    bonfireGroup.add(ring);

    // Coiled Sword stuck in ground
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, 0.4, 0);
    swordGroup.rotation.z = Math.PI / 8; // slanted
    swordGroup.rotation.x = Math.PI / 12;

    const bladeGeo = new THREE.BoxGeometry(0.04, 1.2, 0.015);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe67e22,
      emissive: 0x8e44ad, // glowing aura representation
      roughness: 0.5,
      metalness: 0.9
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.5;
    swordGroup.add(blade);

    // guard/hilt
    const guardGeo = new THREE.BoxGeometry(0.2, 0.04, 0.04);
    const guard = new THREE.Mesh(guardGeo, stoneMat);
    swordGroup.add(guard);

    bonfireGroup.add(swordGroup);

    // Dynamic fire light
    const fireLight = new THREE.PointLight(0xff7a00, 2.5, 8.0);
    fireLight.position.set(0, 0.5, 0);
    fireLight.castShadow = true;
    bonfireGroup.add(fireLight);
    this.bonfireLight = fireLight;

    this.scene.add(bonfireGroup);
    this.bonfires.push({ position: new THREE.Vector3(x, y, z), light: fireLight });

    // Animated particle sparks array
    this.sparks = [];
    const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    
    for (let i = 0; i < 12; i++) {
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 0.6
      );
      bonfireGroup.add(spark);
      this.sparks.push(spark);
    }
  }

  // Update bonfire fire flickers & glowing sparks
  update(deltaTime) {
    const time = Date.now();
    
    // Flicker light intensity
    if (this.bonfireLight) {
      this.bonfireLight.intensity = 2.0 + Math.sin(time * 0.01) * 0.6;
    }

    // Spark float animation
    if (this.sparks) {
      this.sparks.forEach(spark => {
        spark.position.y += deltaTime * 0.8;
        spark.position.x += Math.sin(time * 0.005 + spark.position.y) * 0.01;
        
        // Reset spark when it floats high
        if (spark.position.y > 1.8) {
          spark.position.y = 0.1;
          spark.position.x = (Math.random() - 0.5) * 0.6;
          spark.position.z = (Math.random() - 0.5) * 0.6;
        }
      });
    }
  }
}
