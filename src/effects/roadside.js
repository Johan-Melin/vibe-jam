import * as THREE from 'three';
import { getAnalyzerData } from '../audio/audioManager.js';

// Configuration for roadside objects
const roadsideConfig = {
    spawnInterval: 5, // Distance between spawned objects (in units)
    objectTypes: ['pillar', 'wireframe', 'arch', 'billboard'], 
    distanceFromRoad: 8, // Distance from center of track to place objects
    maxObjects: 50, // Maximum objects to keep in the scene
    objectPool: [], // Pool of objects
    activeObjects: [], // Currently active objects
    traversedDistance: 0, // Distance tracker
    lastSpawnPoint: 0, // Last spawn point
    pulseIntensity: 1.8, // Maximum intensity for pulsing effect
    fadeDistance: 120, // Distance at which objects start to fade
    basePulseSpeed: 0.5, // Base speed of pulsing effect
    lastBeatTime: 0, // Last detected beat time
    beatThreshold: 0.6, // Threshold for beat detection
    beatCooldown: 250, // Minimum time between beats (ms)
    fastBeatCooldown: 125, // Cooldown for fast portions (ms)
    isFastTempo: false, // Track if we're in a fast section
    tempoTransitionTime: 2000, // Time to transition between tempos (ms)
    lastColorChangeTime: 0, // Track when we last changed colors
    colorPalette: [ // Match the three beat cube colors
        new THREE.Color(1, 0, 0.7),  // Magenta (left lane)
        new THREE.Color(0, 1, 1),    // Cyan (center lane)
        new THREE.Color(0.5, 0, 1)   // Purple (right lane)
    ],
    currentColorIndex: 0, // Track current color to cycle
    jumpDuration: 0.5,    // Duration of jump animation in seconds
    tempoEnergyHistory: [], // Track energy levels to detect tempo changes
    energyHistorySize: 30  // Number of samples to track for tempo detection
};

// Create a neon wireframe object
function createWireframePyramid(height = 10) {
    // Create a pyramid geometry
    const geometry = new THREE.ConeGeometry(4, height, 4, 1);
    
    // Create basic material for the shape
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: false,
        transparent: true,
        opacity: 0.2
    });
    
    // Create the mesh
    const pyramid = new THREE.Mesh(geometry, material);
    
    // Add glowing wireframe
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: roadsideConfig.colorPalette[0],
        linewidth: 2,
        transparent: true,
        opacity: 0.9
    });
    
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    pyramid.add(wireframe);
    pyramid.wireframe = wireframe;
    
    // Store original colors and animation data
    const colorIndex = Math.floor(Math.random() * roadsideConfig.colorPalette.length);
    pyramid.userData = {
        baseColor: roadsideConfig.colorPalette[colorIndex].clone(),
        colorIndex: colorIndex,
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed,
        type: 'wireframe',
        jumpHeight: 0,
        jumpPhase: Math.random() * Math.PI * 2,
        lastJumpTime: 0,
        isJumping: false,
        jumpProgress: 0,
        originalY: 0 // Will be set on placement
    };
    
    return pyramid;
}

// Create a neon pillar
function createNeonPillar(height = 15) {
    // Create a cylinder geometry for the pillar
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, height, 8);
    
    // Choose a random color from the palette
    const colorIndex = Math.floor(Math.random() * roadsideConfig.colorPalette.length);
    const color = roadsideConfig.colorPalette[colorIndex].clone();
    
    // Create the material with glow effect
    const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: color,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.9
    });
    
    // Create the pillar mesh
    const pillar = new THREE.Mesh(geometry, material);
    
    // Add ring details at intervals
    const ringCount = Math.floor(height / 3);
    for (let i = 0; i < ringCount; i++) {
        const ringGeometry = new THREE.TorusGeometry(1, 0.2, 8, 16);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: color,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -height/2 + (i+1) * (height/(ringCount+1));
        
        pillar.add(ring);
    }
    
    // Store original colors and animation data
    pillar.userData = {
        baseColor: color,
        colorIndex: colorIndex,
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed * 0.8,
        type: 'pillar',
        jumpHeight: 0,
        jumpPhase: Math.random() * Math.PI * 2,
        lastJumpTime: 0,
        isJumping: false,
        jumpProgress: 0,
        originalY: 0 // Will be set on placement
    };
    
    return pillar;
}

