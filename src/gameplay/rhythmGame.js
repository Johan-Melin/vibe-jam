import * as THREE from 'three';
import { getAnalyzerData } from '../audio/audioManager.js';
import { vehicleControls } from '../engine/input.js';

// Rhythm game system
const rhythmGame = {
    enabled: true,
    lanes: 3,
    laneWidth: 3,
    spawnDistance: 100,
    despawnDistance: 10, 
    nextBeatTime: 0,
    beatInterval: 500, // in milliseconds, will be adjusted based on BPM
    cubePool: [],
    activeCubes: [],
    poolSize: 30,
    lastBeatTime: 0,
    beatDetectionThreshold: 0.7, // Increased from 0.6 to 0.7 to detect fewer beats
    beatDetectionFrequencyRange: [2, 8], // Indices in the frequency data to check for beats
    bpm: 130,
    beatsAhead: 4, // Reduced from 16 to 4 to spawn fewer cubes at once
    lanePositions: [], // Will store the world positions of the lanes
    passPoint: 0, // Point where cube passes the vehicle (0 = at vehicle position)
    isFastTempo: false, // Track if we're in a fast tempo section
    beatCooldown: 250, // Minimum time between beats (ms)
    fastBeatCooldown: 125, // Cooldown for fast tempo sections (ms)
    energyHistory: [], // Store recent energy values to detect tempo changes
    score: 0, // Player's score
    multiplier: 1, // Score multiplier
    maxMultiplier: 8, // Maximum multiplier
    multiplierProgress: 0, // Progress towards next multiplier
    multiplierThreshold: 5, // Number of cubes needed to increase multiplier
    collectDistance: 2.5, // Distance at which cubes can be collected
    cubesCollected: 0, // Total cubes collected
    particlePool: [], // Pool for particle effects
    particlePoolSize: 20, // Number of particle systems to pre-create
    laneSpawnStatus: [0, 0, 0], // Track when each lane last had a cube spawned
    minLaneSpawnInterval: 1000, // Minimum time between spawns in the same lane (ms)
    spawnHistory: {}, // Track spawn times for each beat time to avoid overlaps
    fadeInDistance: 180, // Distance at which cubes start to fade in
    fadeDistance: 120, // Distance at which cubes are fully visible
    firstBeatOccurred: false,
    ovalPortal: null,
    redStartPortal: null, // Red start portal in left lane
    // Obstacle vehicles system
    obstaclePool: [], // Pool for obstacle vehicles
    activeObstacles: [], // Active obstacle vehicles
    obstaclePoolSize: 15, // Number of obstacle vehicles to pre-create
    obstacleSpawnInterval: 3000, // Minimum time between obstacle spawns (ms) - reduced from 5000
    lastObstacleTime: 0, // When the last obstacle was spawned
    obstacleSpawnChance: 0.6, // Chance to spawn obstacle on beat - increased from 0.3
    obstacleCollisionDistance: 3.0, // Distance at which collisions with obstacles are detected
    obstacleCloseCallDistance: 5.0, // Distance for tracking near misses with obstacles
    collisionOccurred: false, // Flag to track if a collision has happened
    collisionCooldown: 2000, // Cooldown after collision (ms)
    lastCollisionTime: 0, // When the last collision occurred
    collisionPenalty: 500, // Score penalty for collision
    closeCallBonus: 100, // Score bonus for close calls
    obstacleColors: [ // Colors for obstacles based on lane
        0xff0000, // Red for left lane
        0xffaa00, // Orange for center lane
        0xffff00  // Yellow for right lane
    ],
    obstacleLaneSpawnStatus: [0, 0, 0], // Track when each lane last had an obstacle spawned
    obstacleMinLaneInterval: 2000, // Minimum time between obstacle spawns in same lane
    obstaclesTilNextCube: 0, // Counter to balance obstacle/cube ratios
    maxObstaclesInRow: 3 // Maximum obstacles to spawn before forcing a cube
};

// Create a cube for the rhythm game with neon style
function createRhythmCube(scene) {
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    
    // Add beveled edges for more cyberpunk feel
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black base
        emissive: 0xffffff, // Will be overridden per lane
        emissiveIntensity: 1.0,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.visible = false;
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData = {
        active: false,
        lane: 0,
        beatTime: 0,
        initialScale: 1,
        collectible: true, // Flag to track if the cube can be collected
        collected: false, // Flag to track if the cube has been collected
        scoreValue: 100 // Base score value
    };
    
    // Add glowing edges
    const edges = new THREE.EdgesGeometry(cubeGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff, // Will be overridden per lane
        linewidth: 2
    });
    
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    cube.add(wireframe);
    cube.wireframe = wireframe;
    
    scene.add(cube);
    return cube;
}

// Create particle effect system for cube collection
function createParticleSystem(scene) {
    // Create particle geometry
    const particleCount = 30;
    const particles = new THREE.BufferGeometry();
    
    // Create array to hold positions
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize particles at center
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        
        // Set random colors in the particle
        colors[i * 3] = Math.random();
        colors[i * 3 + 1] = Math.random();
        colors[i * 3 + 2] = Math.random();
    }
    
    // Add attributes to geometry
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 1.0
    });
    
    // Create particle system
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.visible = false;
    
    // Add particle system to scene
    scene.add(particleSystem);
    
    // Store particle data for animation
    particleSystem.userData = {
        active: false,
        positions: positions,
        particleCount: particleCount,
        startTime: 0,
        duration: 1000, // ms
        speed: 2.0,
        baseColor: new THREE.Color(1, 1, 1) // Will be set based on cube color
    };
    
    return particleSystem;
}

