import * as THREE from 'three';
import { getAnalyzerData } from '../audio/audioManager.js';

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
    passPoint: 0 // Point where cube passes the vehicle (0 = at vehicle position)
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
        initialScale: 1
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
    
    return cube;
}

// Process rhythm game beat detection and cube spawning
function updateRhythmGame(deltaTime, currentTime, musicPlaying, scene) {
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
    
    // Beat detection
    const timeSinceLastBeat = currentTime - rhythmGame.lastBeatTime;
    const minBeatInterval = rhythmGame.beatInterval * 0.8; // Increased from 0.5 to 0.8 to further reduce frequency
    
    if (bassEnergy > rhythmGame.beatDetectionThreshold && timeSinceLastBeat > minBeatInterval) {
        rhythmGame.lastBeatTime = currentTime;
        
        // Only spawn one cube per beat, randomly selecting a lane
        const lane = Math.floor(Math.random() * rhythmGame.lanes);
        const beatTime = currentTime + (rhythmGame.beatInterval * 4); // Increased from 2 to 4 for slower approach
        spawnBeatCube(scene, lane, beatTime);
        
        // Only occasionally spawn additional cubes (1 in 3 chance)
        if (Math.random() < 0.3) {
            const additionalLane = (lane + 1 + Math.floor(Math.random() * 2)) % rhythmGame.lanes; // Different lane
            const additionalBeatTime = beatTime + (rhythmGame.beatInterval * 0.5); // Slightly offset timing
            spawnBeatCube(scene, additionalLane, additionalBeatTime);
        }
    }
    
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
        
        // Pulse effect as cube approaches vehicle
        let beatProgress;
        if (timeToBeat >= 0) {
            beatProgress = 1 - (timeToBeat / totalDuration);
        } else {
            // For cubes that have passed the vehicle, keep a consistent appearance
            beatProgress = 1.0;
        }
        
        // More pronounced pulse as the cube gets closer
        if (beatProgress > 0) {
            const pulseIntensity = Math.max(0.5, Math.min(1.5, 0.5 + Math.sin(beatProgress * Math.PI * 2) * 0.5));
            cube.scale.set(
                cube.userData.initialScale * pulseIntensity,
                cube.userData.initialScale * pulseIntensity,
                cube.userData.initialScale * pulseIntensity
            );
            
            // Increase glow as it gets closer, max out at passing point
            cube.material.emissiveIntensity = Math.min(2.0, 0.5 + beatProgress * 1.5);
        }
        
        // Check if cube has passed too far behind the vehicle
        if (distanceFromVehicle < -rhythmGame.despawnDistance) {
            returnCubeToPool(cube);
        }
    }
}

export { 
    initRhythmGameSystem, 
    updateRhythmGame, 
    spawnBeatCube, 
    rhythmGame 
}; 