import * as THREE from 'three';

// Initialize the camera
function initCamera() {
    const camera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    return camera;
}

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

// Update third-person camera position and rotation to follow vehicle
function updateThirdPersonCamera(camera, vehiclePosition) {
    if (!thirdPersonCamera.isActive) return;
    
    // Set camera to fixed position behind and slightly above the vehicle
    const idealX = vehiclePosition.x;
    const idealZ = vehiclePosition.z + 10; // Fixed distance behind
    const idealHeight = vehiclePosition.y + 5; // Fixed height above
    
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
        vehiclePosition.x,
        vehiclePosition.y + 1,
        vehiclePosition.z - 5 // Look ahead of the vehicle
    );
    
    // Always maintain world up vector
    camera.up.set(0, 1, 0);
    
    // Smoothly look at the target
    camera.lookAt(lookAtPos);
}

// Reset camera to default position
function resetCamera(camera) {
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
}

// Toggle third-person camera mode
function toggleThirdPersonCamera() {
    thirdPersonCamera.isActive = !thirdPersonCamera.isActive;
    return thirdPersonCamera.isActive;
}

export { 
    initCamera, 
    updateThirdPersonCamera, 
    resetCamera, 
    toggleThirdPersonCamera, 
    thirdPersonCamera 
}; 