// Trigger particle effect at position
function triggerParticleEffect(scene, position, color) {
    // Find an available particle system
    let particleSystem = null;
    
    for (const system of rhythmGame.particlePool) {
        if (!system.userData.active) {
            particleSystem = system;
            break;
        }
    }
    
    // If no available system, create a new one
    if (!particleSystem) {
        if (rhythmGame.particlePool.length < rhythmGame.particlePoolSize) {
            particleSystem = createParticleSystem(scene);
            rhythmGame.particlePool.push(particleSystem);
        } else {
            // If all are in use, use the oldest one
            particleSystem = rhythmGame.particlePool[0];
        }
    }
    
    // Activate particle system
    particleSystem.visible = true;
    particleSystem.userData.active = true;
    particleSystem.userData.startTime = performance.now();
    particleSystem.userData.baseColor.copy(color);
    
    // Set initial position to the cube position
    particleSystem.position.copy(position);
    
    // Reset all particle positions to center
    const positions = particleSystem.userData.positions;
    const colors = particleSystem.geometry.attributes.color.array;
    
    for (let i = 0; i < particleSystem.userData.particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        
        // Set color based on the cube's color
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
    
    return particleSystem;
}

// Update particle effect animation
function updateParticleEffects(currentTime) {
    rhythmGame.particlePool.forEach(particles => {
        if (particles.userData.active) {
            const elapsed = currentTime - particles.userData.startTime;
            const duration = particles.userData.duration;
            
            // If effect is complete, deactivate
            if (elapsed > duration) {
                particles.userData.active = false;
                particles.visible = false;
                return;
            }
            
            // Calculate particle progress (0.0 to 1.0)
            const progress = elapsed / duration;
            
            // Update positions to create explosion effect
            const positions = particles.userData.positions;
            const pCount = particles.userData.particleCount;
            const speed = particles.userData.speed;
            
            for (let i = 0; i < pCount; i++) {
                // Calculate direction for this particle if it hasn't moved yet
                if (positions[i * 3] === 0 && positions[i * 3 + 1] === 0 && positions[i * 3 + 2] === 0) {
                    // Random direction in sphere
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    const r = Math.random();
                    
                    // Convert to Cartesian coordinates
                    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                    positions[i * 3 + 2] = r * Math.cos(phi);
                }
                
                // Move particle outward
                positions[i * 3] *= (1 + speed * progress);
                positions[i * 3 + 1] *= (1 + speed * progress);
                positions[i * 3 + 2] *= (1 + speed * progress);
            }
            
            // Update fade based on progress
            particles.material.opacity = 1.0 - progress;
            
            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;
        }
    });
}

// Create a portal that looks like a green oval
function createOvalPortal(scene, laneIndex) {
    // Create portal group
    const portalGroup = new THREE.Group();
    
    // Get lane position for the right lane
    const lanePos = rhythmGame.lanePositions[laneIndex];
    
    // Position the portal in the right lane at spawn distance
    portalGroup.position.set(
        lanePos.x,
        2, // Slightly above ground level
        -rhythmGame.spawnDistance // Same distance as cubes
    );
    
    // Create oval ring (actually a scaled torus) - but smaller
    const torusGeometry = new THREE.TorusGeometry(3, 0.3, 16, 50);
    const torusMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.8
    });
    
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    // Scale to make it oval
    torus.scale.set(1, 1.5, 1);
    portalGroup.add(torus);
    
    // Create inner surface
    const ovalGeometry = new THREE.CircleGeometry(2.8, 32);
    const ovalMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const oval = new THREE.Mesh(ovalGeometry, ovalMaterial);
    portalGroup.add(oval);
    
    // Add "VIBE" text above the portal
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256;
    textCanvas.height = 128;
    const textContext = textCanvas.getContext('2d');
    
    // Clear the canvas
    textContext.fillStyle = 'rgba(0, 0, 0, 0)';
    textContext.fillRect(0, 0, textCanvas.width, textCanvas.height);
    
    // Add text
    textContext.font = 'bold 72px Arial';
    textContext.textAlign = 'center';
    textContext.textBaseline = 'middle';
    
    // Add green glow effect
    textContext.shadowColor = '#00ff00';
    textContext.shadowBlur = 20;
    textContext.fillStyle = '#ffffff';
    textContext.fillText('VIBE', textCanvas.width / 2, textCanvas.height / 2);
    
    // Create texture from canvas
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.SpriteMaterial({
        map: textTexture,
        transparent: true,
        opacity: 0.9
    });
    
    // Create sprite
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.position.y = 5; // Position above the portal
    textSprite.scale.set(8, 4, 1); // Adjust size as needed
    portalGroup.add(textSprite);
    
    // Add particles around the portal - fewer particles
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + (Math.random() - 0.5) * 0.5;
        
        // Calculate positions in an oval shape
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 1.5; // Multiply by 1.5 for the oval shape
        const z = (Math.random() - 0.5) * 0.3;
        
        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;
        
        // Green particles with some variation
        particleColors[i * 3] = 0.1 + Math.random() * 0.2; // Small amount of red
        particleColors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // Lots of green
        particleColors[i * 3 + 2] = 0.1 + Math.random() * 0.2; // Small amount of blue
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.7
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Get all URL parameters to preserve them in the redirect
    const currentUrl = new URL(window.location.href);
    const queryString = currentUrl.search.substring(1); // Remove the '?' at the beginning
    
    // Store animation data
    portalGroup.userData = {
        active: true,
        particles: particleGeometry,
        spawnTime: performance.now(),
        beatTime: performance.now() + (rhythmGame.beatInterval * 4), // Same timing as cubes
        lane: laneIndex,
        particlePositions: particlePositions,
        particleCount: particleCount,
        scene: scene, // Store scene reference
        redirectURL: "http://portal.pieter.com", // Base URL to redirect when colliding with portal
        queryParams: queryString // Store all current query parameters
    };
    
    scene.add(portalGroup);
    rhythmGame.ovalPortal = portalGroup;
    
    return portalGroup;
}

// Update the oval portal position and effects
function updateOvalPortal(currentTime, scene) {
    if (!rhythmGame.ovalPortal) return;
    
    const portal = rhythmGame.ovalPortal;
    // Use the stored scene reference
    scene = scene || portal.userData.scene;
    
    // Calculate how far along its journey the portal is, just like cubes
    const timeToBeat = portal.userData.beatTime - currentTime;
    const totalDuration = rhythmGame.beatInterval * 4;
    
    let distanceFromVehicle;
    if (timeToBeat >= 0) {
        // Portal is still approaching the vehicle
        distanceFromVehicle = (timeToBeat / totalDuration) * rhythmGame.spawnDistance;
    } else {
        // Portal has passed the beat time
        const timeSinceBeat = -timeToBeat;
        const pastDistance = (timeSinceBeat / totalDuration) * rhythmGame.spawnDistance;
        distanceFromVehicle = -pastDistance;
    }
    
    // Check if portal has passed far behind the car
    if (distanceFromVehicle < -300) { // Increased from -10 to -30 for a longer period without portals
        // Reset portal to appear in front of the car again
        console.log("Resetting oval portal position to front of car");
        
        // Add extra delay before the portal reappears
        const extraDelay = rhythmGame.beatInterval * 8; // 8 beats of delay
        
        // Update portal's beat time to a future time with extra delay
        portal.userData.beatTime = currentTime + (rhythmGame.beatInterval * 4) + extraDelay;
        
        // Calculate new distance (far in front of the car)
        distanceFromVehicle = rhythmGame.spawnDistance * 1.5; // 1.5x further than normal spawn distance
    }
    
    // Update portal position
    const laneIndex = portal.userData.lane;
    const lanePos = rhythmGame.lanePositions[laneIndex];
    portal.position.x = lanePos.x;
    portal.position.z = -distanceFromVehicle;
    
    // Animate particles with subtle pulsing only (no spinning)
    if (portal.userData.particles) {
        const positions = portal.userData.particlePositions;
        const particleCount = portal.userData.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            // Apply a subtle pulsing effect instead of rotation
            const pulseFactor = Math.sin(currentTime * 0.001 + i) * 0.05;
            const baseIndex = i * 3;
            
            // Original position is maintained, just add subtle variation
            const originalX = positions[baseIndex];
            const originalY = positions[baseIndex + 1];
            
            // Subtle pulse effect
            positions[baseIndex] = originalX * (1 + pulseFactor);
            positions[baseIndex + 1] = originalY * (1 + pulseFactor);
        }
        
        portal.userData.particles.attributes.position.needsUpdate = true;
    }
    
    // No rotation - keep the portal static
    
    // Remove portal if it's gone too far past the player and we don't want to reposition it
    // This is commented out since we're now repositioning the portal instead of removing it
    /*
    if (distanceFromVehicle < -rhythmGame.despawnDistance * 2) {
        if (scene) {
            scene.remove(portal);
        }
        rhythmGame.ovalPortal = null;
    }
    */
}

