import * as THREE from 'three';

// Initialize the scene
function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // Dark blue-black background for neon contrast
    
    // Add fog to the scene for atmosphere and depth
    scene.fog = new THREE.FogExp2(0x000022, 0.008); // Darker, denser fog for neon glow effect
    
    return scene;
}

// Enhanced lighting setup for neon aesthetics
function setupLighting(scene) {
    // Clear any existing lights from the scene
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Ambient light (very low for contrast)
    const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
    scene.add(ambientLight);
    
    // Add a dim bluish hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x0033ff, 0xff00ff, 0.3);
    scene.add(hemisphereLight);
    
    // Add central point light with neon purple color
    const pointLight = new THREE.PointLight(0xff00ff, 1.0, 50);
    pointLight.position.set(0, 15, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    scene.add(pointLight);
    
    // Add a cyan light that follows the vehicle
    const vehicleLight = new THREE.PointLight(0x00ffff, 1.5, 30);
    vehicleLight.position.set(0, 5, 0);
    vehicleLight.castShadow = true;
    vehicleLight.shadow.mapSize.width = 1024;
    vehicleLight.shadow.mapSize.height = 1024;
    scene.add(vehicleLight);
    
    // Store the vehicle light so we can update its position
    scene.vehicleLight = vehicleLight;
    
    // Add neon floor lighting
    const floorLight1 = new THREE.PointLight(0xff00aa, 1.0, 20);
    floorLight1.position.set(20, 0.5, 20);
    scene.add(floorLight1);
    
    const floorLight2 = new THREE.PointLight(0x00ffaa, 1.0, 20);
    floorLight2.position.set(-20, 0.5, -20);
    scene.add(floorLight2);
    
    const floorLight3 = new THREE.PointLight(0x0088ff, 1.0, 20);
    floorLight3.position.set(-20, 0.5, 20);
    scene.add(floorLight3);
    
    const floorLight4 = new THREE.PointLight(0xaa00ff, 1.0, 20);
    floorLight4.position.set(20, 0.5, -20);
    scene.add(floorLight4);
    
    return {
        ambientLight,
        hemisphereLight,
        pointLight,
        vehicleLight,
        floorLights: [floorLight1, floorLight2, floorLight3, floorLight4]
    };
}

// Add neon lines along the axes
function addNeonAxisLines(scene, laneWidth) {
    // Lane dividers along the Z axis - magenta
    const leftLaneGeometry = new THREE.BufferGeometry();
    const leftLanePoints = [
        new THREE.Vector3(-laneWidth/2, 0.1, -100),
        new THREE.Vector3(-laneWidth/2, 0.1, 100)
    ];
    leftLaneGeometry.setFromPoints(leftLanePoints);
    const leftLaneMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff,
        linewidth: 3,
        emissive: 0xff00ff,
        emissiveIntensity: 1.0
    });
    const leftLaneLine = new THREE.Line(leftLaneGeometry, leftLaneMaterial);
    scene.add(leftLaneLine);
    
    // Right lane divider
    const rightLaneGeometry = new THREE.BufferGeometry();
    const rightLanePoints = [
        new THREE.Vector3(laneWidth/2, 0.1, -100),
        new THREE.Vector3(laneWidth/2, 0.1, 100)
    ];
    rightLaneGeometry.setFromPoints(rightLanePoints);
    const rightLaneMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff,
        linewidth: 3,
        emissive: 0xff00ff,
        emissiveIntensity: 1.0
    });
    const rightLaneLine = new THREE.Line(rightLaneGeometry, rightLaneMaterial);
    scene.add(rightLaneLine);
    
    return { leftLaneLine, rightLaneLine };
}

export { createScene, setupLighting, addNeonAxisLines }; 