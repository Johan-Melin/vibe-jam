# Zombie Road Smash - Architecture

## Project Structure

### Files

- `index.html` - The main HTML entry point that:
  - Contains the canvas element where the game is rendered
  - Imports the main.js module
  - Provides basic styling for fullscreen canvas display

- `main.js` - The core JavaScript file that:
  - Imports Three.js library
  - Creates and manages the 3D scene
  - Sets up the camera with proper perspective
  - Configures the WebGL renderer
  - Handles browser window resizing
  - Contains the game loop (animate function)
  - Will eventually contain game logic, physics, and object management

- `package.json` - Node.js project configuration:
  - Defines project metadata
  - Lists dependencies (Three.js)
  - Contains npm scripts for development

- `.cursor/rules/threejs-rules.md` - Cursor editor rule file that:
  - Provides AI guidance for Three.js best practices
  - Applies to all JavaScript files
  - Ensures consistent code quality and approach
  - Helps maintain performance and structural best practices

### Three.js Components

- `Scene` - The container for all 3D objects, lights, and cameras
- `PerspectiveCamera` - Simulates human vision with a field of view
- `WebGLRenderer` - Renders the scene using WebGL for hardware acceleration
- `Mesh` - Combines geometry and materials to create visible 3D objects
- `OrbitControls` - Enables interactive camera controls with mouse/touch
- `AmbientLight` - Provides uniform illumination to all objects
- `DirectionalLight` - Simulates sunlight with parallel light rays and shadows
- `PlaneGeometry` - Creates flat rectangular surfaces (used for the ground)
- `BoxGeometry` - Creates cubic or rectangular prism shapes
- `MeshStandardMaterial` - Physically-based material with properties like roughness and metalness
- `GridHelper` - Visual representation of a grid to help with spatial awareness

### Core Game Elements

- Enhanced ground system:
  - Large terrain with gentle elevation variations
  - Procedurally modified vertices for natural-looking landscape
  - Grid overlay for improved spatial reference
  - Edge flattening for playable boundaries
- Test cube - Basic 3D object with shadow casting for testing
- Camera system - Multiple camera views with state management:
  - Orbit view for development and free exploration
  - Top-down view for strategic overview
  - Follow view for behind-the-vehicle gameplay perspective
- Lighting system - Combination of ambient and directional lights with shadows

### System Architecture

- Camera state management:
  - Predefined camera positions and targets for different views
  - Keyboard-triggered state switching between views
  - Orbit controls enabled/disabled based on the active view
  - Easily extensible for additional view types

- Terrain generation system:
  - Function-based approach to terrain creation
  - Mathematical functions for height variations
  - Distance-based edge smoothing
  - Performance optimizations for vertex manipulations

### Future Architecture Considerations

As development progresses, the project will likely expand to include:

- Dedicated modules for game entities (vehicle, zombies)
- Physics and collision systems
- Input handling
- Game state management
- Asset loading and management