// Create a portal that looks like a red oval (start portal)
function createRedStartPortal(scene, laneIndex) {
    // Create portal group
    const portalGroup = new THREE.Group();
    
    // Get lane position for the left lane
    const lanePos = rhythmGame.lanePositions[laneIndex];
    
    // Position the portal in the left lane at spawn distance
    portalGroup.position.set(
        lanePos.x,
        2, // Slightly above ground level
        -rhythmGame.spawnDistance // Same distance as cubes
    );
    
    // Create oval ring (actually a scaled torus) - but smaller
    const torusGeometry = new THREE.TorusGeometry(3, 0.3, 16, 50);
    const torusMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.8
    });
    
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    // Scale to make it oval
    torus.scale.set(1, 1.5, 1);
    portalGroup.add(torus);
    
    // Create inner surface
    const ovalGeometry = new THREE.CircleGeometry(2.8, 32);
    const ovalMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const oval = new THREE.Mesh(ovalGeometry, ovalMaterial);
    portalGroup.add(oval);
    
    // Add "RETURN" text above the portal
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 512; // Increased from 256 to provide more space
    textCanvas.height = 128;
    const textContext = textCanvas.getContext('2d');
    
    // Clear the canvas
    textContext.fillStyle = 'rgba(0, 0, 0, 0)';
    textContext.fillRect(0, 0, textCanvas.width, textCanvas.height);
    
    // Add text
    textContext.font = 'bold 64px Arial'; // Slightly smaller font
    textContext.textAlign = 'center';
    textContext.textBaseline = 'middle';
    
    // Add red glow effect
    textContext.shadowColor = '#ff0000';
    textContext.shadowBlur = 20;
    textContext.fillStyle = '#ffffff';
    textContext.fillText('RETURN', textCanvas.width / 2, textCanvas.height / 2);
    
    // Create texture from canvas
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.SpriteMaterial({
        map: textTexture,
        transparent: true,
        opacity: 0.9
    });
    
    // Create sprite
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.position.y = 5; // Position above the portal
    textSprite.scale.set(10, 4, 1); // Increased width to accommodate wider text
    portalGroup.add(textSprite);
    
    // Add particles around the portal - fewer particles
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + (Math.random() - 0.5) * 0.5;
        
        // Calculate positions in an oval shape
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 1.5; // Multiply by 1.5 for the oval shape
        const z = (Math.random() - 0.5) * 0.3;
        
        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;
        
        // Red particles with some variation
        particleColors[i * 3] = 0.8 + Math.random() * 0.2; // Lots of red
        particleColors[i * 3 + 1] = 0.1 + Math.random() * 0.2; // Small amount of green
        particleColors[i * 3 + 2] = 0.1 + Math.random() * 0.2; // Small amount of blue
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.7
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Get all query parameters to preserve them in the redirect
    const currentUrl = new URL(window.location.href);
    const queryString = currentUrl.search.substring(1); // Remove the '?' at the beginning
    
    // Store animation data
    portalGroup.userData = {
        active: true,
        particles: particleGeometry,
        spawnTime: performance.now(),
        beatTime: performance.now() + (rhythmGame.beatInterval * 4), // Same timing as cubes
        lane: laneIndex,
        particlePositions: particlePositions,
        particleCount: particleCount,
        scene: scene, // Store scene reference
        redirectURL: "http://portal.pieter.com", // Base URL to redirect
        queryParams: queryString, // Store all current query parameters
        isRedPortal: true // Flag to identify this as the red portal
    };
    
    scene.add(portalGroup);
    rhythmGame.redStartPortal = portalGroup;
    
    return portalGroup;
}

// Update the red start portal position and effects
function updateRedStartPortal(currentTime, scene) {
    if (!rhythmGame.redStartPortal) return;
    
    const portal = rhythmGame.redStartPortal;
    // Use the stored scene reference
    scene = scene || portal.userData.scene;
    
    // Calculate how far along its journey the portal is, just like cubes
    const timeToBeat = portal.userData.beatTime - currentTime;
    const totalDuration = rhythmGame.beatInterval * 4;
    
    let distanceFromVehicle;
    if (timeToBeat >= 0) {
        // Portal is still approaching the vehicle
        distanceFromVehicle = (timeToBeat / totalDuration) * rhythmGame.spawnDistance;
    } else {
        // Portal has passed the beat time
        const timeSinceBeat = -timeToBeat;
        const pastDistance = (timeSinceBeat / totalDuration) * rhythmGame.spawnDistance;
        distanceFromVehicle = -pastDistance;
    }
    
    // Check if portal has passed far behind the car
    if (distanceFromVehicle < -300) { // Increased from -10 to -30 for a longer period without portals
        // Reset portal to appear in front of the car again
        console.log("Resetting red portal position to front of car");
        
        // Add extra delay before the portal reappears
        const extraDelay = rhythmGame.beatInterval * 6; // 6 beats of delay (slightly different from oval portal)
        
        // Update portal's beat time to a future time with extra delay
        portal.userData.beatTime = currentTime + (rhythmGame.beatInterval * 4) + extraDelay;
        
        // Calculate new distance (far in front of the car)
        distanceFromVehicle = rhythmGame.spawnDistance * 1.3; // 1.3x further than normal spawn distance
    }
    
    // Update portal position
    const laneIndex = portal.userData.lane;
    const lanePos = rhythmGame.lanePositions[laneIndex];
    portal.position.x = lanePos.x;
    portal.position.z = -distanceFromVehicle;
    
    // Animate particles with subtle pulsing only (no spinning)
    if (portal.userData.particles) {
        const positions = portal.userData.particlePositions;
        const particleCount = portal.userData.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            // Apply a subtle pulsing effect instead of rotation
            const pulseFactor = Math.sin(currentTime * 0.001 + i) * 0.05;
            const baseIndex = i * 3;
            
            // Original position is maintained, just add subtle variation
            const originalX = positions[baseIndex];
            const originalY = positions[baseIndex + 1];
            
            // Subtle pulse effect
            positions[baseIndex] = originalX * (1 + pulseFactor);
            positions[baseIndex + 1] = originalY * (1 + pulseFactor);
        }
        
        portal.userData.particles.attributes.position.needsUpdate = true;
    }
    
    // Remove portal if it's gone too far past the player and we don't want to reposition it
    // This is commented out since we're now repositioning the portal instead of removing it
    /*
    if (distanceFromVehicle < -rhythmGame.despawnDistance * 2) {
        if (scene) {
            scene.remove(portal);
        }
        rhythmGame.redStartPortal = null;
    }
    */
}

// Initialize the rhythm game system
function initRhythmGameSystem(scene, laneWidth) {
    // Clear any existing cubes
    rhythmGame.activeCubes.forEach(cube => {
        scene.remove(cube);
    });
    
    rhythmGame.activeCubes = [];
    rhythmGame.cubePool = [];
    
    // Create cube pool
    for (let i = 0; i < rhythmGame.poolSize; i++) {
        const cube = createRhythmCube(scene);
        rhythmGame.cubePool.push(cube);
    }
    
    // Set up lane positions
    rhythmGame.laneWidth = laneWidth;
    updateLanePositions();
    
    // Calculate beat interval from BPM
    rhythmGame.beatInterval = 60000 / rhythmGame.bpm;
    
    console.log(`Rhythm game initialized with BPM: ${rhythmGame.bpm}, beat interval: ${rhythmGame.beatInterval}ms`);
    
    // Create particle effect pool
    rhythmGame.particlePool = [];
    for (let i = 0; i < rhythmGame.particlePoolSize; i++) {
        const particles = createParticleSystem(scene);
        rhythmGame.particlePool.push(particles);
    }
    
    // Initialize scoring
    rhythmGame.score = 0;
    rhythmGame.multiplier = 1;
    rhythmGame.multiplierProgress = 0;
    rhythmGame.cubesCollected = 0;
    
    // Add flag to track if first beat has happened
    rhythmGame.firstBeatOccurred = false;
    rhythmGame.ovalPortal = null;
    rhythmGame.redStartPortal = null;
    
    // Check for portal URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const hasPortalParam = urlParams.get('portal') === 'true';
    const hasRefParam = urlParams.has('ref');
    
    // Create the red start portal if URL has portal=true and ref parameters
    if (hasPortalParam && hasRefParam) {
        console.log("Creating red start portal in left lane based on URL parameters");
        createRedStartPortal(scene, 0); // 0 is left lane
    }
    
    // Initialize obstacle pool
    rhythmGame.obstaclePool = [];
    rhythmGame.activeObstacles = [];
    
    // Create obstacle pool
    for (let i = 0; i < rhythmGame.obstaclePoolSize; i++) {
        const obstacle = createObstacleVehicle(scene);
        rhythmGame.obstaclePool.push(obstacle);
    }
    
    return rhythmGame;
}

