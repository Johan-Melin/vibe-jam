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
    spawnDistance: 100, // Increased from 50 to 100 for more travel time
    despawnDistance: -15, // Negative value means behind the vehicle
    cubeSpeed: 0.02, // Reduced from 0.2 to 0.02 (10x slower)
    nextBeatTime: 0,
    beatInterval: 500, // in milliseconds, will be adjusted based on BPM
    cubePool: [],
    activeCubes: [],
    poolSize: 30,
    lastBeatTime: 0,
    beatDetectionThreshold: 0.6,
    beatDetectionFrequencyRange: [2, 8], // Indices in the frequency data to check for beats
    bpm: 130,
    beatsAhead: 16, // Increased from 8 to 16 for smoother movement
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
    // Create ground with size of 200x200 for larger play area
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    
    // Custom shader material for the ground - dark with neon grid
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000, // Black base
        roughness: 0.7,
        metalness: 0.5,
        emissive: 0x000011, // Very slight blue emissive glow
    });
    
    // Create the ground mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
    ground.receiveShadow = true;
    scene.add(ground);

    // Add neon grid helper for cyberpunk style
    const gridHelper = new THREE.GridHelper(200, 40, 0x00ffff, 0xff00ff);
    gridHelper.position.y = 0.02; // Slightly above ground to prevent z-fighting
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
    
    // Add second grid for cross-hatch effect
    const secondGrid = new THREE.GridHelper(200, 40, 0xff00aa, 0x00ffaa);
    secondGrid.position.y = 0.01;
    secondGrid.rotation.y = Math.PI / 4; // Rotate 45 degrees
    secondGrid.material.opacity = 0.3;
    secondGrid.material.transparent = true;
    scene.add(secondGrid);
    
    // Add some simple terrain variations
    addTerrainVariations(ground);
    
    // Add neon lines along the x and z axes for additional cyberpunk effect
    addNeonAxisLines();
    
    return ground;
}

// Function to add subtle terrain variations to the ground
function addTerrainVariations(ground) {
    // For a flat neon grid aesthetic, we'll keep terrain variations very minimal
    // Just add a few subtle bumps for visual interest, but keep it mostly flat
    
    if (!ground.geometry.attributes || !ground.geometry.attributes.position) {
        console.warn("Cannot add terrain variations - ground geometry is not compatible");
        return;
    }
    
    // Get position attribute to modify vertices
    const positions = ground.geometry.attributes.position.array;
    
    // Add subtle random variations
    for (let i = 0; i < positions.length; i += 3) {
        // Only modify y-values (which is height in our rotated plane)
        // Skip edge vertices to keep the border flat
        const x = positions[i];
        const z = positions[i + 2];
        
        // Calculate distance from center
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        
        // Only modify interior vertices to avoid edge issues
        if (distanceFromCenter < 80) {
            // Create very subtle height variations
            // Use noise pattern that looks cyberpunk/grid-like
            const noiseValue = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.1;
            
            // Apply the height variation
            positions[i + 1] = noiseValue;
        }
    }
    
    // Update the geometry
    ground.geometry.attributes.position.needsUpdate = true;
    ground.geometry.computeVertexNormals();
}

