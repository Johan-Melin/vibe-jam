import * as THREE from 'three';

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011); // Dark blue-black background for neon contrast

// Add fog to the scene for atmosphere and depth
scene.fog = new THREE.FogExp2(0x000022, 0.008); // Darker, denser fog for neon glow effect

// Set up audio for the engine sound and background music
let engineSound;
let backgroundMusic;
let audioListener;
let audioLoaded = false;
let musicLoaded = false;  // Add a specific flag for music loaded state
let audioContext;
let musicPlaying = false;
let audioAnalyzer;  // Analyzer for visualizing the music
let analyzerData;   // Data from the analyzer

// Track time for animation
let previousTime = 0;

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

// Initialize audio system but don't play yet
function setupAudio() {
    // Create an audio listener and add it to the camera
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    
    // Store audio context for resuming later
    audioContext = audioListener.context;
    
    // Create a global audio source for the engine
    engineSound = new THREE.Audio(audioListener);
    
    // Create a global audio source for background music
    backgroundMusic = new THREE.Audio(audioListener);
    
    // Load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    
    // Create status elements for loading progress
    createLoadingStatusElements();
    
    // Load engine sound
    audioLoader.load('./sounds/engine_loop.mp3', function(buffer) {
        engineSound.setBuffer(buffer);
        engineSound.setLoop(true);
        engineSound.setVolume(0.5);
        // Don't autoplay - wait for user interaction
        audioLoaded = true;
        
        // Start with idle engine sound when played
        engineSound.setPlaybackRate(0.5);
        
        updateLoadingStatus('engine', 'complete');
        
        // Show a message to the user if both sounds are loaded
        checkAndShowAudioStartMessage();
    },
    // onProgress callback
    function(xhr) {
        const progress = Math.round(xhr.loaded / xhr.total * 100);
        console.log('Engine sound: ' + progress + '% loaded');
        updateLoadingStatus('engine', 'loading', progress);
    },
    // onError callback
    function(err) {
        console.error('Could not load engine sound: ' + err);
        updateLoadingStatus('engine', 'error');
    });
    
    // Load background music
    audioLoader.load('./music/Electric Fever Dream.mp3', function(buffer) {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(0.7);
        musicLoaded = true;  // Set the music loaded flag
        console.log('Background music loaded successfully');
        
        // Set up audio analyzer once music is loaded
        setupAudioAnalyzer();
        
        updateLoadingStatus('music', 'complete');
        
        // Show a message to the user if both sounds are loaded
        checkAndShowAudioStartMessage();
    },
    // onProgress callback
    function(xhr) {
        const progress = Math.round(xhr.loaded / xhr.total * 100);
        console.log('Background music: ' + progress + '% loaded');
        updateLoadingStatus('music', 'loading', progress);
    },
    // onError callback
    function(err) {
        console.error('Could not load background music: ' + err);
        updateLoadingStatus('music', 'error');
        
        // Try alternative file names if the first one fails
        tryAlternativeMusicFiles(audioLoader);
    });
}

