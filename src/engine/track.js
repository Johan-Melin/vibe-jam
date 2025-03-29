import * as THREE from 'three';

// Variables for endless runner ground segments
const endlessRunner = {
    segments: [],
    segmentLength: 20,  // Length of each ground segment
    segmentWidth: 10,   // Width of the track
    visibleSegments: 15, // Number of segments visible ahead
    totalSegments: 20,   // Total segments to create (includes some behind player)
    moveSpeed: 0.5,      // Speed of ground movement
    groundY: 0,          // Y position of the ground
    traversedDistance: 0 // Total distance traversed
};

// Create a segment for the endless runner
function createGroundSegment(zPosition) {
    const segmentGeometry = new THREE.PlaneGeometry(
        endlessRunner.segmentWidth, 
        endlessRunner.segmentLength, 
        10, 10
    );
    
    // Custom shader material for the ground - dark with neon grid
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000, // Black base
        roughness: 0.7,
        metalness: 0.5,
        emissive: 0x000011, // Very slight blue emissive glow
    });
    
    // Create the ground mesh
    const segment = new THREE.Mesh(segmentGeometry, groundMaterial);
    segment.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
    segment.position.y = endlessRunner.groundY;
    segment.position.z = zPosition;
    segment.receiveShadow = true;
    
    // Add neon grid to the segment
    const gridHelper = new THREE.GridHelper(
        endlessRunner.segmentWidth, 
        4, 
        0x00ffff, 
        0xff00ff
    );
    gridHelper.position.y = 0.02; // Slightly above ground to prevent z-fighting
    gridHelper.position.z = zPosition;
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    
    // Make grid lines glow
    if (gridHelper.material instanceof THREE.Material) {
        gridHelper.material.emissive = new THREE.Color(0xffffff);
        gridHelper.material.emissiveIntensity = 1.0;
    } else if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach(mat => {
            mat.emissive = new THREE.Color(0xffffff);
            mat.emissiveIntensity = 1.0;
        });
    }
    
    return {
        segment: segment,
        grid: gridHelper,
        position: zPosition
    };
}

// Initialize the endless runner ground segments
function initEndlessRunner(scene, laneWidth) {
    // Create initial segments
    for (let i = 0; i < endlessRunner.totalSegments; i++) {
        const zPos = -i * endlessRunner.segmentLength;
        const segment = createGroundSegment(zPos);
        scene.add(segment.segment);
        scene.add(segment.grid);
        endlessRunner.segments.push(segment);
    }
    
    return endlessRunner;
}

// Update endless runner ground movement
function updateEndlessRunner(deltaTime) {
    // Move all segments forward
    endlessRunner.segments.forEach(segment => {
        segment.position += endlessRunner.moveSpeed;
        segment.segment.position.z = segment.position;
        segment.grid.position.z = segment.position;
        
        // If segment is too far behind, move it to the front
        if (segment.position > endlessRunner.segmentLength) {
            // Calculate new position at the end of the track
            segment.position = -endlessRunner.segmentLength * (endlessRunner.totalSegments - 1);
            segment.segment.position.z = segment.position;
            segment.grid.position.z = segment.position;
        }
    });
    
    // Update total distance traversed (for scoring)
    endlessRunner.traversedDistance += endlessRunner.moveSpeed;
    
    return endlessRunner.traversedDistance;
}

export { initEndlessRunner, updateEndlessRunner, endlessRunner }; 