// Update lane positions based on fixed lanes
function updateLanePositions() {
    // In endless runner, lanes are fixed
    rhythmGame.lanePositions = [
        new THREE.Vector3(-rhythmGame.laneWidth, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(rhythmGame.laneWidth, 0, 0)
    ];
}

// Get a cube from the pool
function getPooledCube(scene) {
    // Check if there's an available cube in the pool
    for (const cube of rhythmGame.cubePool) {
        if (!cube.userData.active) {
            cube.visible = true;
            cube.userData.active = true;
            rhythmGame.activeCubes.push(cube);
            return cube;
        }
    }
    
    // If no cubes available, create a new one
    console.log("Pool exhausted, creating new cube");
    const newCube = createRhythmCube(scene);
    newCube.visible = true;
    newCube.userData.active = true;
    rhythmGame.cubePool.push(newCube);
    rhythmGame.activeCubes.push(newCube);
    return newCube;
}

// Return a cube to the pool
function returnCubeToPool(cube) {
    cube.visible = false;
    cube.userData.active = false;
    
    // Remove from active cubes
    const index = rhythmGame.activeCubes.indexOf(cube);
    if (index >= 0) {
        rhythmGame.activeCubes.splice(index, 1);
    }
}

// Spawn a beat cube at the given lane with neon colors
function spawnBeatCube(scene, lane, beatTime) {
    // Check if we have a cube too close in time in this lane
    const now = performance.now();
    
    // Don't spawn if this lane has had a cube spawned recently
    if (now - rhythmGame.laneSpawnStatus[lane] < rhythmGame.minLaneSpawnInterval) {
        return null;
    }
    
    // Don't spawn if there's a cube too close in time to this beat time
    const beatTimeStr = Math.floor(beatTime / 100).toString();
    if (rhythmGame.spawnHistory[beatTimeStr]) {
        const conflict = rhythmGame.spawnHistory[beatTimeStr]
            .find(spawn => Math.abs(spawn.beatTime - beatTime) < 300);
        
        if (conflict) {
            return null;
        }
    }
    
    // Get a cube from the pool
    const cube = getPooledCube(scene);
    
    // Get lane position
    const lanePos = rhythmGame.lanePositions[lane];
    
    // Position the cube at the spawn distance
    cube.position.set(
        lanePos.x,
        1.5, // Slightly above the ground
        -rhythmGame.spawnDistance // Far ahead on Z-axis
    );
    
    // Store the lane and beat time
    cube.userData.lane = lane;
    cube.userData.beatTime = beatTime;
    cube.userData.initialScale = 1;
    
    // Reset cube appearance
    cube.scale.set(1, 1, 1);
    cube.material.emissiveIntensity = 1.0;
    
    // Assign a neon color based on lane
    if (lane === 0) {
        // Red/magenta for left lane
        cube.material.emissive.setRGB(1, 0, 0.7);
        cube.wireframe.material.color.setRGB(1, 0, 0.7);
    } else if (lane === 1) {
        // Cyan for center lane
        cube.material.emissive.setRGB(0, 1, 1);
        cube.wireframe.material.color.setRGB(0, 1, 1);
    } else {
        // Purple/blue for right lane
        cube.material.emissive.setRGB(0.5, 0, 1);
        cube.wireframe.material.color.setRGB(0.5, 0, 1);
    }
    
    // Store spawn data
    rhythmGame.laneSpawnStatus[lane] = now;
    
    // Track spawn history to avoid overlaps
    if (!rhythmGame.spawnHistory[beatTimeStr]) {
        rhythmGame.spawnHistory[beatTimeStr] = [];
    }
    
    rhythmGame.spawnHistory[beatTimeStr].push({
        lane: lane,
        beatTime: beatTime
    });
    
    // Clean up old spawn history entries
    const oldEntries = Object.keys(rhythmGame.spawnHistory)
        .filter(key => now - parseInt(key) * 100 > 10000);
    
    oldEntries.forEach(key => delete rhythmGame.spawnHistory[key]);
    
    return cube;
}

// Collect a cube and trigger effects
function collectCube(scene, cube) {
    if (!cube.userData.collectible || cube.userData.collected) {
        return;
    }
    
    // Mark as collected
    cube.userData.collected = true;
    
    // Get the cube's color
    const cubeColor = cube.material.emissive.clone();
    
    // Trigger particle effect
    triggerParticleEffect(scene, cube.position.clone(), cubeColor);
    
    // Calculate score with multiplier
    const baseScore = cube.userData.scoreValue;
    const scoreGained = baseScore * rhythmGame.multiplier;
    
    // Add to score
    rhythmGame.score += scoreGained;
    rhythmGame.cubesCollected++;
    
    // Update multiplier progress
    rhythmGame.multiplierProgress++;
    if (rhythmGame.multiplierProgress >= rhythmGame.multiplierThreshold) {
        rhythmGame.multiplierProgress = 0;
        if (rhythmGame.multiplier < rhythmGame.maxMultiplier) {
            rhythmGame.multiplier *= 2;
        }
    }
    
    // Create floating score text
    createFloatingScore(scene, cube.position, scoreGained);
    
    // Return cube to pool
    returnCubeToPool(cube);
    
    // Return score gained
    return scoreGained;
}

// Create floating score text
function createFloatingScore(scene, position, score) {
    // Create canvas to render text
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add score text
    context.font = 'bold 32px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`+${score}`, canvas.width / 2, canvas.height / 2);
    
    // Create sprite material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 1; // Slightly above cube
    sprite.scale.set(3, 1.5, 1);
    
    // Add to scene
    scene.add(sprite);
    
    // Animate and remove after duration
    const startTime = performance.now();
    const duration = 1000; // ms
    
    // Store animation data
    sprite.userData = {
        startTime: startTime,
        duration: duration
    };
    
    // Add to animation array
    if (!scene.floatingScores) {
        scene.floatingScores = [];
    }
    scene.floatingScores.push(sprite);
}

// Update floating score animations
function updateFloatingScores(scene, currentTime) {
    if (!scene.floatingScores) return;
    
    for (let i = scene.floatingScores.length - 1; i >= 0; i--) {
        const sprite = scene.floatingScores[i];
        const elapsed = currentTime - sprite.userData.startTime;
        
        if (elapsed > sprite.userData.duration) {
            // Remove from scene
            scene.remove(sprite);
            scene.floatingScores.splice(i, 1);
        } else {
            // Animate position and opacity
            const progress = elapsed / sprite.userData.duration;
            
            // Move upward
            sprite.position.y += 0.02;
            
            // Fade out
            sprite.material.opacity = 1.0 - progress;
        }
    }
}

// Check for cube collisions with the vehicle
function checkCubeCollisions(vehicle) {
    if (!vehicle) return;
    
    const vehiclePosition = vehicle.group.position.clone();
    const collectDistance = rhythmGame.collectDistance;
    
    rhythmGame.activeCubes.forEach(cube => {
        if (!cube.userData.collected && cube.userData.collectible) {
            // Check if cube is within collection range
            const distance = Math.abs(cube.position.z - vehiclePosition.z);
            const xDistance = Math.abs(cube.position.x - vehiclePosition.x);
            
            // Check distance and lane alignment
            if (distance < collectDistance && xDistance < rhythmGame.laneWidth * 0.5) {
                collectCube(cube.parent, cube);
            }
        }
    });
}

// Check for portal collisions with the vehicle
function checkPortalCollisions(vehicle) {
    if (!vehicle) return;
    
    // Check both portals
    checkSinglePortalCollision(vehicle, rhythmGame.ovalPortal);
    checkSinglePortalCollision(vehicle, rhythmGame.redStartPortal);
}

// Check collision with a single portal
function checkSinglePortalCollision(vehicle, portal) {
    if (!portal) return;
    
    const vehiclePosition = vehicle.group.position.clone();
    const portalPosition = portal.position.clone();
    
    // Use a slightly larger collision distance for the portal
    const collisionDistance = rhythmGame.collectDistance * 1.5;
    
    // Check if vehicle is within collision range of the portal
    const zDistance = Math.abs(portalPosition.z - vehiclePosition.z);
    const xDistance = Math.abs(portalPosition.x - vehiclePosition.x);
    
    // Check distance and lane alignment
    if (zDistance < collisionDistance && xDistance < rhythmGame.laneWidth * 0.7) {
        console.log("Portal collision detected!");
        
        // Get the redirect URL and query parameters from portal userData
        let redirectURL = portal.userData.redirectURL;
        const queryParams = portal.userData.queryParams;
        const isRedPortal = portal.userData.isRedPortal;
        
        // Add query parameters to the redirect URL if they exist
        if (queryParams && queryParams.length > 0) {
            redirectURL += `?${queryParams}`;
        }
        
        // Create visual effect for portal entry
        createPortalEntryEffect(portal.position.clone(), isRedPortal);
        
        // Remove the portal after collision
        if (portal.userData.scene) {
            portal.userData.scene.remove(portal);
        }
        
        // Clear the right reference
        if (isRedPortal) {
            rhythmGame.redStartPortal = null;
        } else {
            rhythmGame.ovalPortal = null;
        }
        
        // Redirect to the URL
        if (redirectURL) {
            console.log(`Redirecting to ${redirectURL}`);
            // Redirect in current window
            window.location.href = redirectURL;
        }
    }
}

// Create a visual effect when entering the portal
function createPortalEntryEffect(position, isRedPortal) {
    // Choose color based on portal type
    const color = isRedPortal ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)';
    
    // Flash effect on screen
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100%';
    flashOverlay.style.height = '100%';
    flashOverlay.style.backgroundColor = color;
    flashOverlay.style.zIndex = '1000';
    flashOverlay.style.transition = 'opacity 1s ease-out';
    flashOverlay.style.opacity = '0.8';
    
    document.body.appendChild(flashOverlay);
    
    // Fade out the flash effect
    setTimeout(() => {
        flashOverlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(flashOverlay);
        }, 1000);
    }, 200);
}