// Create visual elements to show loading progress
function createLoadingStatusElements() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'audio-loading-status';
    loadingDiv.style.position = 'absolute';
    loadingDiv.style.top = '10px';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translateX(-50%)';
    loadingDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    loadingDiv.style.color = 'white';
    loadingDiv.style.padding = '10px 20px';
    loadingDiv.style.borderRadius = '5px';
    loadingDiv.style.fontFamily = 'Arial, sans-serif';
    loadingDiv.style.zIndex = '1000';
    loadingDiv.style.minWidth = '300px';
    loadingDiv.style.textAlign = 'center';
    
    // Engine sound status
    const engineStatusDiv = document.createElement('div');
    engineStatusDiv.id = 'engine-status';
    engineStatusDiv.innerHTML = 'Engine Sound: <span class="status">Loading...</span>';
    engineStatusDiv.style.marginBottom = '5px';
    
    // Create progress bar for engine sound
    const engineProgressBarContainer = document.createElement('div');
    engineProgressBarContainer.style.width = '100%';
    engineProgressBarContainer.style.height = '10px';
    engineProgressBarContainer.style.backgroundColor = '#444';
    engineProgressBarContainer.style.borderRadius = '5px';
    engineProgressBarContainer.style.overflow = 'hidden';
    engineProgressBarContainer.style.marginBottom = '8px';
    
    const engineProgressBar = document.createElement('div');
    engineProgressBar.id = 'engine-progress';
    engineProgressBar.style.width = '0%';
    engineProgressBar.style.height = '100%';
    engineProgressBar.style.backgroundColor = '#4CAF50';
    engineProgressBar.style.transition = 'width 0.3s';
    
    engineProgressBarContainer.appendChild(engineProgressBar);
    engineStatusDiv.appendChild(engineProgressBarContainer);
    
    // Music status
    const musicStatusDiv = document.createElement('div');
    musicStatusDiv.id = 'music-status';
    musicStatusDiv.innerHTML = 'Background Music: <span class="status">Loading...</span>';
    musicStatusDiv.style.marginBottom = '5px';
    
    // Create progress bar for music
    const musicProgressBarContainer = document.createElement('div');
    musicProgressBarContainer.style.width = '100%';
    musicProgressBarContainer.style.height = '10px';
    musicProgressBarContainer.style.backgroundColor = '#444';
    musicProgressBarContainer.style.borderRadius = '5px';
    musicProgressBarContainer.style.overflow = 'hidden';
    
    const musicProgressBar = document.createElement('div');
    musicProgressBar.id = 'music-progress';
    musicProgressBar.style.width = '0%';
    musicProgressBar.style.height = '100%';
    musicProgressBar.style.backgroundColor = '#4CAF50';
    musicProgressBar.style.transition = 'width 0.3s';
    
    musicProgressBarContainer.appendChild(musicProgressBar);
    musicStatusDiv.appendChild(musicProgressBarContainer);
    
    // Add status divs to the main container
    loadingDiv.appendChild(engineStatusDiv);
    loadingDiv.appendChild(musicStatusDiv);
    
    // Add to document
    document.body.appendChild(loadingDiv);
}

// Update the visual loading status
function updateLoadingStatus(type, status, progress = 0) {
    const statusElement = document.getElementById(`${type}-status`);
    const progressBar = document.getElementById(`${type}-progress`);
    
    if (!statusElement || !progressBar) return;
    
    const statusTextElement = statusElement.querySelector('.status');
    
    switch (status) {
        case 'loading':
            statusTextElement.textContent = `Loading... ${progress}%`;
            progressBar.style.width = `${progress}%`;
            break;
        case 'complete':
            statusTextElement.textContent = 'Ready ✓';
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#4CAF50'; // Green
            break;
        case 'error':
            statusTextElement.textContent = 'Error loading!';
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#f44336'; // Red
            break;
    }
    
    // Check if all audio is loaded
    checkAllAudioLoaded();
}

// Check if all audio is loaded and update UI accordingly
function checkAllAudioLoaded() {
    if (audioLoaded && musicLoaded) {
        const loadingDiv = document.getElementById('audio-loading-status');
        if (loadingDiv) {
            setTimeout(() => {
                loadingDiv.style.transition = 'opacity 1s';
                loadingDiv.style.opacity = '0';
                setTimeout(() => {
                    loadingDiv.style.display = 'none';
                }, 1000);
            }, 1500); // Show the completed status for 1.5 seconds before fading
        }
    }
}

// Only show the audio start message when both engine and music are loaded
function checkAndShowAudioStartMessage() {
    if (audioLoaded && musicLoaded) {
        showAudioStartMessage();
    }
}

