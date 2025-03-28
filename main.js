import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Enable shadows in renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add a ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x555555,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
ground.receiveShadow = true;
scene.add(ground);

// Add a test cube with proper material
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00,
    metalness: 0.3,
    roughness: 0.4
});
const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.receiveShadow = true;
cube.position.y = 1; // Raise the cube so it sits on the ground
scene.add(cube);

// Add camera controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true; // Add smooth damping effect
orbitControls.dampingFactor = 0.05;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 50;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
orbitControls.screenSpacePanning = false; // Use orbit instead of panning when shifting

// Create a camera state manager for different views
const cameraStates = {
    orbit: {
        position: new THREE.Vector3(0, 5, 10),
        target: new THREE.Vector3(0, 0, 0),
        enabled: true
    },
    top: {
        position: new THREE.Vector3(0, 20, 0),
        target: new THREE.Vector3(0, 0, 0),
        enabled: false
    },
    follow: {
        position: new THREE.Vector3(0, 3, -5),
        target: new THREE.Vector3(0, 1, 0),
        enabled: false
    }
};

let currentCameraState = 'orbit';

// Function to switch camera state
function switchCameraState(stateName) {
    if (!cameraStates[stateName]) return;
    
    const state = cameraStates[stateName];
    
    // Transition camera position and target
    const targetPosition = state.position.clone();
    const targetLookAt = state.target.clone();
    
    // Set camera properties
    camera.position.copy(targetPosition);
    orbitControls.target.copy(targetLookAt);
    orbitControls.enabled = state.enabled;
    
    // Update orbit controls
    orbitControls.update();
    
    currentCameraState = stateName;
}

// Add keyboard controls for camera states
window.addEventListener('keydown', (event) => {
    switch(event.key) {
        case '1': // Orbit view
            switchCameraState('orbit');
            break;
        case '2': // Top-down view
            switchCameraState('top');
            break;
        case '3': // Follow view
            switchCameraState('follow');
            break;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the cube to show animation is working
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    // Update orbit controls (if enabled)
    orbitControls.update();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate(); 