// Process rhythm game beat detection and cube spawning
function updateRhythmGame(deltaTime, currentTime, musicPlaying, scene, vehicle) {
    if (!rhythmGame.enabled || !musicPlaying) return;
    
    // Get frequency data for beat detection
    const analyzerData = getAnalyzerData();
    if (!analyzerData) return;
    
    // Simple beat detection - check if bass frequencies exceed threshold
    let bassEnergy = 0;
    for (let i = rhythmGame.beatDetectionFrequencyRange[0]; i <= rhythmGame.beatDetectionFrequencyRange[1]; i++) {
        bassEnergy += analyzerData[i];
    }
    bassEnergy /= (rhythmGame.beatDetectionFrequencyRange[1] - rhythmGame.beatDetectionFrequencyRange[0] + 1);
    bassEnergy /= 255; // Normalize to 0-1
    
    // Store energy in history for tempo detection
    rhythmGame.energyHistory.push(bassEnergy);
    if (rhythmGame.energyHistory.length > 30) { // Keep last 30 samples
        rhythmGame.energyHistory.shift();
    }
    
    // Detect tempo changes - count peaks in recent history
    if (rhythmGame.energyHistory.length > 20) {
        let peakCount = 0;
        let inPeak = false;
        
        for (let i = 1; i < rhythmGame.energyHistory.length; i++) {
            const current = rhythmGame.energyHistory[i];
            const previous = rhythmGame.energyHistory[i-1];
            
            // Detect start of a peak
            if (!inPeak && current > previous && current > rhythmGame.beatDetectionThreshold) {
                inPeak = true;
                peakCount++;
            }
            // Detect end of peak
            else if (inPeak && current < previous) {
                inPeak = false;
            }
        }
        
        // Determine if we're in a fast tempo section
        const isFastTempo = peakCount >= 5; // Threshold for fast tempo
        
        // Only change if tempo state changes
        if (isFastTempo !== rhythmGame.isFastTempo) {
            console.log(`Rhythm game tempo changed to ${isFastTempo ? 'fast' : 'normal'}`);
            rhythmGame.isFastTempo = isFastTempo;
        }
    }
    
    // Set beat cooldown based on tempo
    const minBeatInterval = rhythmGame.isFastTempo ? 
                          rhythmGame.fastBeatCooldown : 
                          rhythmGame.beatCooldown;
    
    // Beat detection
    const timeSinceLastBeat = currentTime - rhythmGame.lastBeatTime;
    
    // Occasionally spawn obstacle vehicles (independent of beat)
    const timeSinceLastObstacle = currentTime - rhythmGame.lastObstacleTime;
    if (timeSinceLastObstacle > rhythmGame.obstacleSpawnInterval && Math.random() < rhythmGame.obstacleSpawnChance) {
        rhythmGame.lastObstacleTime = currentTime;
        
        // Spawn obstacles in different lanes
        for (let i = 0; i < rhythmGame.lanes; i++) {
            // Check if we should spawn in this lane based on timing
            const now = performance.now();
            const timeSinceLastInLane = now - rhythmGame.obstacleLaneSpawnStatus[i];
            
            // Don't oversaturate with obstacles, and ensure varied patterns
            if (timeSinceLastInLane > rhythmGame.obstacleMinLaneInterval && Math.random() < 0.5) {
                const beatTime = currentTime + (rhythmGame.beatInterval * 4);
                spawnObstacleVehicle(scene, i, beatTime);
                rhythmGame.obstacleLaneSpawnStatus[i] = now;
                
                // Increment obstacle counter
                rhythmGame.obstaclesTilNextCube++;
            }
        }
    }
    
    // Process beat detection (for both cubes and obstacles)
    if (bassEnergy > rhythmGame.beatDetectionThreshold && timeSinceLastBeat > minBeatInterval) {
        rhythmGame.lastBeatTime = currentTime;
        
        // Check if this is the first beat
        if (!rhythmGame.firstBeatOccurred) {
            rhythmGame.firstBeatOccurred = true;
            
            // Spawn the oval portal in the right lane
            createOvalPortal(scene, 2); // 2 is right lane (0=left, 1=center, 2=right)
            console.log("Green oval portal created in right lane");
        }
        
        // Decision: spawn cube or obstacle based on recent history
        // Force cube spawn if we've had too many obstacles in a row
        const shouldSpawnCube = rhythmGame.obstaclesTilNextCube >= rhythmGame.maxObstaclesInRow || Math.random() < 0.7;
        
        if (shouldSpawnCube) {
            // Spawn cube
            const lane = Math.floor(Math.random() * rhythmGame.lanes);
            const beatTime = currentTime + (rhythmGame.beatInterval * 4);
            spawnBeatCube(scene, lane, beatTime);
            
            // Reset obstacle counter
            rhythmGame.obstaclesTilNextCube = 0;
            
            // In fast tempo, spawn more cubes
            if (rhythmGame.isFastTempo && Math.random() < 0.6) {
                const additionalLane = (lane + 1 + Math.floor(Math.random() * 2)) % rhythmGame.lanes;
                const additionalBeatTime = beatTime + (rhythmGame.beatInterval * 0.5);
                spawnBeatCube(scene, additionalLane, additionalBeatTime);
            }
            // Normal tempo - less cubes
            else if (Math.random() < 0.3) {
                const additionalLane = (lane + 1 + Math.floor(Math.random() * 2)) % rhythmGame.lanes;
                const additionalBeatTime = beatTime + (rhythmGame.beatInterval * 0.5);
                spawnBeatCube(scene, additionalLane, additionalBeatTime);
            }
        } else {
            // Spawn obstacles across different lanes
            const lanesUsed = new Set();
            const numObstaclesToSpawn = rhythmGame.isFastTempo ? 
                Math.floor(Math.random() * 2) + 1 : // 1-2 obstacles in fast tempo
                1; // just 1 in normal tempo
            
            for (let i = 0; i < numObstaclesToSpawn; i++) {
                // Pick a lane that hasn't been used yet
                let lane;
                do {
                    lane = Math.floor(Math.random() * rhythmGame.lanes);
                } while (lanesUsed.has(lane) && lanesUsed.size < rhythmGame.lanes);
                
                // Add to used lanes
                lanesUsed.add(lane);
                
                const beatTime = currentTime + (rhythmGame.beatInterval * 4);
                // Use different timing for obstacles in different lanes
                const actualBeatTime = beatTime + (i * rhythmGame.beatInterval * 0.3);
                
                spawnObstacleVehicle(scene, lane, actualBeatTime);
                
                // Increment obstacle counter
                rhythmGame.obstaclesTilNextCube++;
            }
        }
    }
    
    // Update particle effects
    updateParticleEffects(currentTime);
    
    // Update floating scores
    updateFloatingScores(scene, currentTime);
    
    // Update green oval portal
    if (rhythmGame.ovalPortal) {
        updateOvalPortal(currentTime, scene);
    }
    
    // Update red start portal
    if (rhythmGame.redStartPortal) {
        updateRedStartPortal(currentTime, scene);
    }
    
    // Check for portal collisions
    checkPortalCollisions(vehicle);
    
    // Check for cube collection
    checkCubeCollisions(vehicle);
    
    // Check for obstacle collisions
    checkObstacleCollisions(vehicle);
    
    // Update existing cubes
    for (let i = rhythmGame.activeCubes.length - 1; i >= 0; i--) {
        const cube = rhythmGame.activeCubes[i];
        
        // Get lane position
        const laneIndex = cube.userData.lane;
        const lanePos = rhythmGame.lanePositions[laneIndex];
        
        // Calculate how far along its journey the cube is
        const timeToBeat = cube.userData.beatTime - currentTime;
        const totalDuration = rhythmGame.beatInterval * 4; // Increased from 2 to 4 to match spawn timing
        
        // Allow cubes to continue moving past the vehicle position even after time has passed
        let distanceFromVehicle;
        if (timeToBeat >= 0) {
            // Cube is still approaching the vehicle
            distanceFromVehicle = (timeToBeat / totalDuration) * rhythmGame.spawnDistance;
        } else {
            // Cube has passed the target time and should continue moving behind the vehicle
            // Calculate how far past the vehicle it should be based on elapsed time since beat
            const timeSinceBeat = -timeToBeat;
            const pastDistance = (timeSinceBeat / totalDuration) * rhythmGame.spawnDistance;
            distanceFromVehicle = -pastDistance; // Negative = behind vehicle
        }
        
        // In endless runner, cubes move toward the player along Z-axis
        cube.position.x = lanePos.x;
        cube.position.z = -distanceFromVehicle; 
        
        // Calculate distance-based opacity for fade-in effect
        let opacity = 1.0;
        if (distanceFromVehicle > rhythmGame.fadeDistance) {
            // Fade out objects that are too far
            opacity = 1 - ((distanceFromVehicle - rhythmGame.fadeDistance) / 30);
            opacity = Math.max(0, opacity);
        } else if (distanceFromVehicle > rhythmGame.fadeDistance * 0.8) {
            // Full opacity in optimal range
            opacity = 1.0;
        } else {
            // Fade in objects that are approaching from far away
            const fadeInStart = rhythmGame.fadeInDistance;
            if (distanceFromVehicle > fadeInStart) {
                // Complete fade out when very distant
                opacity = 0.0;
            } else {
                // Gradually fade in as objects get closer
                opacity = 1.0 - (distanceFromVehicle / fadeInStart);
                opacity = Math.max(0, Math.min(1, opacity));
                
                // Apply easing function for smoother appearance (cubic easing)
                opacity = opacity * opacity * (3 - 2 * opacity);
            }
        }
        
        // Apply opacity
        cube.material.opacity = opacity;
        if (cube.wireframe) {
            cube.wireframe.material.opacity = opacity;
        }
        
        // Pulse effect as cube approaches vehicle
        let beatProgress;
        if (timeToBeat >= 0) {
            beatProgress = 1 - (timeToBeat / totalDuration);
        } else {
            // For cubes that have passed the vehicle, keep a consistent appearance
            beatProgress = 1.0;
        }
        
        // Only apply pulse and glow effects if cube is visible enough
        if (opacity > 0.1) {
            // More pronounced pulse as the cube gets closer
            if (beatProgress > 0) {
                const pulseIntensity = Math.max(0.5, Math.min(1.5, 0.5 + Math.sin(beatProgress * Math.PI * 2) * 0.5));
                cube.scale.set(
                    cube.userData.initialScale * pulseIntensity,
                    cube.userData.initialScale * pulseIntensity,
                    cube.userData.initialScale * pulseIntensity
                );
                
                // Increase glow as it gets closer, max out at passing point
                cube.material.emissiveIntensity = Math.min(2.0, 0.5 + beatProgress * 1.5) * opacity;
            }
            
            // Add collection zone indicator
            const distToPlayer = Math.abs(cube.position.z);
            if (distToPlayer < rhythmGame.collectDistance * 2) {
                // Highlight cube when it's close to collection zone
                const glowIntensity = 1.5 + Math.sin(currentTime * 0.01) * 0.5;
                cube.material.emissiveIntensity = glowIntensity * opacity;
            }
        } else {
            // Set minimal scale when faded out to avoid popping
            cube.scale.set(1, 1, 1);
            cube.material.emissiveIntensity = 0.1;
        }
        
        // Check if cube has passed too far behind the vehicle and wasn't collected
        if (distanceFromVehicle < -rhythmGame.despawnDistance && !cube.userData.collected) {
            // Reset multiplier when missing a cube
            rhythmGame.multiplier = 1;
            rhythmGame.multiplierProgress = 0;
            
            returnCubeToPool(cube);
        }
    }
    
    // Update active obstacles
    for (let i = rhythmGame.activeObstacles.length - 1; i >= 0; i--) {
        const obstacle = rhythmGame.activeObstacles[i];
        
        // Get lane position
        const laneIndex = obstacle.userData.lane;
        const lanePos = rhythmGame.lanePositions[laneIndex];
        
        // Calculate how far along its journey the obstacle is
        const timeToBeat = obstacle.userData.beatTime - currentTime;
        const totalDuration = rhythmGame.beatInterval * 4; // Match cube timing
        
        // Calculate distance from vehicle
        let distanceFromVehicle;
        if (timeToBeat >= 0) {
            // Obstacle is still approaching the vehicle
            distanceFromVehicle = (timeToBeat / totalDuration) * rhythmGame.spawnDistance;
        } else {
            // Obstacle has passed the beat time
            const timeSinceBeat = -timeToBeat;
            const pastDistance = (timeSinceBeat / totalDuration) * rhythmGame.spawnDistance;
            distanceFromVehicle = -pastDistance; // Negative = behind vehicle
        }
        
        // Update obstacle position
        obstacle.position.x = lanePos.x;
        obstacle.position.z = -distanceFromVehicle;
        
        // Save position for next frame
        obstacle.userData.lastPosition.copy(obstacle.position);
        
        // Apply same opacity/fade rules as cubes
        let opacity = 1.0;
        if (distanceFromVehicle > rhythmGame.fadeDistance) {
            // Fade out objects that are too far
            opacity = 1 - ((distanceFromVehicle - rhythmGame.fadeDistance) / 30);
            opacity = Math.max(0, opacity);
        } else if (distanceFromVehicle > rhythmGame.fadeDistance * 0.8) {
            // Full opacity in optimal range
            opacity = 1.0;
        } else {
            // Fade in objects that are approaching from far away
            const fadeInStart = rhythmGame.fadeInDistance;
            if (distanceFromVehicle > fadeInStart) {
                // Complete fade out when very distant
                opacity = 0.0;
            } else {
                // Gradually fade in as objects get closer
                opacity = 1.0 - (distanceFromVehicle / fadeInStart);
                opacity = Math.max(0, Math.min(1, opacity));
                
                // Apply easing function for smoother appearance (cubic easing)
                opacity = opacity * opacity * (3 - 2 * opacity);
            }
        }
        
        // Apply opacity to all material components
        if (obstacle.userData.body) {
            obstacle.userData.body.material.opacity = opacity;
        }
        if (obstacle.userData.cabin) {
            obstacle.userData.cabin.material.opacity = opacity;
        }
        
        // Rotate wheels
        if (obstacle.userData.wheels) {
            obstacle.userData.wheels.forEach(wheel => {
                wheel.rotation.x += 0.1; // Simple constant speed for now
            });
        }
        
        // Pulse headlights
        if (obstacle.userData.headlights) {
            const pulseIntensity = 1.0 + Math.sin(currentTime * 0.005) * 0.3;
            obstacle.userData.headlights.forEach(light => {
                light.material.emissiveIntensity = pulseIntensity * opacity;
            });
        }
        
        // Check if obstacle has passed too far behind the vehicle
        if (distanceFromVehicle < -rhythmGame.despawnDistance) {
            returnObstacleToPool(obstacle);
        }
    }
    
    return {
        score: rhythmGame.score,
        multiplier: rhythmGame.multiplier,
        multiplierProgress: rhythmGame.multiplierProgress,
        threshold: rhythmGame.multiplierThreshold
    };
}