// Try to load music using alternative filenames
function tryAlternativeMusicFiles(audioLoader) {
    const possibleFilenames = [
        './music/background.mp3',
        './music/track.mp3',
        './music/theme.mp3',
        './music/music.mp3'
    ];
    
    let fileIndex = 0;
    
    function tryNextFile() {
        if (fileIndex >= possibleFilenames.length) {
            console.error('Failed to load any music files');
            return;
        }
        
        const filename = possibleFilenames[fileIndex];
        fileIndex++;
        
        console.log(`Trying to load music from: ${filename}`);
        updateLoadingStatus('music', 'loading', 0);
        
        audioLoader.load(filename, 
            function(buffer) {
                backgroundMusic.setBuffer(buffer);
                backgroundMusic.setLoop(true);
                backgroundMusic.setVolume(0.7);
                musicLoaded = true;
                console.log(`Successfully loaded music from: ${filename}`);
                updateLoadingStatus('music', 'complete');
                checkAndShowAudioStartMessage();
            },
            function(xhr) {
                const progress = Math.round(xhr.loaded / xhr.total * 100);
                console.log(`${filename}: ${progress}% loaded`);
                updateLoadingStatus('music', 'loading', progress);
            },
            function(err) {
                console.error(`Failed to load ${filename}: ${err}`);
                updateLoadingStatus('music', 'error');
                tryNextFile();
            }
        );
    }
    
    tryNextFile();
}

