import * as THREE from 'three';

// Import engine modules
import { initRenderer, setupResizeHandler } from './engine/renderer.js';
import { createScene, setupLighting, addNeonAxisLines } from './engine/scene.js';
import { initCamera, updateThirdPersonCamera, thirdPersonCamera } from './engine/camera.js';
import { vehicleControls, setupVehicleControls, updateVehicleMovement } from './engine/input.js';
import { initEndlessRunner, updateEndlessRunner, endlessRunner } from './engine/track.js';

// Import audio modules
import { setupAudio, updateEngineSound, musicPlaying } from './audio/audioManager.js';

// Import gameplay modules
import { createVehicle } from './gameplay/vehicle.js';
import { initRhythmGameSystem, updateRhythmGame, rhythmGame } from './gameplay/rhythmGame.js';

// Import effects modules
import { initRoadsideObjects, updateRoadsideObjects } from './effects/roadside.js';

// Import utility modules
import { Clock } from './utils/utils.js';
import { createStatsPanel, createSceneInfoPanel } from './utils/debug.js';

// Create the main clock for timing
const clock = new Clock();

// Initialize the scene
const scene = createScene();

// Initialize the camera
const camera = initCamera();

// Initialize the renderer
const renderer = initRenderer();

// Set up lights
const lights = setupLighting(scene);

// Set up audio
const audio = setupAudio(camera);

// Initialize the endless runner track
const track = initEndlessRunner(scene, vehicleControls.laneWidth);

// Initialize roadside objects
const roadsideSystem = initRoadsideObjects(scene);

// Add lane dividers
const laneLines = addNeonAxisLines(scene, vehicleControls.laneWidth);

// Create the vehicle
const vehicle = createVehicle(scene);

// Initialize the camera's last vehicle position
thirdPersonCamera.lastVehiclePos.copy(vehicle.group.position);

// Set up vehicle controls
setupVehicleControls();

// Set up window resize handler
setupResizeHandler(renderer, camera);

// Initialize debug info panels
const stats = createStatsPanel();
const sceneInfo = createSceneInfoPanel(renderer, scene, camera);

// Initialize rhythm game system
let rhythmGameSystem = null;

// Function to initialize the rhythm game once audio analyzer is ready
function initRhythmGame() {
    if (rhythmGameSystem) return;
    
    rhythmGameSystem = initRhythmGameSystem(scene, vehicleControls.laneWidth);
    console.log('Rhythm game system initialized');
}

// Animation loop
function animate() {
    // Begin FPS measurement
    stats.begin();
    
    requestAnimationFrame(animate);
    
    // Calculate time delta and elapsed time
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTimeMs();
    
    // Update vehicle movement
    const vehiclePosition = updateVehicleMovement(deltaTime, vehicle, scene);
    
    // Update third-person camera to follow vehicle
    updateThirdPersonCamera(camera, vehiclePosition);
    
    // Update endless runner track
    const distance = updateEndlessRunner(deltaTime);
    
    // Update roadside objects
    updateRoadsideObjects(scene, deltaTime, endlessRunner, musicPlaying);
    
    // Update engine sound based on vehicle speed
    updateEngineSound(vehicleControls.speed, vehicleControls.maxSpeed);
    
    // Initialize rhythm game when music is playing
    if (musicPlaying && !rhythmGameSystem) {
        initRhythmGame();
    }
    
    // Update rhythm game
    if (rhythmGameSystem) {
        updateRhythmGame(deltaTime, elapsedTime, musicPlaying, scene);
    }
    
    // Update debug info panel
    sceneInfo.update();
    
    // Render the scene
    renderer.render(scene, camera);
    
    // End FPS measurement
    stats.end();
}

// Start the animation loop
animate();

// Log game initialization
console.log('Rhythm Road game initialized'); 