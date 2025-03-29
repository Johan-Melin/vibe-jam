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

// Import utility modules
import { Clock } from './utils/utils.js';

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
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate();

// Log game initialization
console.log('Rhythm Road game initialized'); 