// Consolidated function to handle all audio toggling
function toggleAudio() {
    if (!audioLoaded) {
        console.log("Engine sound not loaded yet");
        return;
    }
    
    if (!musicLoaded) {
        console.log("Background music not loaded yet");
        return;
    }
    
    // First ensure audio context is running
    if (audioContext && audioContext.state !== 'running') {
        console.log("Starting audio context");
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            
            // Start both engine and music
            if (!engineSound.isPlaying) {
                engineSound.play();
                console.log("Engine sound started");
            }
            
            if (backgroundMusic && !backgroundMusic.isPlaying) {
                backgroundMusic.play();
                musicPlaying = true;
                console.log("Background music started");
            }
            
            // Remove the message if it exists
            const messageDiv = document.getElementById('audio-message');
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        });
    } 
    // If context is running, toggle sounds
    else {
        // Toggle engine sound
        if (engineSound.isPlaying) {
            engineSound.pause();
            console.log("Engine sound paused");
            
            // Also pause background music
            if (backgroundMusic.isPlaying) {
                backgroundMusic.pause();
                musicPlaying = false;
                console.log("Background music paused");
            }
        } else {
            engineSound.play();
            console.log("Engine sound resumed");
            
            // Also resume background music
            if (backgroundMusic && !backgroundMusic.isPlaying) {
                backgroundMusic.play();
                musicPlaying = true;
                console.log("Background music resumed");
            }
        }
        
        // Remove the message if it exists
        const messageDiv = document.getElementById('audio-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }
}

// Display a message to the user about starting audio
function showAudioStartMessage() {
    // Create a simple overlay message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'audio-message';
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.fontFamily = 'Arial, sans-serif';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.cursor = 'pointer';
    messageDiv.textContent = 'Click here or press M to start engine sound and music';
    
    // Add click handler to start audio using the consolidated function
    messageDiv.addEventListener('click', toggleAudio);
    
    // Add to document
    document.body.appendChild(messageDiv);
}

// Update engine sound based on vehicle speed
function updateEngineSound() {
    if (!audioLoaded || !engineSound) return;
    
    // Calculate engine sound playback rate based on speed
    // Idle sound at 0.5x speed, max sound at 2.0x speed
    const minRate = 0.5;  // Idle engine sound
    const maxRate = 2.0;  // Maximum revving sound
    
    // Calculate target playback rate based on speed percentage
    const speedPercentage = Math.abs(vehicleControls.speed) / vehicleControls.maxSpeed;
    const targetRate = minRate + (speedPercentage * (maxRate - minRate));
    
    // Apply the playback rate with a little smoothing
    const currentRate = engineSound.playbackRate;
    const newRate = currentRate + (targetRate - currentRate) * 0.1;
    engineSound.setPlaybackRate(newRate);
}

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Third-person camera configuration
const thirdPersonCamera = {
    distance: 8,           // Distance behind vehicle
    height: 4,             // Height above vehicle
    lookAtHeight: 1,       // Look at point above vehicle
    damping: 0.1,          // Camera smoothing factor (lower = smoother)
    rotationDamping: 0.2,  // Rotation smoothing factor
    currentPosition: new THREE.Vector3(), // Current interpolated position
    targetPosition: new THREE.Vector3(),  // Target position to move toward
    isActive: true,        // Is the third-person camera active
    stiffness: 0.3,        // How quickly camera adjusts (higher = stiffer)
    springiness: 0.9,      // How much the camera springs back (higher = bouncier)
    lastVehiclePos: new THREE.Vector3()   // Last position for tracking vehicle motion
};

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization

// Variables for endless runner ground segments
const endlessRunner = {
    segments: [],
    segmentLength: 20,  // Length of each ground segment
    segmentWidth: 10,   // Width of the track
    visibleSegments: 15, // Number of segments visible ahead
    totalSegments: 20,   // Total segments to create (includes some behind player)
    moveSpeed: 0.5,      // Speed of ground movement
    groundY: 0,          // Y position of the ground
    traversedDistance: 0 // Total distance traversed
};

// Enhanced lighting setup for neon aesthetics
function setupLighting() {
    // Clear any existing lights from the scene
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Ambient light (very low for contrast)
    const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
    scene.add(ambientLight);
    
    // Add a dim bluish hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x0033ff, 0xff00ff, 0.3);
    scene.add(hemisphereLight);
    
    // Add central point light with neon purple color
    const pointLight = new THREE.PointLight(0xff00ff, 1.0, 50);
    pointLight.position.set(0, 15, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    scene.add(pointLight);
    
    // Add a cyan light that follows the vehicle
    const vehicleLight = new THREE.PointLight(0x00ffff, 1.5, 30);
    vehicleLight.position.set(0, 5, 0);
    vehicleLight.castShadow = true;
    vehicleLight.shadow.mapSize.width = 1024;
    vehicleLight.shadow.mapSize.height = 1024;
    scene.add(vehicleLight);
    
    // Store the vehicle light so we can update its position
    scene.vehicleLight = vehicleLight;
    
    // Add neon floor lighting
    const floorLight1 = new THREE.PointLight(0xff00aa, 1.0, 20);
    floorLight1.position.set(20, 0.5, 20);
    scene.add(floorLight1);
    
    const floorLight2 = new THREE.PointLight(0x00ffaa, 1.0, 20);
    floorLight2.position.set(-20, 0.5, -20);
    scene.add(floorLight2);
    
    const floorLight3 = new THREE.PointLight(0x0088ff, 1.0, 20);
    floorLight3.position.set(-20, 0.5, 20);
    scene.add(floorLight3);
    
    const floorLight4 = new THREE.PointLight(0xaa00ff, 1.0, 20);
    floorLight4.position.set(20, 0.5, -20);
    scene.add(floorLight4);
    
    return {
        ambientLight,
        hemisphereLight,
        pointLight,
        vehicleLight,
        floorLights: [floorLight1, floorLight2, floorLight3, floorLight4]
    };
}

// Enable shadows in renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Create enhanced ground with neon grid
function createGroundPlane() {
    // Instead of a static ground plane, initialize endless runner
    initEndlessRunner();
    
    // Add neon lines along the x axis as lane dividers
    addNeonAxisLines();
}

// Add neon lines along the axes
function addNeonAxisLines() {
    // Lane dividers along the Z axis - magenta
    const leftLaneGeometry = new THREE.BufferGeometry();
    const leftLanePoints = [
        new THREE.Vector3(-vehicleControls.laneWidth/2, 0.1, -100),
        new THREE.Vector3(-vehicleControls.laneWidth/2, 0.1, 100)
    ];
    leftLaneGeometry.setFromPoints(leftLanePoints);
    const leftLaneMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff,
        linewidth: 3,
        emissive: 0xff00ff,
        emissiveIntensity: 1.0
    });
    const leftLaneLine = new THREE.Line(leftLaneGeometry, leftLaneMaterial);
    scene.add(leftLaneLine);
    
    // Right lane divider
    const rightLaneGeometry = new THREE.BufferGeometry();
    const rightLanePoints = [
        new THREE.Vector3(vehicleControls.laneWidth/2, 0.1, -100),
        new THREE.Vector3(vehicleControls.laneWidth/2, 0.1, 100)
    ];
    rightLaneGeometry.setFromPoints(rightLanePoints);
    const rightLaneMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff,
        linewidth: 3,
        emissive: 0xff00ff,
        emissiveIntensity: 1.0
    });
    const rightLaneLine = new THREE.Line(rightLaneGeometry, rightLaneMaterial);
    scene.add(rightLaneLine);
}