// Add neon lines along the axes
function addNeonAxisLines() {
    // X axis - magenta
    const xGeometry = new THREE.BufferGeometry();
    const xPoints = [
        new THREE.Vector3(-100, 0.1, 0),
        new THREE.Vector3(100, 0.1, 0)
    ];
    xGeometry.setFromPoints(xPoints);
    const xMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff,
        linewidth: 3,
        emissive: 0xff00ff,
        emissiveIntensity: 1.0
    });
    const xLine = new THREE.Line(xGeometry, xMaterial);
    scene.add(xLine);
    
    // Z axis - cyan
    const zGeometry = new THREE.BufferGeometry();
    const zPoints = [
        new THREE.Vector3(0, 0.1, -100),
        new THREE.Vector3(0, 0.1, 100)
    ];
    zGeometry.setFromPoints(zPoints);
    const zMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        linewidth: 3,
        emissive: 0x00ffff,
        emissiveIntensity: 1.0
    });
    const zLine = new THREE.Line(zGeometry, zMaterial);
    scene.add(zLine);
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
    
    // Add neon headlights and taillights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88ccff, 
        emissiveIntensity: 1.0,
        metalness: 0.9,
        roughness: 0.1
    });
    
    // Headlights (cyan)
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-0.8, 0.9, -2.0);
    leftHeadlight.scale.set(1, 1, 0.5); // Flatten slightly
    vehicle.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(0.8, 0.9, -2.0);
    rightHeadlight.scale.set(1, 1, 0.5);
    vehicle.add(rightHeadlight);
    
    // Taillights (magenta)
    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff0088,
        emissiveIntensity: 1.0,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
    leftTaillight.position.set(-0.8, 0.9, 2.0);
    leftTaillight.scale.set(1, 1, 0.5);
    vehicle.add(leftTaillight);
    
    const rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
    rightTaillight.position.set(0.8, 0.9, 2.0);
    rightTaillight.scale.set(1, 1, 0.5);
    vehicle.add(rightTaillight);
    
    // Add the vehicle to the scene
    scene.add(vehicle);
    
    // Create headlight cone effects
    const leftHeadlightCone = createLightCone(0x00ffff);
    leftHeadlightCone.position.set(-0.8, 0.9, -2.0);
    leftHeadlightCone.rotation.x = Math.PI / 2;
    vehicle.add(leftHeadlightCone);
    
    const rightHeadlightCone = createLightCone(0x00ffff);
    rightHeadlightCone.position.set(0.8, 0.9, -2.0);
    rightHeadlightCone.rotation.x = Math.PI / 2;
    vehicle.add(rightHeadlightCone);
    
    // Store relevant vehicle parts for animation and movement
    return {
        group: vehicle,
        body,
        wheels,
        cabin,
        headlights: [leftHeadlight, rightHeadlight],
        taillights: [leftTaillight, rightTaillight],
        headlightCones: [leftHeadlightCone, rightHeadlightCone]
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
    cone.position.z = -2.5; // Position in front of vehicle
    
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

// Spawn a beat cube at the given lane with neon colors
function spawnBeatCube(lane, beatTime) {
    const cube = getPooledCube();
    
    // Get lane position
    const lanePos = rhythmGame.lanePositions[lane];
    
    // Calculate spawn position (in front of vehicle)
    const vehicleRotation = vehicleControls.rotation;
    const forwardVector = new THREE.Vector3(
        Math.sin(vehicleRotation),
        0,
        Math.cos(vehicleRotation)
    );
    
    const spawnPos = new THREE.Vector3().copy(lanePos).add(
        forwardVector.clone().multiplyScalar(rhythmGame.spawnDistance)
    );
    
    // Position the cube
    cube.position.copy(spawnPos);
    cube.position.y = 1.5; // Slightly above the ground
    
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

// Vehicle movement controls and state
const vehicleControls = {
    speed: 0,
    maxSpeed: 0.5,
    acceleration: 0.01,
    deceleration: 0.005,
    reverseMaxSpeed: -0.2,
    turnSpeed: 0.03,
    maxTurnSpeed: 0.05,
    wheelRotationSpeed: 0.2,
    keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        brake: false
    },
    position: new THREE.Vector3(0, 0, 0),
    rotation: 0,
    // Track vehicle's forward direction vector
    direction: new THREE.Vector3(0, 0, -1)
};

// Update third-person camera position and rotation to follow vehicle
function updateThirdPersonCamera() {
    if (!thirdPersonCamera.isActive) return;
    
    const vehiclePos = vehicle.group.position;
    const vehicleRotation = vehicleControls.rotation;
    
    // Calculate ideal position behind vehicle (Carmageddon 2 style)
    // Always position camera directly behind the vehicle based on vehicle's rotation
    const idealDistance = thirdPersonCamera.distance + (Math.abs(vehicleControls.speed) * 2); 
    
    // Calculate the camera position directly behind the vehicle based on its rotation
    // Using negative sin/cos to position camera behind the vehicle
    const idealX = vehiclePos.x - Math.sin(vehicleRotation) * idealDistance;
    const idealZ = vehiclePos.z - Math.cos(vehicleRotation) * idealDistance;
    
    // Set target position with height based on speed (higher when faster)
    const heightBoost = Math.abs(vehicleControls.speed) * 3; 
    const idealHeight = vehiclePos.y + thirdPersonCamera.height + heightBoost;
    
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
    
    // Calculate look-at point - slightly ahead of vehicle based on its rotation
    const lookAheadDistance = vehicleControls.speed * 4; // Look ahead more at higher speeds
    const lookAtPos = new THREE.Vector3(
        vehiclePos.x + Math.sin(vehicleRotation) * lookAheadDistance,
        vehiclePos.y + thirdPersonCamera.lookAtHeight,
        vehiclePos.z + Math.cos(vehicleRotation) * lookAheadDistance
    );
    
    // Always maintain world up vector
    camera.up.set(0, 1, 0);
    
    // Smoothly look at the target
    camera.lookAt(lookAtPos);
    
    // Apply a subtle bank effect during turns but limit it to prevent disorientation
    if (vehicleControls.keys.left && Math.abs(vehicleControls.speed) > 0.05) {
        // Banking into left turns (limited tilt)
        const bankAmount = Math.min(0.05, Math.abs(vehicleControls.speed) * 0.1);
        camera.rotateZ(bankAmount);
    } else if (vehicleControls.keys.right && Math.abs(vehicleControls.speed) > 0.05) {
        // Banking into right turns (limited tilt)
        const bankAmount = Math.min(0.05, Math.abs(vehicleControls.speed) * 0.1);
        camera.rotateZ(-bankAmount);
    }
}

// Function to update vehicle position and rotation based on controls
function updateVehicleMovement(deltaTime) {
    const controls = vehicleControls;
    
    // Apply acceleration/deceleration based on key inputs
    if (controls.keys.forward) {
        controls.speed += controls.acceleration;
        if (controls.speed > controls.maxSpeed) {
            controls.speed = controls.maxSpeed;
        }
    } else if (controls.keys.backward) {
        controls.speed -= controls.acceleration;
        if (controls.speed < controls.reverseMaxSpeed) {
            controls.speed = controls.reverseMaxSpeed;
        }
    } else {
        // Apply natural deceleration when no keys pressed
        if (Math.abs(controls.speed) < controls.deceleration) {
            controls.speed = 0;
        } else if (controls.speed > 0) {
            controls.speed -= controls.deceleration;
        } else if (controls.speed < 0) {
            controls.speed += controls.deceleration;
        }
    }
    
    // Apply braking when space is pressed
    if (controls.keys.brake) {
        if (Math.abs(controls.speed) < controls.deceleration * 3) {
            controls.speed = 0;
        } else if (controls.speed > 0) {
            controls.speed -= controls.deceleration * 3;
        } else if (controls.speed < 0) {
            controls.speed += controls.deceleration * 3;
        }
    }
    
    // Apply turning based on key inputs (only when moving)
    if (Math.abs(controls.speed) > 0.01) {
        const turnAmount = controls.turnSpeed * (controls.speed > 0 ? 1 : -1);
        
        if (controls.keys.left) {
            controls.rotation += turnAmount;
        }
        if (controls.keys.right) {
            controls.rotation -= turnAmount;
        }
    }
    
    // Calculate new position based on speed and rotation
    const velocity = new THREE.Vector3(
        Math.sin(controls.rotation) * controls.speed,
        0,
        Math.cos(controls.rotation) * controls.speed
    );
    
    // Update vehicle position
    vehicle.group.position.add(velocity);
    
    // Update vehicle light to follow the vehicle
    if (scene.vehicleLight) {
        scene.vehicleLight.position.set(
            vehicle.group.position.x,
            vehicle.group.position.y + 5, // Height above vehicle
            vehicle.group.position.z
        );
    }
    
    // Update vehicle rotation
    vehicle.group.rotation.y = controls.rotation;
    
    // Update the direction vector
    controls.direction.set(
        Math.sin(controls.rotation),
        0,
        Math.cos(controls.rotation)
    );
    
    // Rotate wheels based on speed
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
            case 'ArrowUp':
                vehicleControls.keys.forward = true;
                break;
            case 'ArrowDown':
                vehicleControls.keys.backward = true;
                break;
            case 'ArrowLeft':
                vehicleControls.keys.left = true;
                break;
            case 'ArrowRight':
                vehicleControls.keys.right = true;
                break;
            case ' ': // Space bar for brakes
                vehicleControls.keys.brake = true;
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
            case 'ArrowUp':
                vehicleControls.keys.forward = false;
                break;
            case 'ArrowDown':
                vehicleControls.keys.backward = false;
                break;
            case 'ArrowLeft':
                vehicleControls.keys.left = false;
                break;
            case 'ArrowRight':
                vehicleControls.keys.right = false;
                break;
            case ' ': // Space bar for brakes
                vehicleControls.keys.brake = false;
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

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    // Convert time to milliseconds for easier rhythm calculations
    const timeMs = time;
    
    // Calculate time delta for smooth animation
    const deltaTime = timeMs - previousTime;
    previousTime = timeMs;
    
    // Update vehicle movement
    updateVehicleMovement(deltaTime);
    
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

// Update lane positions based on vehicle position and rotation
function updateLanePositions() {
    const vehiclePos = vehicle.group.position;
    const vehicleRotation = vehicleControls.rotation;
    
    // Calculate lane vectors based on vehicle orientation
    const forwardVector = new THREE.Vector3(
        Math.sin(vehicleRotation),
        0,
        Math.cos(vehicleRotation)
    );
    
    const rightVector = new THREE.Vector3(
        Math.sin(vehicleRotation + Math.PI/2),
        0,
        Math.cos(vehicleRotation + Math.PI/2)
    );
    
    // Create 3 lanes, one directly in front and one to each side
    rhythmGame.lanePositions = [
        new THREE.Vector3().copy(vehiclePos).add(rightVector.clone().multiplyScalar(-rhythmGame.laneWidth)),
        new THREE.Vector3().copy(vehiclePos),
        new THREE.Vector3().copy(vehiclePos).add(rightVector.clone().multiplyScalar(rhythmGame.laneWidth))
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
    
    // Update lane positions based on vehicle movement
    updateLanePositions();
    
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
    const minBeatInterval = rhythmGame.beatInterval * 0.5; // Prevent beats too close together
    
    if (bassEnergy > rhythmGame.beatDetectionThreshold && timeSinceLastBeat > minBeatInterval) {
        rhythmGame.lastBeatTime = currentTime;
        
        // Schedule cubes ahead of time based on beatsAhead value
        for (let i = 1; i <= rhythmGame.beatsAhead; i++) {
            const beatTime = currentTime + (rhythmGame.beatInterval * i * 2); // Double time for slower approach
            const lane = Math.floor(Math.random() * rhythmGame.lanes);
            spawnBeatCube(lane, beatTime);
        }
    }
    
    // Update existing cubes
    for (let i = rhythmGame.activeCubes.length - 1; i >= 0; i--) {
        const cube = rhythmGame.activeCubes[i];
        
        // Get lane position
        const laneIndex = cube.userData.lane;
        const lanePos = rhythmGame.lanePositions[laneIndex];
        
        // Calculate how far along its journey the cube is
        const vehiclePos = vehicle.group.position;
        const vehicleRotation = vehicleControls.rotation;
        const forwardVector = new THREE.Vector3(
            Math.sin(vehicleRotation),
            0,
            Math.cos(vehicleRotation)
        );
        
        // Calculate target position (moving toward vehicle)
        const timeToBeat = cube.userData.beatTime - currentTime;
        const distanceFromVehicle = (timeToBeat / (rhythmGame.beatInterval * 2)) * rhythmGame.spawnDistance;
        
        const targetPos = new THREE.Vector3().copy(lanePos).add(
            forwardVector.clone().multiplyScalar(distanceFromVehicle)
        );
        
        // Move cube toward target position (slower interpolation)
        cube.position.x += (targetPos.x - cube.position.x) * 0.02;
        cube.position.z += (targetPos.z - cube.position.z) * 0.02;
        
        // Pulse effect as cube approaches vehicle
        const beatProgress = 1 - (timeToBeat / (rhythmGame.beatInterval * 2));
        
        // More pronounced pulse as the cube gets closer
        if (beatProgress > 0) {
            const pulseIntensity = Math.max(0.5, Math.min(1.5, 0.5 + Math.sin(beatProgress * Math.PI * 2) * 0.5));
            cube.scale.set(
                cube.userData.initialScale * pulseIntensity,
                cube.userData.initialScale * pulseIntensity,
                cube.userData.initialScale * pulseIntensity
            );
            
            // Increase glow as it gets closer
            cube.material.emissiveIntensity = 0.5 + beatProgress * 0.8;
        }
        
        // Check if cube has passed the vehicle (now using actual position comparison, not time-based)
        // Calculate vector from vehicle to cube
        const vehicleToCube = new THREE.Vector3().subVectors(cube.position, vehiclePos);
        
        // Project this vector onto the vehicle's forward direction to see if it's behind
        const dotProduct = vehicleToCube.dot(forwardVector);
        
        // If the dot product is negative, the cube is behind the vehicle
        if (dotProduct < rhythmGame.despawnDistance) {
            returnCubeToPool(cube);
        }
    }
}

// Check if player hit a cube in the lane
function checkLaneHit(lane) {
    const hitThreshold = 0.6; // Increased from 0.3 to 0.6 to make hitting easier with slower cubes
    const currentTime = previousTime;
    let hitCube = null;
    let closestBeatTime = Infinity;
    
    // Find the closest cube in the lane that's approaching the hit zone
    for (const cube of rhythmGame.activeCubes) {
        if (cube.userData.lane === lane) {
            const beatTimeDiff = Math.abs(cube.userData.beatTime - currentTime);
            
            if (beatTimeDiff < hitThreshold * 1000 && beatTimeDiff < closestBeatTime) {
                hitCube = cube;
                closestBeatTime = beatTimeDiff;
            }
        }
    }
    
    if (hitCube) {
        // Flash the cube when hit
        hitCube.material.emissiveIntensity = 2;
        
        // Add a brief scale effect
        hitCube.scale.set(1.5, 1.5, 1.5);
        
        // Show hit type based on timing
        const accuracy = closestBeatTime / (hitThreshold * 1000);
        let hitType = "PERFECT";
        
        if (accuracy < 0.3) {
            hitType = "PERFECT";
        } else if (accuracy < 0.6) {
            hitType = "GREAT";
        } else {
            hitType = "GOOD";
        }
        
        console.log(`Hit ${hitType} on lane ${lane} with accuracy ${Math.round((1-accuracy) * 100)}%`);
        
        // Return cube to pool after a slight delay to show hit effect
        setTimeout(() => {
            returnCubeToPool(hitCube);
        }, 100);
    }
}

// Add key controls for rhythm game
function setupRhythmGameControls() {
    window.addEventListener('keydown', (event) => {
        if (!rhythmGame.enabled || !musicPlaying) return;
        
        let laneHit = -1;
        
        switch(event.key) {
            case 'a':
            case 'A':
                laneHit = 0; // Left lane
                break;
            case 's':
            case 'S':
                laneHit = 1; // Center lane
                break;
            case 'd':
            case 'D':
                laneHit = 2; // Right lane
                break;
        }
        
        if (laneHit >= 0) {
            checkLaneHit(laneHit);
        }
    });
}

// Initialize rhythm game controls
setupRhythmGameControls(); 