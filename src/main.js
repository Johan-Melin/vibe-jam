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
import { initRhythmGameSystem, updateRhythmGame, rhythmGame, getScoreInfo } from './gameplay/rhythmGame.js';

// Import effects modules
import { initRoadsideObjects, updateRoadsideObjects } from './effects/roadside.js';

// Import UI modules
import { initScoreDisplay } from './ui/scoreDisplay.js';

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

// Initialize UI
const scoreDisplay = initScoreDisplay();
scoreDisplay.hide(); // Hide until rhythm game starts

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
    
    // Show score display when rhythm game is initialized
    scoreDisplay.show();
}

// Add instructions for cube collection
function showGameInstructions() {
    const instructionsElement = document.createElement('div');
    instructionsElement.id = 'game-instructions';
    instructionsElement.style.position = 'absolute';
    instructionsElement.style.bottom = '20px';
    instructionsElement.style.left = '50%';
    instructionsElement.style.transform = 'translateX(-50%)';
    instructionsElement.style.background = 'rgba(0, 0, 0, 0.7)';
    instructionsElement.style.color = '#00ffff';
    instructionsElement.style.padding = '15px 30px';
    instructionsElement.style.borderRadius = '5px';
    instructionsElement.style.fontFamily = "'Orbitron', sans-serif";
    instructionsElement.style.fontSize = '18px';
    instructionsElement.style.textAlign = 'center';
    instructionsElement.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
    instructionsElement.style.zIndex = '1000';
    instructionsElement.style.transition = 'opacity 2s';
    
    instructionsElement.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px; color: #ff00ff; text-shadow: 0 0 10px #ff00ff;">COLLECT THE RHYTHM CUBES</div>
        <div>Use <span style="color: #ff00ff">←</span> and <span style="color: #ff00ff">→</span> arrow keys to change lanes</div>
        <div>Drive through cubes to collect them and increase your score!</div>
    `;
    
    document.body.appendChild(instructionsElement);
    
    // Fade out instructions after 5 seconds
    setTimeout(() => {
        instructionsElement.style.opacity = '0';
        setTimeout(() => {
            if (instructionsElement.parentNode) {
                instructionsElement.parentNode.removeChild(instructionsElement);
            }
        }, 2000);
    }, 5000);
}

// Show game instructions once
setTimeout(showGameInstructions, 2000);

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
    
    // Animate vehicle thrusters
    if (vehicle.thrusters) {
        vehicle.thrusters.forEach(thruster => {
            // Pulse the thrusters based on speed and time
            const pulseFactor = (Math.sin(elapsedTime * 0.01) * 0.3 + 0.7) * 
                               (vehicleControls.speed / vehicleControls.maxSpeed + 0.3);
            
            thruster.material.emissiveIntensity = pulseFactor * 1.5;
            
            // Add scale effect to thrusters when accelerating
            const scaleEffect = 1 + (vehicleControls.speed / vehicleControls.maxSpeed) * 0.2;
            thruster.scale.set(1, scaleEffect, 1);
        });
    }
    
    // Update endless runner track
    const distance = updateEndlessRunner(deltaTime);
    
    // Initialize rhythm game when music is playing
    if (musicPlaying && !rhythmGameSystem) {
        initRhythmGame();
    }
    
    // First update rhythm game to detect beats and check for cube collection
    if (rhythmGameSystem) {
        const scoreInfo = updateRhythmGame(deltaTime, elapsedTime, musicPlaying, scene, vehicle);
        
        // Update score display with latest info
        if (scoreInfo) {
            scoreDisplay.update(scoreInfo);
            scoreDisplay.animateScore(elapsedTime);
        }
    }
    
    // Then update roadside objects which will use the latest beat detection
    updateRoadsideObjects(scene, deltaTime, endlessRunner, musicPlaying);
    
    // Update engine sound based on vehicle speed
    updateEngineSound(vehicleControls.speed, vehicleControls.maxSpeed);
    
    // Make vehicle glow more intensely on beats if rhythm game is active
    if (rhythmGameSystem && rhythmGame.lastBeatTime > 0) {
        const timeSinceBeat = elapsedTime - rhythmGame.lastBeatTime;
        
        // Briefly increase body glow on beat with smooth falloff
        if (timeSinceBeat < 150) {
            // Calculate falloff (1.0 to 0.0)
            const falloff = 1.0 - (timeSinceBeat / 150);
            
            // Apply to vehicle components
            if (vehicle.body) {
                vehicle.body.material.emissiveIntensity = 0.8 + (falloff * 0.7);
            }
            
            // Flash taillights with rhythm
            if (vehicle.taillights) {
                vehicle.taillights.forEach(light => {
                    light.material.emissiveIntensity = 1.0 + (falloff * 1.0);
                });
            }
            
            // Pulse headlight cones
            if (vehicle.thrusters) {
                vehicle.thrusters.forEach(thruster => {
                    thruster.material.emissiveIntensity = 1.0 + (falloff * 1.5);
                    // Scale effect
                    const scale = 1.0 + (falloff * 0.3);
                    thruster.scale.set(scale, scale, 1);
                });
            }
        } else {
            // Return to normal glow
            if (vehicle.body) {
                vehicle.body.material.emissiveIntensity = 0.8;
            }
            
            // Normal taillight intensity
            if (vehicle.taillights) {
                vehicle.taillights.forEach(light => {
                    light.material.emissiveIntensity = 1.0;
                });
            }
        }
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