// Function to create a neon vehicle model
function createVehicle() {
    // Create a group to hold all vehicle parts
    const vehicle = new THREE.Group();
    
    // Create the main body of the vehicle (truck)
    const bodyGeometry = new THREE.BoxGeometry(2.5, 1.0, 4.0);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black base
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x0088ff, // Blue neon glow
        emissiveIntensity: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0; // Height from ground
    body.castShadow = true;
    body.receiveShadow = true;
    vehicle.add(body);
    
    // Add neon trim to the body
    const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, // Cyan neon
        emissive: 0x00ffff,
        emissiveIntensity: 1.0,
        linewidth: 3
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.y = 1.0;
    vehicle.add(edges);
    
    // Create a cabin for the vehicle
    const cabinGeometry = new THREE.BoxGeometry(2.0, 0.8, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0x000022, // Very dark blue
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0xff00aa, // Pink/purple neon glow
        emissiveIntensity: 0.5
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = 1.9; // On top of body
    cabin.position.z = -0.8; // Toward the front of the vehicle
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    vehicle.add(cabin);
    
    // Add neon trim to the cabin
    const cabinEdgeGeometry = new THREE.EdgesGeometry(cabinGeometry);
    const cabinEdgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff00ff, // Magenta neon
        emissive: 0xff00ff,
        emissiveIntensity: 1.0,
        linewidth: 2
    });
    const cabinEdges = new THREE.LineSegments(cabinEdgeGeometry, cabinEdgeMaterial);
    cabinEdges.position.y = 1.9;
    cabinEdges.position.z = -0.8;
    vehicle.add(cabinEdges);
    
    // Add windows to the cabin with neon glow
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff, // Light blue
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,  
        opacity: 0.7,      
        depthWrite: false,
        emissive: 0x00ffff, // Cyan glow
        emissiveIntensity: 0.5
    });
    
    // Front window
    const frontWindowGeometry = new THREE.BoxGeometry(1.7, 0.55, 0.05);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.y = 1.9;
    frontWindow.position.z = -1.55;
    vehicle.add(frontWindow);
    
    // Side windows
    const leftWindowGeometry = new THREE.BoxGeometry(0.05, 0.55, 1.3);
    const leftWindow = new THREE.Mesh(leftWindowGeometry, windowMaterial);
    leftWindow.position.set(-0.99, 1.9, -0.8);
    vehicle.add(leftWindow);
    
    const rightWindowGeometry = new THREE.BoxGeometry(0.05, 0.55, 1.3);
    const rightWindow = new THREE.Mesh(rightWindowGeometry, windowMaterial);
    rightWindow.position.set(0.99, 1.9, -0.8);
    vehicle.add(rightWindow);
    
    // Create four wheels with neon rims
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111, // Almost black
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Position the wheels at the corners of the vehicle
    const wheelPositions = [
        { x: -1.2, y: 0.5, z: -1.3 }, // Front left
        { x: 1.2, y: 0.5, z: -1.3 },  // Front right
        { x: -1.2, y: 0.5, z: 1.3 },  // Rear left
        { x: 1.2, y: 0.5, z: 1.3 }    // Rear right
    ];
    
    const wheels = [];
    wheelPositions.forEach((position, index) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(position.x, position.y, position.z);
        wheel.rotation.z = Math.PI / 2; // Rotate to align with vehicle
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        wheels.push(wheel);
        vehicle.add(wheel);
        
        // Add neon rim (different colors for front/back)
        const rimGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: index < 2 ? 0x00ffff : 0xff00aa, // Cyan for front, pink for back
            emissive: index < 2 ? 0x00ffff : 0xff00aa,
            emissiveIntensity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.set(position.x, position.y, position.z);
        
        // Rotate rim to match wheel orientation
        if (index === 0 || index === 2) { // Left side
            rim.rotation.x = Math.PI / 2;
        } else { // Right side
            rim.rotation.x = Math.PI / 2;
        }
        vehicle.add(rim);
    });
    
    // Taillights (magenta) - At the BACK of the vehicle
    const taillightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff0088,
        emissiveIntensity: 1.0,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    leftTaillight.position.set(-0.8, 0.9, 2.0);
    leftTaillight.scale.set(1, 1, 0.5);
    vehicle.add(leftTaillight);
    
    const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    rightTaillight.position.set(0.8, 0.9, 2.0);
    rightTaillight.scale.set(1, 1, 0.5);
    vehicle.add(rightTaillight);
    
    // Add the vehicle to the scene
    scene.add(vehicle);
    
    // Store relevant vehicle parts for animation and movement
    return {
        group: vehicle,
        body,
        wheels,
        cabin,
        taillights: [leftTaillight, rightTaillight]
    };
}

