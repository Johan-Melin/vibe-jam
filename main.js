import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Add fog to the scene for atmosphere and depth
scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);

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

// Enhanced lighting setup
function setupLighting() {
    // Clear any existing lights from the scene
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Ambient light for base illumination (slightly blue for sky color)
    const ambientLight = new THREE.AmbientLight(0xccddff, 0.4);
    scene.add(ambientLight);
    
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffaa, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    
    // Enhance shadow quality
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.001;
    
    scene.add(directionalLight);
    
    // Add a hemisphere light for more realistic outdoor lighting
    const hemisphereLight = new THREE.HemisphereLight(0x0088ff, 0x44aa00, 0.6);
    scene.add(hemisphereLight);
    
    // Add a subtle point light near the player's starting position for emphasis
    const pointLight = new THREE.PointLight(0xffffee, 0.8, 20);
    pointLight.position.set(0, 2, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 512;
    pointLight.shadow.mapSize.height = 512;
    scene.add(pointLight);
    
    // Debug helper for directional light (commented out for production)
    // const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(dirLightHelper);
    
    return {
        ambientLight,
        directionalLight,
        hemisphereLight,
        pointLight
    };
}

// Enable shadows in renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Create enhanced ground
function createGroundPlane() {
    // Create grid texture procedurally
    const gridSize = 1000;
    const gridDivisions = 100;
    const gridTexture = new THREE.TextureLoader().load('');
    
    // Create ground with size of 200x200 for larger play area
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 20, 20);
    
    // Custom shader material for the ground
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x48763C, // Green for grass
        roughness: 0.8,
        metalness: 0.2,
    });
    
    // Create the ground mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid helper for better visual reference
    const gridHelper = new THREE.GridHelper(200, 50, 0x000000, 0x000000);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Add some simple terrain variations
    addTerrainVariations(ground);
    
    return ground;
}

// Add simple terrain variations
function addTerrainVariations(ground) {
    // Create some random bumps and hills
    const vertices = ground.geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        // Only modify y values (height)
        if (i % 3 === 1) {
            // Skip edges to keep a flat border
            const xPos = vertices[i - 1];
            const zPos = vertices[i + 1];
            const distFromCenter = Math.sqrt(xPos * xPos + zPos * zPos);
            
            if (distFromCenter < 90) { // Keep borders flat
                // Create gentle, random terrain bumps
                vertices[i] = Math.sin(xPos / 10) * Math.cos(zPos / 10) * 0.5;
            }
        }
    }
    
    // Update the geometry
    ground.geometry.attributes.position.needsUpdate = true;
    ground.geometry.computeVertexNormals();
}

// Function to create a simple vehicle model
function createVehicle() {
    // Create a group to hold all vehicle parts
    const vehicle = new THREE.Group();
    
    // Create the main body of the vehicle (truck)
    const bodyGeometry = new THREE.BoxGeometry(2.5, 1.0, 4.0);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xDD0000, // Red
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0; // Height from ground
    body.castShadow = true;
    body.receiveShadow = true;
    vehicle.add(body);
    
    // Create a cabin for the vehicle
    const cabinGeometry = new THREE.BoxGeometry(2.0, 0.8, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0xEEEEEE, // Light gray
        metalness: 0.3,
        roughness: 0.5
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = 1.9; // On top of body
    cabin.position.z = -0.8; // Toward the front of the vehicle
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    vehicle.add(cabin);
    
    // Add windows to the cabin
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88CCFF, // Light blue
        metalness: 0.9,
        roughness: 0.1
    });
    
    // Front window
    const frontWindowGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.1);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.y = 1.9;
    frontWindow.position.z = -1.5;
    vehicle.add(frontWindow);
    
    // Create four wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, // Dark gray
        metalness: 0.5,
        roughness: 0.7
    });
    
    // Position the wheels at the corners of the vehicle
    const wheelPositions = [
        { x: -1.2, y: 0.5, z: -1.3 }, // Front left
        { x: 1.2, y: 0.5, z: -1.3 },  // Front right
        { x: -1.2, y: 0.5, z: 1.3 },  // Rear left
        { x: 1.2, y: 0.5, z: 1.3 }    // Rear right
    ];
    
    const wheels = [];
    wheelPositions.forEach(position => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(position.x, position.y, position.z);
        wheel.rotation.z = Math.PI / 2; // Rotate to align with vehicle
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        wheels.push(wheel);
        vehicle.add(wheel);
    });
    
    // Add bull bar / front guard
    const bullBarGeometry = new THREE.BoxGeometry(2.6, 0.5, 0.2);
    const bullBarMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888, // Silver
        metalness: 0.8,
        roughness: 0.2
    });
    const bullBar = new THREE.Mesh(bullBarGeometry, bullBarMaterial);
    bullBar.position.y = 0.7;
    bullBar.position.z = -2.1;
    bullBar.castShadow = true;
    bullBar.receiveShadow = true;
    vehicle.add(bullBar);
    
    // Add the vehicle to the scene
    scene.add(vehicle);
    
    // Store relevant vehicle parts for animation and movement
    return {
        group: vehicle,
        body,
        wheels,
        cabin
    };
}

// Set up lighting
const lights = setupLighting();

// Create the ground
const ground = createGroundPlane();

// Create the vehicle
const vehicle = createVehicle();

// Add camera controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true; // Add smooth damping effect
orbitControls.dampingFactor = 0.05;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 50;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
orbitControls.screenSpacePanning = false; // Use orbit instead of panning when shifting

// Update camera states to focus on the vehicle
const cameraStates = {
    orbit: {
        position: new THREE.Vector3(0, 5, 10),
        target: new THREE.Vector3(0, 1, 0), // Focus on vehicle
        enabled: true
    },
    top: {
        position: new THREE.Vector3(0, 20, 0),
        target: new THREE.Vector3(0, 0, 0),
        enabled: false
    },
    follow: {
        position: new THREE.Vector3(0, 3, 5), // Behind vehicle
        target: new THREE.Vector3(0, 1, 0), // Focus on vehicle
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
    
    // Animate the vehicle wheels
    if (vehicle && vehicle.wheels) {
        vehicle.wheels.forEach(wheel => {
            wheel.rotation.x += 0.01; // Rotate wheels
        });
    }
    
    // Update orbit controls (if enabled)
    orbitControls.update();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate(); 