// Create a neon arch that spans over the track
function createNeonArch(width = 14, height = 10) {
    // Create a group to hold all parts of the arch
    const archGroup = new THREE.Group();
    
    // Create tube geometry for the arch
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-width/2, 0, 0),
        new THREE.Vector3(-width/4, height, 0),
        new THREE.Vector3(width/4, height, 0),
        new THREE.Vector3(width/2, 0, 0)
    ]);
    
    // Choose a random color from the palette
    const colorIndex = Math.floor(Math.random() * roadsideConfig.colorPalette.length);
    const color = roadsideConfig.colorPalette[colorIndex].clone();
    
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.3, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: color,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.9
    });
    
    const arch = new THREE.Mesh(tubeGeometry, tubeMaterial);
    archGroup.add(arch);
    
    // Add light strips along the arch
    const lightCount = 10;
    for (let i = 0; i < lightCount; i++) {
        const t = i / (lightCount - 1);
        const point = curve.getPoint(t);
        
        const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.copy(point);
        archGroup.add(light);
    }
    
    // Store original colors and animation data
    archGroup.userData = {
        baseColor: color,
        colorIndex: colorIndex,
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed * 1.2,
        type: 'arch',
        jumpHeight: 0,
        jumpPhase: Math.random() * Math.PI * 2,
        lastJumpTime: 0,
        isJumping: false,
        jumpProgress: 0,
        originalY: 0 // Will be set on placement
    };
    
    return archGroup;
}

// Create an animated billboard with scrolling light patterns
function createBillboard(width = 8, height = 6) {
    // Create a group to hold all parts
    const billboardGroup = new THREE.Group();
    
    // Choose a random color from the palette
    const colorIndex = Math.floor(Math.random() * roadsideConfig.colorPalette.length);
    const color = roadsideConfig.colorPalette[colorIndex].clone();
    
    // Create the frame
    const frameGeometry = new THREE.BoxGeometry(width, height, 0.5);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    billboardGroup.add(frame);
    
    // Create a screen with scrolling pattern
    const screenGeometry = new THREE.PlaneGeometry(width - 0.5, height - 0.5);
    
    // Create dynamic texture for the screen
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with black
    context.fillStyle = 'black';
    context.fillRect(0, 0, 256, 256);
    
    // Convert THREE color to CSS color string
    const cssColor = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    
    // Draw some neon lines
    context.strokeStyle = cssColor;
    context.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
        const y = i * 25;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(256, y);
        context.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    const screenMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9
    });
    
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.3;
    billboardGroup.add(screen);
    
    // Store animation data
    billboardGroup.screen = screen;
    billboardGroup.texture = texture;
    
    // Store original colors and animation data
    billboardGroup.userData = {
        baseColor: color,
        colorIndex: colorIndex,
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed * 0.7,
        scrollOffset: 0,
        type: 'billboard',
        jumpHeight: 0,
        jumpPhase: Math.random() * Math.PI * 2,
        lastJumpTime: 0,
        isJumping: false,
        jumpProgress: 0,
        originalY: 0 // Will be set on placement
    };
    
    return billboardGroup;
}

// Create a random roadside object
function createRoadsideObject(type) {
    switch(type) {
        case 'pillar':
            return createNeonPillar(15 + Math.random() * 10);
        case 'wireframe':
            return createWireframePyramid(10 + Math.random() * 15);
        case 'arch':
            return createNeonArch();
        case 'billboard':
            return createBillboard();
        default:
            return createWireframePyramid(); // Default
    }
}

// Initialize roadside objects system
function initRoadsideObjects(scene) {
    // Create initial objects in the pool
    for (let i = 0; i < roadsideConfig.maxObjects; i++) {
        const randomType = roadsideConfig.objectTypes[Math.floor(Math.random() * roadsideConfig.objectTypes.length)];
        const object = createRoadsideObject(randomType);
        object.visible = false;
        scene.add(object);
        roadsideConfig.objectPool.push(object);
    }
    
    return roadsideConfig;
}