// Create a light cone effect for headlights
function createLightCone(color) {
    const coneGeometry = new THREE.ConeGeometry(2, 5, 16, 1, true);
    const coneMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    // The cone geometry should not have an offset in local space
    // The position will be set when adding to the vehicle
    
    return cone;
}

// Create a cube for the rhythm game with neon style
function createRhythmCube() {
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

// Vehicle movement controls and state
const vehicleControls = {
    speed: 0.5, // Constant forward speed for endless runner
    maxSpeed: 0.5,
    acceleration: 0.01,
    deceleration: 0.005,
    turnSpeed: 0.03,
    maxTurnSpeed: 0.05,
    wheelRotationSpeed: 0.2,
    keys: {
        left: false,
        right: false
    },
    position: new THREE.Vector3(0, 0, 0),
    targetLane: 1, // Center lane (0=left, 1=center, 2=right)
    laneWidth: 3, // Distance between lanes
    laneChangeSpeed: 0.1, // How fast to change lanes
    // Track vehicle's forward direction vector
    direction: new THREE.Vector3(0, 0, -1)
};

// Update third-person camera position and rotation to follow vehicle
function updateThirdPersonCamera() {
    if (!thirdPersonCamera.isActive) return;
    
    const vehiclePos = vehicle.group.position;
    
    // Set camera to fixed position behind and slightly above the vehicle
    const idealX = vehiclePos.x;
    const idealZ = vehiclePos.z + 10; // Fixed distance behind
    const idealHeight = vehiclePos.y + 5; // Fixed height above
    
    // Smoothly approach target position with damping (no sudden snapping)
    if (!thirdPersonCamera.currentPosition.x) {
        // First time initialization
        thirdPersonCamera.currentPosition.set(idealX, idealHeight, idealZ);
    } else {
        // Apply smooth damping to camera position
        const damping = thirdPersonCamera.damping;
        
        thirdPersonCamera.currentPosition.x += (idealX - thirdPersonCamera.currentPosition.x) * damping;
        thirdPersonCamera.currentPosition.y += (idealHeight - thirdPersonCamera.currentPosition.y) * damping;
        thirdPersonCamera.currentPosition.z += (idealZ - thirdPersonCamera.currentPosition.z) * damping;
    }
    
    // Update camera position
    camera.position.copy(thirdPersonCamera.currentPosition);
    
    // Look at vehicle (slightly ahead)
    const lookAtPos = new THREE.Vector3(
        vehiclePos.x,
        vehiclePos.y + 1,
        vehiclePos.z - 5 // Look ahead of the vehicle
    );
    
    // Always maintain world up vector
    camera.up.set(0, 1, 0);
    
    // Smoothly look at the target
    camera.lookAt(lookAtPos);
}

// Function to update vehicle position and rotation based on controls
function updateVehicleMovement(deltaTime) {
    const controls = vehicleControls;
    
    // Speed is constant in endless runner mode
    controls.speed = controls.maxSpeed;
    
    // Calculate target X position based on lane
    const targetX = (controls.targetLane - 1) * controls.laneWidth;
    
    // Handle lane changes with arrow keys
    if (controls.keys.left && controls.targetLane > 0) {
        controls.targetLane--;
        controls.keys.left = false; // Prevent holding key
    }
    if (controls.keys.right && controls.targetLane < 2) {
        controls.targetLane++;
        controls.keys.right = false; // Prevent holding key
    }
    
    // Smoothly move towards target lane
    vehicle.group.position.x += (targetX - vehicle.group.position.x) * controls.laneChangeSpeed;
    
    // Keep vehicle at fixed Z position
    vehicle.group.position.z = 0;
    
    // Update vehicle light to follow the vehicle
    if (scene.vehicleLight) {
        scene.vehicleLight.position.set(
            vehicle.group.position.x,
            vehicle.group.position.y + 5, // Height above vehicle
            vehicle.group.position.z
        );
    }
    
    // Rotate wheels based on speed - wheels should always spin in endless runner
    const wheelRotationAmount = controls.speed * controls.wheelRotationSpeed;
    vehicle.wheels.forEach(wheel => {
        wheel.rotation.x += wheelRotationAmount;
    });
    
    // Update engine sound based on speed
    updateEngineSound();
    
    // Update the third-person camera
    updateThirdPersonCamera();
}

// Set up key controls for vehicle
function setupVehicleControls() {
    window.addEventListener('keydown', (event) => {
        switch(event.key) {
            case 'ArrowLeft':
                vehicleControls.keys.left = true;
                break;
            case 'ArrowRight':
                vehicleControls.keys.right = true;
                break;
            case 'c': // Toggle camera mode
                thirdPersonCamera.isActive = !thirdPersonCamera.isActive;
                if (!thirdPersonCamera.isActive) {
                    // Reset camera to default position when disabling third-person view
                    camera.position.set(0, 5, 10);
                    camera.lookAt(0, 0, 0);
                }
                break;
            case 'm': // Toggle music
            case 'M':
                toggleAudio();
                break;
        }
    });
    
    window.addEventListener('keyup', (event) => {
        switch(event.key) {
            case 'ArrowLeft':
                vehicleControls.keys.left = false;
                break;
            case 'ArrowRight':
                vehicleControls.keys.right = false;
                break;
        }
    });
}

// Set up lighting
const lights = setupLighting();

// Create the ground
const ground = createGroundPlane();

// Create the vehicle
const vehicle = createVehicle();

// Initialize third-person camera's last vehicle position
thirdPersonCamera.lastVehiclePos.copy(vehicle.group.position);

// Set up vehicle controls
setupVehicleControls();

// Set up audio
setupAudio();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Create a segment for the endless runner
function createGroundSegment(zPosition) {
    const segmentGeometry = new THREE.PlaneGeometry(
        endlessRunner.segmentWidth, 
        endlessRunner.segmentLength, 
        10, 10
    );
    
    // Custom shader material for the ground - dark with neon grid
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000, // Black base
        roughness: 0.7,
        metalness: 0.5,
        emissive: 0x000011, // Very slight blue emissive glow
    });
    
    // Create the ground mesh
    const segment = new THREE.Mesh(segmentGeometry, groundMaterial);
    segment.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
    segment.position.y = endlessRunner.groundY;
    segment.position.z = zPosition;
    segment.receiveShadow = true;
    scene.add(segment);
    
    // Add neon grid to the segment
    const gridHelper = new THREE.GridHelper(
        endlessRunner.segmentWidth, 
        4, 
        0x00ffff, 
        0xff00ff
    );
    gridHelper.position.y = 0.02; // Slightly above ground to prevent z-fighting
    gridHelper.position.z = zPosition;
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    
    // Make grid lines glow
    if (gridHelper.material instanceof THREE.Material) {
        gridHelper.material.emissive = new THREE.Color(0xffffff);
        gridHelper.material.emissiveIntensity = 1.0;
    } else if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach(mat => {
            mat.emissive = new THREE.Color(0xffffff);
            mat.emissiveIntensity = 1.0;
        });
    }
    scene.add(gridHelper);
    
    return {
        segment: segment,
        grid: gridHelper,
        position: zPosition
    };
}

