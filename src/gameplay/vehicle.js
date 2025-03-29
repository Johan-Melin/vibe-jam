import * as THREE from 'three';

// Function to create a neon vehicle model
function createVehicle(scene) {
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
    
    // Taillights (magenta) - At the BACK of the vehicle
    const taillightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff0088,
        emissiveIntensity: 1.0,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    leftTaillight.position.set(-0.8, 0.9, 2.0);
    leftTaillight.scale.set(1, 1, 0.5);
    vehicle.add(leftTaillight);
    
    const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    rightTaillight.position.set(0.8, 0.9, 2.0);
    rightTaillight.scale.set(1, 1, 0.5);
    vehicle.add(rightTaillight);
    
    // Add the vehicle to the scene
    scene.add(vehicle);
    
    // Store relevant vehicle parts for animation and movement
    return {
        group: vehicle,
        body,
        wheels,
        cabin,
        taillights: [leftTaillight, rightTaillight]
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
    // The cone geometry should not have an offset in local space
    // The position will be set when adding to the vehicle
    
    return cone;
}

export { createVehicle, createLightCone }; 