// Get an object from the pool
function getPooledObject(scene, type) {
    // First try to find an object of the same type
    for (let i = 0; i < roadsideConfig.objectPool.length; i++) {
        const object = roadsideConfig.objectPool[i];
        if (!object.visible && object.userData.type === type) {
            object.visible = true;
            roadsideConfig.objectPool.splice(i, 1);
            roadsideConfig.activeObjects.push(object);
            return object;
        }
    }
    
    // If none available, use any object
    if (roadsideConfig.objectPool.length > 0) {
        const object = roadsideConfig.objectPool.pop();
        object.visible = true;
        roadsideConfig.activeObjects.push(object);
        return object;
    }
    
    // If pool is empty, recycle the oldest active object
    if (roadsideConfig.activeObjects.length > 0) {
        const oldestObject = roadsideConfig.activeObjects.shift();
        roadsideConfig.activeObjects.push(oldestObject);
        return oldestObject;
    }
    
    // If nothing available, create a new one
    const newObject = createRoadsideObject(type);
    scene.add(newObject);
    roadsideConfig.activeObjects.push(newObject);
    return newObject;
}

// Return an object to the pool
function returnObjectToPool(object) {
    object.visible = false;
    
    // Remove from active objects
    const index = roadsideConfig.activeObjects.indexOf(object);
    if (index >= 0) {
        roadsideConfig.activeObjects.splice(index, 1);
    }
    
    // Add back to pool
    roadsideConfig.objectPool.push(object);
}

// Cycle to the next color in the palette when a beat is detected
function cycleColor() {
    roadsideConfig.currentColorIndex = (roadsideConfig.currentColorIndex + 1) % roadsideConfig.colorPalette.length;
    roadsideConfig.lastColorChangeTime = performance.now();
    return roadsideConfig.colorPalette[roadsideConfig.currentColorIndex];
}

// Detect tempo changes based on beat frequency
function updateTempoDetection(bassEnergy) {
    // Add current energy to history
    roadsideConfig.tempoEnergyHistory.push(bassEnergy);
    
    // Keep history at specified size
    if (roadsideConfig.tempoEnergyHistory.length > roadsideConfig.energyHistorySize) {
        roadsideConfig.tempoEnergyHistory.shift();
    }
    
    // Only proceed if we have enough history
    if (roadsideConfig.tempoEnergyHistory.length < roadsideConfig.energyHistorySize) {
        return;
    }
    
    // Calculate average energy over last few seconds
    const avgEnergy = roadsideConfig.tempoEnergyHistory.reduce((sum, e) => sum + e, 0) / 
                     roadsideConfig.tempoEnergyHistory.length;
    
    // Count peaks (beats) in the energy history
    let peakCount = 0;
    let inPeak = false;
    
    for (let i = 1; i < roadsideConfig.tempoEnergyHistory.length; i++) {
        const current = roadsideConfig.tempoEnergyHistory[i];
        const previous = roadsideConfig.tempoEnergyHistory[i-1];
        
        // Detect start of a peak
        if (!inPeak && current > previous && current > roadsideConfig.beatThreshold) {
            inPeak = true;
            peakCount++;
        }
        // Detect end of peak
        else if (inPeak && current < previous) {
            inPeak = false;
        }
    }
    
    // Determine if we're in a fast tempo section
    const isFastTempo = peakCount >= roadsideConfig.energyHistorySize / 6; // Threshold for fast tempo
    
    // Only change if tempo state changes
    if (isFastTempo !== roadsideConfig.isFastTempo) {
        console.log(`Tempo changed to ${isFastTempo ? 'fast' : 'normal'}`);
        roadsideConfig.isFastTempo = isFastTempo;
    }
}

