import * as THREE from 'three';
import { toggleThirdPersonCamera } from './camera.js';
import { toggleAudio } from '../audio/audioManager.js';

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

// Debug controls state
const debugControls = {
    statsVisible: true,
    infoVisible: true
};

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
                toggleThirdPersonCamera();
                break;
            case 'm': // Toggle music
            case 'M':
                toggleAudio();
                break;
            case 'f': // Toggle FPS stats
            case 'F':
                toggleStatsVisibility();
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

// Function to toggle stats visibility (implemented in debug.js, but controlled here)
function toggleStatsVisibility() {
    debugControls.statsVisible = !debugControls.statsVisible;
    
    // The actual implementation is in the debug.js file
    // Here we just toggle the state and let the DOM element's style be updated
    const statsPanel = document.querySelector('.stats');
    if (statsPanel) {
        statsPanel.style.display = debugControls.statsVisible ? 'block' : 'none';
    }
    
    return debugControls.statsVisible;
}

// Function to update vehicle position and rotation based on controls
function updateVehicleMovement(deltaTime, vehicle, scene) {
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
    
    // Update the vehicle position reference
    controls.position.copy(vehicle.group.position);
    
    return controls.position;
}

export { vehicleControls, debugControls, setupVehicleControls, updateVehicleMovement, toggleStatsVisibility }; 