import Stats from 'three/addons/libs/stats.module.js';

// Create debug panel with stats
function createStatsPanel() {
    const stats = new Stats();
    stats.dom.style.cssText = 'position:absolute;top:0;left:0;';
    stats.dom.classList.add('stats');
    document.body.appendChild(stats.dom);
    
    // Add keyboard controls for panel types
    window.addEventListener('keydown', (event) => {
        // Number keys 1-4 to switch between panels
        if (event.key >= '1' && event.key <= '4') {
            const panelId = parseInt(event.key) - 1;
            if (panelId >= 0 && panelId < 4) {
                stats.showPanel(panelId);
                
                // Show temporary label of what panel we're viewing
                showPanelLabel(panelId);
            }
        }
        
        // F key to toggle visibility (implementation in input.js)
        if (event.key === 'f' || event.key === 'F') {
            stats.dom.style.display = stats.dom.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Show FPS panel by default
    stats.showPanel(0);
    
    return stats;
}

// Display a temporary label indicating which panel is active
function showPanelLabel(panelId) {
    // Remove any existing label
    const existingLabel = document.getElementById('panel-type-label');
    if (existingLabel) {
        document.body.removeChild(existingLabel);
    }
    
    // Create a new label
    const label = document.createElement('div');
    label.id = 'panel-type-label';
    label.style.position = 'absolute';
    label.style.top = '50px';
    label.style.left = '10px';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    label.style.color = '#00ffff';
    label.style.padding = '5px 10px';
    label.style.borderRadius = '5px';
    label.style.fontFamily = 'monospace';
    label.style.fontSize = '14px';
    label.style.zIndex = '1001';
    
    // Set label text based on panel type
    switch (panelId) {
        case 0:
            label.textContent = 'FPS (Frames per Second)';
            break;
        case 1:
            label.textContent = 'MS (Milliseconds per Frame)';
            break;
        case 2:
            label.textContent = 'MB (Memory Usage)';
            break;
        case 3:
            label.textContent = 'CUSTOM (if implemented)';
            break;
    }
    
    document.body.appendChild(label);
    
    // Remove label after 2 seconds
    setTimeout(() => {
        if (document.body.contains(label)) {
            document.body.removeChild(label);
        }
    }, 2000);
}

// Display Three.js scene information
function createSceneInfoPanel(renderer, scene, camera) {
    const infoPanel = document.createElement('div');
    infoPanel.id = 'scene-info-panel';
    infoPanel.style.position = 'absolute';
    infoPanel.style.top = '50px';
    infoPanel.style.left = '5px';
    infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    infoPanel.style.color = '#00ffff';
    infoPanel.style.padding = '10px';
    infoPanel.style.borderRadius = '5px';
    infoPanel.style.fontFamily = 'monospace';
    infoPanel.style.fontSize = '12px';
    infoPanel.style.maxWidth = '400px';
    infoPanel.style.zIndex = '1000';
    document.body.appendChild(infoPanel);

    // Toggle visibility with 'D' key
    let visible = true;
    window.addEventListener('keydown', (event) => {
        if (event.key === 'd' || event.key === 'D') {
            visible = !visible;
            infoPanel.style.display = visible ? 'block' : 'none';
            
            // Show temporary label
            if (visible) {
                const label = document.createElement('div');
                label.textContent = 'Scene Info Panel: Visible';
                label.style.position = 'absolute';
                label.style.top = '80px';
                label.style.left = '10px';
                label.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                label.style.color = '#00ffff';
                label.style.padding = '5px 10px';
                label.style.borderRadius = '5px';
                label.style.fontFamily = 'monospace';
                label.style.fontSize = '14px';
                label.style.zIndex = '1001';
                document.body.appendChild(label);
                
                setTimeout(() => document.body.removeChild(label), 1500);
            }
        }
    });
    
    // Add keyboard help overlay
    const keyboardHelp = document.createElement('div');
    keyboardHelp.textContent = 'Keyboard Controls:\n1-4: Switch Stats Panel\nF: Toggle FPS Stats\nD: Toggle Scene Info';
    keyboardHelp.style.position = 'absolute';
    keyboardHelp.style.bottom = '10px';
    keyboardHelp.style.right = '10px';
    keyboardHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    keyboardHelp.style.color = '#ffffff';
    keyboardHelp.style.padding = '5px 10px';
    keyboardHelp.style.borderRadius = '5px';
    keyboardHelp.style.fontFamily = 'monospace';
    keyboardHelp.style.fontSize = '12px';
    keyboardHelp.style.whiteSpace = 'pre-line';
    keyboardHelp.style.textAlign = 'right';
    keyboardHelp.style.zIndex = '1000';
    document.body.appendChild(keyboardHelp);
    
    // Hide keyboard help after 10 seconds
    setTimeout(() => {
        keyboardHelp.style.transition = 'opacity 1s';
        keyboardHelp.style.opacity = '0';
        setTimeout(() => keyboardHelp.style.display = 'none', 1000);
    }, 10000);

    return {
        dom: infoPanel,
        update: function() {
            if (!visible) return;
            
            // Count geometries, materials, textures
            let geometries = 0;
            let materials = 0;
            let textures = 0;
            let triangles = 0;
            let vertices = 0;
            let objects = 0;
            let lights = 0;
            
            scene.traverse(object => {
                objects++;
                
                if (object.isMesh) {
                    const geometry = object.geometry;
                    
                    if (geometry) {
                        geometries++;
                        
                        if (geometry.index !== null) {
                            triangles += geometry.index.count / 3;
                        } else if (geometry.attributes.position) {
                            triangles += geometry.attributes.position.count / 3;
                        }
                        
                        if (geometry.attributes.position) {
                            vertices += geometry.attributes.position.count;
                        }
                    }
                    
                    const material = object.material;
                    if (material) {
                        materials++;
                        
                        if (Array.isArray(material)) {
                            for (let i = 0; i < material.length; i++) {
                                if (material[i].map) textures++;
                                if (material[i].specularMap) textures++;
                                if (material[i].normalMap) textures++;
                                if (material[i].aoMap) textures++;
                                if (material[i].emissiveMap) textures++;
                                if (material[i].roughnessMap) textures++;
                                if (material[i].metalnessMap) textures++;
                            }
                        } else {
                            if (material.map) textures++;
                            if (material.specularMap) textures++;
                            if (material.normalMap) textures++;
                            if (material.aoMap) textures++;
                            if (material.emissiveMap) textures++;
                            if (material.roughnessMap) textures++;
                            if (material.metalnessMap) textures++;
                        }
                    }
                }
                
                if (object.isLight) {
                    lights++;
                }
            });
            
            // Calculate renderer info
            const rendererInfo = renderer.info;
            const memoryInfo = rendererInfo.memory || {};
            const renderInfo = rendererInfo.render || {};
            
            infoPanel.innerHTML = `
                <b>DEBUG INFO</b> (press D to toggle)<br><br>
                <b>Renderer:</b><br>
                - Draw calls: ${renderInfo.calls || 0}<br>
                - Triangles: ${renderInfo.triangles || 0}<br>
                - Lines: ${renderInfo.lines || 0}<br>
                - Points: ${renderInfo.points || 0}<br><br>
                
                <b>Memory:</b><br>
                - Geometries: ${memoryInfo.geometries || 0}<br>
                - Textures: ${memoryInfo.textures || 0}<br><br>
                
                <b>Scene:</b><br>
                - Objects: ${objects}<br>
                - Geometries: ${geometries}<br>
                - Materials: ${materials}<br>
                - Textures: ${textures}<br>
                - Triangles: ${triangles.toFixed(0)}<br>
                - Vertices: ${vertices}<br>
                - Lights: ${lights}<br><br>
                
                <b>Camera:</b><br>
                - Position: X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}<br>
                - Rotation: X: ${(camera.rotation.x * 180 / Math.PI).toFixed(2)}°, Y: ${(camera.rotation.y * 180 / Math.PI).toFixed(2)}°, Z: ${(camera.rotation.z * 180 / Math.PI).toFixed(2)}°<br>
                - FOV: ${camera.fov}°<br>
                - Aspect: ${camera.aspect.toFixed(2)}<br>
            `;
        }
    };
}

export { createStatsPanel, createSceneInfoPanel }; 