// Get the current score and multiplier
function getScoreInfo() {
    return {
        score: rhythmGame.score,
        multiplier: rhythmGame.multiplier,
        multiplierProgress: rhythmGame.multiplierProgress,
        threshold: rhythmGame.multiplierThreshold,
        cubesCollected: rhythmGame.cubesCollected
    };
}

// Create an obstacle vehicle for the rhythm game
function createObstacleVehicle(scene) {
    // Create a group to hold all vehicle parts
    const vehicle = new THREE.Group();
    
    // Create the main body of the vehicle (a car-like shape)
    const bodyGeometry = new THREE.BoxGeometry(2.0, 0.8, 3.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black base
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0xff0000, // Red neon glow - will be overridden per lane
        emissiveIntensity: 1.0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8; // Height from ground
    body.castShadow = true;
    body.receiveShadow = true;
    vehicle.add(body);
    
    // Add neon trim to the body
    const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000, // Red neon - will be overridden per lane
        linewidth: 2
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.y = 0.8;
    vehicle.add(edges);
    
    // Create a cabin for the vehicle
    const cabinGeometry = new THREE.BoxGeometry(1.8, 0.7, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0xff0000, // Red glow - will be overridden per lane
        emissiveIntensity: 0.7
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = 1.6; // On top of body
    cabin.position.z = -0.5; // Toward the front
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    vehicle.add(cabin);
    
    // Add neon trim to the cabin
    const cabinEdgeGeometry = new THREE.EdgesGeometry(cabinGeometry);
    const cabinEdges = new THREE.LineSegments(cabinEdgeGeometry, edgeMaterial);
    cabinEdges.position.y = 1.6;
    cabinEdges.position.z = -0.5;
    vehicle.add(cabinEdges);
    
    // Create four wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222, // Dark gray
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Wheel positions
    const wheelPositions = [
        { x: -1.0, y: 0.4, z: -1.0 }, // Front left
        { x: 1.0, y: 0.4, z: -1.0 },  // Front right
        { x: -1.0, y: 0.4, z: 1.0 },  // Rear left
        { x: 1.0, y: 0.4, z: 1.0 }    // Rear right
    ];
    
    // Add wheels
    const wheels = [];
    wheelPositions.forEach(position => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(position.x, position.y, position.z);
        wheel.rotation.z = Math.PI / 2; // Rotate to align with vehicle
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        wheels.push(wheel);
        vehicle.add(wheel);
    });
    
    // Add headlights at the front (facing the player)
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-0.7, 0.8, -1.8);
    leftHeadlight.scale.set(1, 1, 0.5);
    vehicle.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(0.7, 0.8, -1.8);
    rightHeadlight.scale.set(1, 1, 0.5);
    vehicle.add(rightHeadlight);
    
    // Make the vehicle face the player (opposite direction of cubes)
    vehicle.rotation.y = Math.PI;
    
    // Hide the vehicle initially
    vehicle.visible = false;
    
    // Store vehicle components
    vehicle.userData = {
        active: false,
        lane: 0,
        beatTime: 0,
        initialScale: 1,
        collided: false, // Flag to track if this obstacle has collided with the player
        body: body,
        edges: edges,
        cabin: cabin,
        cabinEdges: cabinEdges,
        headlights: [leftHeadlight, rightHeadlight],
        wheels: wheels,
        lastPosition: new THREE.Vector3() // For tracking movement between frames
    };
    
    // Add to scene
    scene.add(vehicle);
    
    return vehicle;
}

