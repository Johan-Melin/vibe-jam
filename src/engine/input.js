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
    laneChangeSpeed: 0.15, // How fast to change lanes (increased for faster response)
    // Track vehicle's forward direction vector
    direction: new THREE.Vector3(0, 0, -1),
    // Mobile touch state
    touch: {
        active: false,
        side: null // 'left' or 'right'
    }
};

// Debug controls state
const debugControls = {
    statsVisible: true,
    infoVisible: true
};

// Set up key controls for vehicle
function setupVehicleControls() {
    // Keyboard controls
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

    // Mobile touch controls
    setupTouchControls();
}

// Set up touch controls for mobile devices
function setupTouchControls() {
    // Create visual touch zones that handle their own events
    createTouchZones();
    
    // Add touchCancel event to the window to handle edge cases
    window.addEventListener('touchcancel', () => {
        // Reset all touch states on cancel
        vehicleControls.touch.active = false;
        vehicleControls.touch.side = null;
        vehicleControls.keys.left = false;
        vehicleControls.keys.right = false;
        
        // Reset the visual appearance of zones
        const leftZone = document.getElementById('touch-zone-left');
        const rightZone = document.getElementById('touch-zone-right');
        if (leftZone) leftZone.style.backgroundColor = 'rgba(255, 255, 255, 0)';
        if (rightZone) rightZone.style.backgroundColor = 'rgba(255, 255, 255, 0)';
    });
}

// Create visual indicators for the touch zones
function createTouchZones() {
    // Only create touch zones for mobile devices
    if (!isMobileDevice()) return;
    
    // Create left touch zone
    const leftZone = document.createElement('div');
    leftZone.id = 'touch-zone-left';
    leftZone.style.position = 'absolute';
    leftZone.style.top = '0';
    leftZone.style.left = '0';
    leftZone.style.width = '50%';
    leftZone.style.height = '100%';
    leftZone.style.backgroundColor = 'rgba(255, 255, 255, 0)';
    leftZone.style.zIndex = '999';
    leftZone.style.pointerEvents = 'auto'; // Allow touch events
    leftZone.style.cursor = 'pointer';
    
    // Create arrow indicator for left zone
    const leftArrow = document.createElement('div');
    leftArrow.style.position = 'absolute';
    leftArrow.style.top = '50%';
    leftArrow.style.left = '20%';
    leftArrow.style.transform = 'translateY(-50%)';
    leftArrow.style.color = 'white';
    leftArrow.style.fontSize = '64px';
    leftArrow.style.textShadow = '0 0 10px rgba(0,0,0,0.8)';
    leftArrow.innerHTML = '&#9664;'; // Left arrow triangle
    leftZone.appendChild(leftArrow);
    
    // Create right touch zone
    const rightZone = document.createElement('div');
    rightZone.id = 'touch-zone-right';
    rightZone.style.position = 'absolute';
    rightZone.style.top = '0';
    rightZone.style.right = '0';
    rightZone.style.width = '50%';
    rightZone.style.height = '100%';
    rightZone.style.backgroundColor = 'rgba(255, 255, 255, 0)';
    rightZone.style.zIndex = '999';
    rightZone.style.pointerEvents = 'auto'; // Allow touch events
    rightZone.style.cursor = 'pointer';
    
    // Create arrow indicator for right zone
    const rightArrow = document.createElement('div');
    rightArrow.style.position = 'absolute';
    rightArrow.style.top = '50%';
    rightArrow.style.right = '20%';
    rightArrow.style.transform = 'translateY(-50%)';
    rightArrow.style.color = 'white';
    rightArrow.style.fontSize = '64px';
    rightArrow.style.textShadow = '0 0 10px rgba(0,0,0,0.8)';
    rightArrow.innerHTML = '&#9654;'; // Right arrow triangle
    rightZone.appendChild(rightArrow);
    
    // Function to handle left movement
    const triggerLeftMove = (e) => {
        e.preventDefault();
        vehicleControls.touch.active = true;
        vehicleControls.touch.side = 'left';
        vehicleControls.keys.left = true;
        
        // Reset immediately to allow rapid tapping
        setTimeout(() => {
            if (vehicleControls.touch.side === 'left') {
                vehicleControls.keys.left = false;
            }
        }, 100);
    };
    
    // Function to handle right movement
    const triggerRightMove = (e) => {
        e.preventDefault();
        vehicleControls.touch.active = true;
        vehicleControls.touch.side = 'right';
        vehicleControls.keys.right = true;
        
        // Reset immediately to allow rapid tapping
        setTimeout(() => {
            if (vehicleControls.touch.side === 'right') {
                vehicleControls.keys.right = false;
            }
        }, 100);
    };
    
    // Function to reset left touch state
    const resetLeftTouch = (e) => {
        e.preventDefault();
        vehicleControls.touch.active = false;
        vehicleControls.touch.side = null;
        vehicleControls.keys.left = false;
    };
    
    // Function to reset right touch state
    const resetRightTouch = (e) => {
        e.preventDefault();
        vehicleControls.touch.active = false;
        vehicleControls.touch.side = null;
        vehicleControls.keys.right = false;
    };
    
    // Add touch event listeners for touchscreen
    leftZone.addEventListener('touchstart', triggerLeftMove);
    leftZone.addEventListener('touchend', resetLeftTouch);
    leftZone.addEventListener('touchcancel', resetLeftTouch);
    
    rightZone.addEventListener('touchstart', triggerRightMove);
    rightZone.addEventListener('touchend', resetRightTouch);
    rightZone.addEventListener('touchcancel', resetRightTouch);
    
    // Add click listeners for mouse/tap (for rapid tapping capability)
    leftZone.addEventListener('click', triggerLeftMove);
    rightZone.addEventListener('click', triggerRightMove);
    
    // Add to document
    document.body.appendChild(leftZone);
    document.body.appendChild(rightZone);
}

// Helper function to detect mobile devices
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
    
    // Check if we're close enough to the target lane to allow another lane change
    // Using a smaller threshold allows faster consecutive lane changes
    const isNearTargetLane = Math.abs(vehicle.group.position.x - targetX) < 0.2;
    
    // Handle lane changes with arrow keys or touch - only if we're close to the current target lane
    if (isNearTargetLane) {
        // Move left if possible
        if (controls.keys.left && controls.targetLane > 0) {
            controls.targetLane--;
            // Only reset key state for keyboard (not for touch)
            if (!controls.touch.active || controls.touch.side !== 'left') {
                controls.keys.left = false;
            }
        }
        // Move right if possible
        else if (controls.keys.right && controls.targetLane < 2) {
            controls.targetLane++;
            // Only reset key state for keyboard (not for touch)
            if (!controls.touch.active || controls.touch.side !== 'right') {
                controls.keys.right = false;
            }
        }
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