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
    pulseIntensity: 1.5, // Maximum intensity for pulsing effect
    fadeDistance: 120, // Distance at which objects start to fade
    basePulseSpeed: 0.5, // Base speed of pulsing effect
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
        color: 0x00ffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.9
    });
    
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    pyramid.add(wireframe);
    pyramid.wireframe = wireframe;
    
    // Store original colors for pulsing effect
    pyramid.userData = {
        baseColor: new THREE.Color(0x00ffff),
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed,
        type: 'wireframe'
    };
    
    return pyramid;
}

// Create a neon pillar
function createNeonPillar(height = 15) {
    // Create a cylinder geometry for the pillar
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, height, 8);
    
    // Create the material with glow effect
    const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xff00ff,
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
            emissive: 0xff00ff,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -height/2 + (i+1) * (height/(ringCount+1));
        
        pillar.add(ring);
    }
    
    // Store original colors for pulsing effect
    pillar.userData = {
        baseColor: new THREE.Color(0xff00ff),
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed * 0.8,
        type: 'pillar'
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
    
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.3, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00ff77,
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
            color: 0x00ff77,
            transparent: true,
            opacity: 0.9
        });
        
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.copy(point);
        archGroup.add(light);
    }
    
    // Store original colors for pulsing effect
    archGroup.userData = {
        baseColor: new THREE.Color(0x00ff77),
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed * 1.2,
        type: 'arch'
    };
    
    return archGroup;
}

// Create an animated billboard with scrolling light patterns
function createBillboard(width = 8, height = 6) {
    // Create a group to hold all parts
    const billboardGroup = new THREE.Group();
    
    // Create the frame
    const frameGeometry = new THREE.BoxGeometry(width, height, 0.5);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x0033ff,
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
    
    // Draw some neon lines
    context.strokeStyle = '#0077ff';
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
    
    // Store original colors for pulsing effect
    billboardGroup.userData = {
        baseColor: new THREE.Color(0x0077ff),
        currentPulse: 0,
        pulseDirection: 1,
        pulseSpeed: roadsideConfig.basePulseSpeed * 0.7,
        scrollOffset: 0,
        type: 'billboard'
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
        
        // Randomize rotation for variety, except for arches
        if (objectType !== 'arch') {
            object.rotation.y = Math.random() * Math.PI * 2;
        }
        
        // Reset pulsing effect
        object.userData.currentPulse = Math.random(); // Random starting phase
    }
    
    // Get audio data for reactive effects
    const analyzerData = musicPlaying ? getAnalyzerData() : null;
    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;
    
    if (analyzerData) {
        // Calculate energy in different frequency ranges
        for (let i = 0; i < 4; i++) bassEnergy += analyzerData[i];
        bassEnergy = (bassEnergy / 4) / 255;
        
        for (let i = 5; i < 12; i++) midEnergy += analyzerData[i];
        midEnergy = (midEnergy / 7) / 255;
        
        for (let i = 13; i < 20; i++) trebleEnergy += analyzerData[i];
        trebleEnergy = (trebleEnergy / 7) / 255;
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
        
        // Apply pulsing effect based on music energy and object type
        let pulseValue = 0;
        let colorShift = new THREE.Color();
        
        if (musicPlaying && analyzerData) {
            // Different objects react to different frequency ranges
            switch (object.userData.type) {
                case 'pillar':
                    pulseValue = bassEnergy * roadsideConfig.pulseIntensity;
                    colorShift.setRGB(bassEnergy, 0, bassEnergy);
                    break;
                case 'wireframe':
                    pulseValue = midEnergy * roadsideConfig.pulseIntensity;
                    colorShift.setRGB(0, midEnergy, midEnergy);
                    break;
                case 'arch':
                    pulseValue = trebleEnergy * roadsideConfig.pulseIntensity;
                    colorShift.setRGB(0, trebleEnergy, trebleEnergy * 0.7);
                    break;
                case 'billboard':
                    pulseValue = midEnergy * roadsideConfig.pulseIntensity * 0.8;
                    colorShift.setRGB(midEnergy * 0.3, midEnergy * 0.5, midEnergy);
                    // Update billboard scroll based on music
                    object.userData.scrollOffset += midEnergy * 0.03;
                    if (object.texture) {
                        object.texture.offset.y = object.userData.scrollOffset;
                        object.texture.needsUpdate = true;
                    }
                    break;
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
                const combinedColor = object.userData.baseColor.clone().multiply(colorShift);
                object.material.emissive.copy(combinedColor);
                object.material.emissiveIntensity = pulseValue;
                object.material.opacity = opacity;
            }
        } else if (object.children && object.children.length > 0) {
            // For complex objects with multiple parts
            object.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    const combinedColor = object.userData.baseColor.clone().multiply(colorShift);
                    child.material.emissive.copy(combinedColor);
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
            const wireColor = object.userData.baseColor.clone().multiply(colorShift);
            object.wireframe.material.color.copy(wireColor);
            object.wireframe.material.opacity = opacity * pulseValue;
        }
        
        // Scale effect based on pulse for some objects
        if (object.userData.type === 'wireframe' || object.userData.type === 'pillar') {
            const scale = 1 + (pulseValue * 0.2);
            object.scale.set(scale, 1, scale);
        }
    }
}

export { initRoadsideObjects, updateRoadsideObjects, roadsideConfig }; 