// Get a vehicle from the pool
function getPooledObstacle(scene) {
    // Check if there's an available obstacle in the pool
    for (const obstacle of rhythmGame.obstaclePool) {
        if (!obstacle.userData.active) {
            obstacle.visible = true;
            obstacle.userData.active = true;
            rhythmGame.activeObstacles.push(obstacle);
            return obstacle;
        }
    }
    
    // If no obstacles available, create a new one
    console.log("Obstacle pool exhausted, creating new obstacle");
    const newObstacle = createObstacleVehicle(scene);
    newObstacle.visible = true;
    newObstacle.userData.active = true;
    rhythmGame.obstaclePool.push(newObstacle);
    rhythmGame.activeObstacles.push(newObstacle);
    return newObstacle;
}

// Return an obstacle to the pool
function returnObstacleToPool(obstacle) {
    obstacle.visible = false;
    obstacle.userData.active = false;
    obstacle.userData.collided = false;
    
    // Remove from active obstacles
    const index = rhythmGame.activeObstacles.indexOf(obstacle);
    if (index >= 0) {
        rhythmGame.activeObstacles.splice(index, 1);
    }
}

// Spawn an obstacle vehicle in a specified lane
function spawnObstacleVehicle(scene, lane, beatTime) {
    // Check cooldown between obstacles in the same lane
    const now = performance.now();
    
    // Don't spawn if this lane has had something spawned recently
    if (now - rhythmGame.laneSpawnStatus[lane] < rhythmGame.minLaneSpawnInterval) {
        return null;
    }
    
    // Get a vehicle from the pool
    const obstacle = getPooledObstacle(scene);
    
    // Get lane position
    const lanePos = rhythmGame.lanePositions[lane];
    
    // Position the obstacle at the spawn distance
    obstacle.position.set(
        lanePos.x,
        0, // On the ground
        -rhythmGame.spawnDistance // Far ahead on Z-axis
    );
    
    // Store the lane and beat time
    obstacle.userData.lane = lane;
    obstacle.userData.beatTime = beatTime;
    obstacle.userData.initialScale = 1;
    obstacle.userData.lastPosition.copy(obstacle.position);
    obstacle.userData.closeCallTriggered = false; // Reset close call flag
    
    // Set color based on lane
    const laneColor = new THREE.Color(rhythmGame.obstacleColors[lane]);
    
    // Update materials
    obstacle.userData.body.material.emissive.copy(laneColor);
    obstacle.userData.edges.material.color.copy(laneColor);
    obstacle.userData.cabin.material.emissive.copy(laneColor);
    obstacle.userData.cabinEdges.material.color.copy(laneColor);
    
    // Store spawn data
    rhythmGame.laneSpawnStatus[lane] = now;
    rhythmGame.obstacleLaneSpawnStatus[lane] = now;
    
    console.log(`Spawned obstacle in lane ${lane}`); // Debug log
    
    return obstacle;
}