// Update roadside objects based on music and movement
function updateRoadsideObjects(scene, deltaTime, trackData, musicPlaying) {
    const trackDistance = trackData.traversedDistance;
    roadsideConfig.traversedDistance = trackDistance;
    
    // Spawn new objects if needed
    if (trackDistance - roadsideConfig.lastSpawnPoint > roadsideConfig.spawnInterval) {
        roadsideConfig.lastSpawnPoint = trackDistance;
        
        // Choose random side (left or right)
        const side = Math.random() > 0.5 ? -1 : 1;
        
        // Choose random object type
        const typeIndex = Math.floor(Math.random() * roadsideConfig.objectTypes.length);
        const objectType = roadsideConfig.objectTypes[typeIndex];
        
        // Get object from pool
        const object = getPooledObject(scene, objectType);
        
        // Assign a color from the palette
        const colorIndex = Math.floor(Math.random() * roadsideConfig.colorPalette.length);
        object.userData.colorIndex = colorIndex;
        object.userData.baseColor = roadsideConfig.colorPalette[colorIndex].clone();
        
        // Set position based on track distance and side
        // For arch type, place it over the road
        if (objectType === 'arch') {
            object.position.set(
                0, // Centered on track
                0, // On ground, the arch object handles its own height
                -roadsideConfig.spawnInterval * 20 // Far ahead
            );
        } else {
            object.position.set(
                side * roadsideConfig.distanceFromRoad, // Left or right of track
                0, // On ground
                -roadsideConfig.spawnInterval * 20 // Far ahead
            );
        }
        
        // Store the original Y position immediately after placement
        object.userData.originalY = object.position.y;
        
        // Randomize rotation for variety, except for arches
        if (objectType !== 'arch') {
            object.rotation.y = Math.random() * Math.PI * 2;
        }
        
        // Reset animation properties
        object.userData.currentPulse = Math.random(); // Random starting phase
        object.userData.jumpPhase = Math.random() * Math.PI * 2;
        object.userData.isJumping = false;
        object.userData.jumpProgress = 0;
        object.userData.lastJumpTime = 0;
    }
    
    // Get audio data for reactive effects
    const analyzerData = musicPlaying ? getAnalyzerData() : null;
    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;
    let beatDetected = false;
    const currentTime = performance.now();
    
    if (analyzerData) {
        // Calculate energy in different frequency ranges
        for (let i = 0; i < 4; i++) bassEnergy += analyzerData[i];
        bassEnergy = (bassEnergy / 4) / 255;
        
        for (let i = 5; i < 12; i++) midEnergy += analyzerData[i];
        midEnergy = (midEnergy / 7) / 255;
        
        for (let i = 13; i < 20; i++) trebleEnergy += analyzerData[i];
        trebleEnergy = (trebleEnergy / 7) / 255;
        
        // Update tempo detection
        updateTempoDetection(bassEnergy);
        
        // Set beat cooldown based on tempo
        const beatCooldown = roadsideConfig.isFastTempo ? 
                           roadsideConfig.fastBeatCooldown : 
                           roadsideConfig.beatCooldown;
        
        // Beat detection with tempo-based cooldown
        if (bassEnergy > roadsideConfig.beatThreshold && currentTime - roadsideConfig.lastBeatTime > beatCooldown) {
            roadsideConfig.lastBeatTime = currentTime;
            beatDetected = true;
            
            // Cycle color on beat
            cycleColor();
            
            // Now apply color change to ALL objects on beat
            roadsideConfig.activeObjects.forEach(object => {
                // In fast tempo, color changes are less frequent to avoid overwhelming visuals
                if (!roadsideConfig.isFastTempo || Math.random() < 0.5) {
                    object.userData.colorIndex = roadsideConfig.currentColorIndex;
                    object.userData.baseColor = roadsideConfig.colorPalette[roadsideConfig.currentColorIndex].clone();
                }
                
                // Trigger jump animation on beat
                if (!object.userData.isJumping) {
                    object.userData.isJumping = true;
                    object.userData.jumpProgress = 0;
                    object.userData.lastJumpTime = currentTime;
                }
            });
        }
    }
    
    // Update active objects
    for (let i = roadsideConfig.activeObjects.length - 1; i >= 0; i--) {
        const object = roadsideConfig.activeObjects[i];
        
        // Move objects with track movement
        object.position.z += trackData.moveSpeed;
        
        // If object is too far behind, return to pool
        if (object.position.z > 20) {
            returnObjectToPool(object);
            continue;
        }
        
        // Calculate fade based on distance
        const distanceFromPlayer = -object.position.z;
        let opacity = 1.0;
        
        if (distanceFromPlayer > roadsideConfig.fadeDistance) {
            // Fade out objects that are too far
            opacity = 1 - ((distanceFromPlayer - roadsideConfig.fadeDistance) / 30);
            opacity = Math.max(0, opacity);
        }
        
        // Apply pulsing and jumping effect based on music energy and object type
        let pulseValue = 0;
        const color = roadsideConfig.colorPalette[object.userData.colorIndex].clone();
        
        if (musicPlaying && analyzerData) {
            // Handle jump animation with smooth transitions
            if (object.userData.isJumping) {
                // Calculate jump progress (0 to 1) over jump duration
                const jumpElapsed = (currentTime - object.userData.lastJumpTime) / 1000; // in seconds
                object.userData.jumpProgress = Math.min(jumpElapsed / roadsideConfig.jumpDuration, 1);
                
                // Apply smooth jump using sin curve (up and down)
                if (object.userData.jumpProgress < 1) {
                    // Use sin curve for smooth up and down motion
                    const jumpHeight = object.userData.type === 'arch' ? 0.5 : 1.5;
                    const jumpFactor = Math.sin(object.userData.jumpProgress * Math.PI) * jumpHeight;
                    
                    // Vary jump height based on object type and bass energy
                    let typeMultiplier = 1.0;
                    switch(object.userData.type) {
                        case 'pillar': typeMultiplier = 0.8; break;
                        case 'wireframe': typeMultiplier = 1.2; break;
                        case 'billboard': typeMultiplier = 1.0; break;
                    }
                    
                    const finalJumpHeight = jumpFactor * bassEnergy * typeMultiplier;
                    object.position.y = object.userData.originalY + finalJumpHeight;
                } else {
                    // Jump animation complete
                    object.userData.isJumping = false;
                    object.position.y = object.userData.originalY;
                }
            }
            
            // Calculate pulse value based on music
            if (beatDetected || (currentTime - roadsideConfig.lastBeatTime < 100)) {
                // Strong pulse on beat
                pulseValue = bassEnergy * roadsideConfig.pulseIntensity;
            } else {
                // Different objects react to different frequency ranges
                switch (object.userData.type) {
                    case 'pillar':
                        pulseValue = bassEnergy * 1.2;
                        break;
                    case 'wireframe':
                        pulseValue = midEnergy * 1.4;
                        break;
                    case 'arch':
                        pulseValue = trebleEnergy * 1.3;
                        break;
                    case 'billboard':
                        pulseValue = midEnergy * 1.2;
                        // Update billboard scroll based on music
                        object.userData.scrollOffset += midEnergy * 0.05;
                        if (object.texture) {
                            object.texture.offset.y = object.userData.scrollOffset;
                            object.texture.needsUpdate = true;
                        }
                        break;
                }
            }
        } else {
            // Fallback pulsing when no music
            object.userData.currentPulse += object.userData.pulseSpeed * deltaTime;
            if (object.userData.currentPulse > 1) {
                object.userData.currentPulse = 0;
            }
            pulseValue = Math.sin(object.userData.currentPulse * Math.PI * 2) * 0.3 + 0.7;
        }
        
        // Apply pulse effect to object
        if (object.material) {
            // For simple objects with one material
            if (object.material.emissive) {
                object.material.emissive.copy(color);
                object.material.emissiveIntensity = pulseValue;
                object.material.opacity = opacity;
            }
        } else if (object.children && object.children.length > 0) {
            // For complex objects with multiple parts
            object.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.copy(color);
                    child.material.emissiveIntensity = pulseValue;
                    child.material.opacity = opacity;
                }
                if (child.material && child.material.color) {
                    child.material.opacity = opacity;
                }
            });
        }
        
        // Special handling for wireframes
        if (object.wireframe) {
            object.wireframe.material.color.copy(color);
            object.wireframe.material.opacity = opacity * pulseValue;
        }
        
        // Scale effect based on pulse for some objects (avoid scaling arches)
        if (object.userData.type === 'wireframe' || object.userData.type === 'pillar') {
            const scale = 1 + (pulseValue * 0.3); // Increased scale effect
            object.scale.set(scale, scale, scale); // Scale in all directions for more bounce
        }
    }
}

export { initRoadsideObjects, updateRoadsideObjects, roadsideConfig }; 