// Initialize the endless runner ground segments
function initEndlessRunner() {
    // Create initial segments
    for (let i = 0; i < endlessRunner.totalSegments; i++) {
        const zPos = -i * endlessRunner.segmentLength;
        const segment = createGroundSegment(zPos);
        endlessRunner.segments.push(segment);
    }
    
    // Position lanes for rhythm game
    rhythmGame.laneWidth = vehicleControls.laneWidth;
    
    // Update lane positions for rhythm game
    rhythmGame.lanePositions = [
        new THREE.Vector3(-rhythmGame.laneWidth, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(rhythmGame.laneWidth, 0, 0)
    ];
}

// Update endless runner ground movement
function updateEndlessRunner(deltaTime) {
    // Move all segments forward
    endlessRunner.segments.forEach(segment => {
        segment.position += endlessRunner.moveSpeed;
        segment.segment.position.z = segment.position;
        segment.grid.position.z = segment.position;
        
        // If segment is too far behind, move it to the front
        if (segment.position > endlessRunner.segmentLength) {
            // Calculate new position at the end of the track
            segment.position = -endlessRunner.segmentLength * (endlessRunner.totalSegments - 1);
            segment.segment.position.z = segment.position;
            segment.grid.position.z = segment.position;
        }
    });
    
    // Update total distance traversed (for scoring)
    endlessRunner.traversedDistance += endlessRunner.moveSpeed;
}

// Animation loop - this is the only animate function we should have
function animate(time) {
    requestAnimationFrame(animate);
    
    // Convert time to milliseconds for easier rhythm calculations
    const timeMs = time;
    
    // Calculate time delta for smooth animation
    const deltaTime = timeMs - previousTime;
    previousTime = timeMs;
    
    // Update vehicle movement
    updateVehicleMovement(deltaTime);
    
    // Update endless runner ground movement
    updateEndlessRunner(deltaTime);
    
    // Update rhythm game system
    updateRhythmGame(deltaTime, timeMs);
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate(0);

// Set up audio analyzer for music visualization
function setupAudioAnalyzer() {
    // Create analyzer node
    audioAnalyzer = audioListener.context.createAnalyser();
    audioAnalyzer.fftSize = 256;
    audioAnalyzer.smoothingTimeConstant = 0.8;
    
    // Connect music to analyzer
    backgroundMusic.setFilters([audioAnalyzer]);
    
    // Create array for analyzer data
    analyzerData = new Uint8Array(audioAnalyzer.frequencyBinCount);
    
    console.log("Audio analyzer setup complete");
    
    // Initialize rhythm game system once analyzer is set up
    initRhythmGameSystem();
}

// Initialize the rhythm game system
function initRhythmGameSystem() {
    // Clear any existing cubes
    rhythmGame.activeCubes.forEach(cube => {
        scene.remove(cube);
    });
    
    rhythmGame.activeCubes = [];
    rhythmGame.cubePool = [];
    
    // Create cube pool
    for (let i = 0; i < rhythmGame.poolSize; i++) {
        const cube = createRhythmCube();
        rhythmGame.cubePool.push(cube);
    }
    
    // Set up lane positions
    updateLanePositions();
    
    // Calculate beat interval from BPM
    rhythmGame.beatInterval = 60000 / rhythmGame.bpm;
    
    console.log(`Rhythm game initialized with BPM: ${rhythmGame.bpm}, beat interval: ${rhythmGame.beatInterval}ms`);
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
function getPooledCube() {
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
    const newCube = createRhythmCube();
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

// Process rhythm game beat detection and cube spawning
function updateRhythmGame(deltaTime, currentTime) {
    if (!rhythmGame.enabled || !musicPlaying || !audioAnalyzer) return;
    
    // Get frequency data for beat detection
    audioAnalyzer.getByteFrequencyData(analyzerData);
    
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
        spawnBeatCube(lane, beatTime);
        
        // Only occasionally spawn additional cubes (1 in 3 chance)
        if (Math.random() < 0.3) {
            const additionalLane = (lane + 1 + Math.floor(Math.random() * 2)) % rhythmGame.lanes; // Different lane
            const additionalBeatTime = beatTime + (rhythmGame.beatInterval * 0.5); // Slightly offset timing
            spawnBeatCube(additionalLane, additionalBeatTime);
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

// Spawn a beat cube at the given lane with neon colors
function spawnBeatCube(lane, beatTime) {
    const cube = getPooledCube();
    
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