// Handle collision with obstacle
function handleObstacleCollision(scene, vehicle, obstacle) {
    if (obstacle.userData.collided) {
        return; // Already processed this collision
    }
    
    obstacle.userData.collided = true;
    
    // Apply score penalty
    rhythmGame.score = Math.max(0, rhythmGame.score - rhythmGame.collisionPenalty);
    
    // Reset multiplier
    rhythmGame.multiplier = 1;
    rhythmGame.multiplierProgress = 0;
    
    // Visual feedback for collision
    const flashColor = new THREE.Color(0xff0000); // Red flash
    
    // Create explosion effect
    const explosionParticles = triggerParticleEffect(scene, obstacle.position.clone(), flashColor);
    if (explosionParticles) {
        // Make explosion bigger
        explosionParticles.userData.speed = 4.0;
        explosionParticles.userData.duration = 1500;
    }
    
    // Screen shake effect
    const gameCanvas = document.getElementById('game-canvas');
    if (gameCanvas) {
        gameCanvas.style.animation = 'none';
        void gameCanvas.offsetWidth; // Trigger reflow
        gameCanvas.style.animation = 'screenShake 0.5s';
    }
    
    // Add screen shake animation if it doesn't exist
    if (!document.getElementById('screen-shake-style')) {
        const style = document.createElement('style');
        style.id = 'screen-shake-style';
        style.textContent = `
            @keyframes screenShake {
                0% { transform: translate(0); }
                10% { transform: translate(-5px, -5px); }
                20% { transform: translate(5px, 5px); }
                30% { transform: translate(-5px, 5px); }
                40% { transform: translate(5px, -5px); }
                50% { transform: translate(-5px, 0); }
                60% { transform: translate(5px, 0); }
                70% { transform: translate(0, 5px); }
                80% { transform: translate(0, -5px); }
                90% { transform: translate(-3px, -3px); }
                100% { transform: translate(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Flash effect on screen
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100%';
    flashOverlay.style.height = '100%';
    flashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    flashOverlay.style.zIndex = '1000';
    flashOverlay.style.transition = 'opacity 0.5s ease-out';
    flashOverlay.style.opacity = '0.8';
    
    document.body.appendChild(flashOverlay);
    
    // Fade out the flash effect
    setTimeout(() => {
        flashOverlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(flashOverlay);
        }, 500);
    }, 100);
    
    // Set collision cooldown
    rhythmGame.collisionOccurred = true;
    rhythmGame.lastCollisionTime = performance.now();
    
    // Remove obstacle
    returnObstacleToPool(obstacle);
    
    // Return penalty amount for display purposes
    return -rhythmGame.collisionPenalty;
}

// Handle close call with obstacle (near miss)
function handleObstacleCloseCall(scene, obstacle) {
    // Create floating score text for close call bonus
    createFloatingScore(scene, obstacle.position, rhythmGame.closeCallBonus);
    
    // Add points
    rhythmGame.score += rhythmGame.closeCallBonus;
    
    // Add to multiplier progress
    rhythmGame.multiplierProgress++;
    if (rhythmGame.multiplierProgress >= rhythmGame.multiplierThreshold) {
        rhythmGame.multiplierProgress = 0;
        if (rhythmGame.multiplier < rhythmGame.maxMultiplier) {
            rhythmGame.multiplier *= 2;
        }
    }
    
    // Create a subtle visual effect for close call
    const closeCallColor = new THREE.Color(0xffff00); // Yellow flash
    triggerParticleEffect(scene, obstacle.position.clone(), closeCallColor);
    
    // Mark obstacle as having triggered close call to avoid repeat triggers
    obstacle.userData.closeCallTriggered = true;
    
    return rhythmGame.closeCallBonus;
}

// Check for obstacle collisions with the vehicle
function checkObstacleCollisions(vehicle) {
    if (!vehicle) return;
    
    // Skip collision check during cooldown
    const now = performance.now();
    if (rhythmGame.collisionOccurred && now - rhythmGame.lastCollisionTime < rhythmGame.collisionCooldown) {
        return;
    }
    
    rhythmGame.collisionOccurred = false;
    
    const vehiclePosition = vehicle.group.position.clone();
    const collisionDistance = rhythmGame.obstacleCollisionDistance;
    const closeCallDistance = rhythmGame.obstacleCloseCallDistance;
    
    rhythmGame.activeObstacles.forEach(obstacle => {
        if (obstacle.userData.collided) return; // Skip if already collided
        
        // Check if obstacle is in same lane as vehicle
        const xDistance = Math.abs(obstacle.position.x - vehiclePosition.x);
        const inSameLane = xDistance < rhythmGame.laneWidth * 0.5;
        
        // Check distance to vehicle
        const zDistance = Math.abs(obstacle.position.z - vehiclePosition.z);
        
        // Collision detection
        if (inSameLane && zDistance < collisionDistance) {
            handleObstacleCollision(obstacle.parent, vehicle, obstacle);
        }
        // Close call detection - needs to be in same lane, recently passed player, and not yet triggered
        else if (inSameLane && zDistance < closeCallDistance && obstacle.position.z > vehiclePosition.z && !obstacle.userData.closeCallTriggered) {
            handleObstacleCloseCall(obstacle.parent, obstacle);
        }
    });
}

export { 
    initRhythmGameSystem, 
    updateRhythmGame, 
    spawnBeatCube, 
    rhythmGame,
    getScoreInfo,
    checkPortalCollisions,
    createPortalEntryEffect,
    createRedStartPortal,
    createObstacleVehicle,
    spawnObstacleVehicle,
    checkObstacleCollisions
}; 