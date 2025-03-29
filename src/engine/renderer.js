import * as THREE from 'three';

// Initialize the renderer
function initRenderer() {
    const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization
    
    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    return renderer;
}

// Handle window resize
function handleResize(renderer, camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Setup window resize handler
function setupResizeHandler(renderer, camera) {
    window.addEventListener('resize', () => {
        handleResize(renderer, camera);
    });
}

export { initRenderer, handleResize, setupResizeHandler }; 