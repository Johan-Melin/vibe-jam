import * as THREE from 'three';

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

// Enhanced lighting setup
function setupLighting() {
    // Clear any existing lights from the scene
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Ambient light for base illumination (slightly blue for sky color)
    const ambientLight = new THREE.AmbientLight(0xccddff, 0.6);
    scene.add(ambientLight);
    
    // Add a hemisphere light for more realistic outdoor lighting
    const hemisphereLight = new THREE.HemisphereLight(0x0088ff, 0x44aa00, 0.8);
    scene.add(hemisphereLight);
    
    // Add a subtle point light near the player's starting position for emphasis
    const pointLight = new THREE.PointLight(0xffffee, 1.0, 50);
    pointLight.position.set(0, 15, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    scene.add(pointLight);
    
    // Add an additional point light that will follow the vehicle
    const vehicleLight = new THREE.PointLight(0xffffdd, 1.0, 30);
    vehicleLight.position.set(0, 5, 0);
    vehicleLight.castShadow = true;
    vehicleLight.shadow.mapSize.width = 1024;
    vehicleLight.shadow.mapSize.height = 1024;
    scene.add(vehicleLight);
    
    // Store the vehicle light so we can update its position
    scene.vehicleLight = vehicleLight;
    
    return {
        ambientLight,
        hemisphereLight,
        pointLight,
        vehicleLight
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
        roughness: 0.1,
        transparent: true,  // Make window transparent
        opacity: 0.7,       // Slightly transparent
        depthWrite: false   // Helps prevent z-fighting
    });
    
    // Front window - adjusted position and size to prevent z-fighting
    const frontWindowGeometry = new THREE.BoxGeometry(1.7, 0.55, 0.05); // Slightly smaller than cabin
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.y = 1.9;
    frontWindow.position.z = -1.55; // Moved slightly forward from cabin front
    vehicle.add(frontWindow);
    
    // Add side windows for better appearance and to reduce the perception of any remaining z-fighting
    const leftWindowGeometry = new THREE.BoxGeometry(0.05, 0.55, 1.3);
    const leftWindow = new THREE.Mesh(leftWindowGeometry, windowMaterial);
    leftWindow.position.set(-0.99, 1.9, -0.8);
    vehicle.add(leftWindow);
    
    const rightWindowGeometry = new THREE.BoxGeometry(0.05, 0.55, 1.3);
    const rightWindow = new THREE.Mesh(rightWindowGeometry, windowMaterial);
    rightWindow.position.set(0.99, 1.9, -0.8);
    vehicle.add(rightWindow);
    
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

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Track time for animation
let previousTime = 0;

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    // Calculate time delta for smooth animation
    const deltaTime = time - previousTime;
    previousTime = time;
    
    // Update vehicle movement
    updateVehicleMovement(deltaTime);
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate(0); 