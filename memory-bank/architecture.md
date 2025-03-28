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
- `Group` - Container to organize multiple meshes as a single unit
- `OrbitControls` - Enables interactive camera controls with mouse/touch
- `AmbientLight` - Provides uniform illumination to all objects
- `DirectionalLight` - Simulates sunlight with parallel light rays and shadows
- `HemisphereLight` - Creates realistic outdoor lighting with sky and ground colors
- `PointLight` - Emits light in all directions from a single point
- `FogExp2` - Creates exponential fog effect for depth perception
- `PlaneGeometry` - Creates flat rectangular surfaces (used for the ground)
- `BoxGeometry` - Creates cubic or rectangular prism shapes
- `CylinderGeometry` - Creates cylinder shapes (used for wheels)
- `MeshStandardMaterial` - Physically-based material with properties like roughness and metalness
- `GridHelper` - Visual representation of a grid to help with spatial awareness
- `Vector3` - Three-dimensional vector for position and direction calculations

### Core Game Elements

- Enhanced ground system:
  - Large terrain with gentle elevation variations
  - Procedurally modified vertices for natural-looking landscape
  - Grid overlay for improved spatial reference
  - Edge flattening for playable boundaries
- Vehicle model:
  - Composed of multiple parts (body, cabin, wheels, bull bar)
  - Realistic materials with appropriate metalness and roughness
  - Animated wheels for visual feedback
  - Structured for future input-based movement
- Vehicle movement system:
  - Physics-based movement with acceleration and deceleration
  - Keyboard controls for directional input
  - Realistic turning mechanics based on vehicle speed
  - Dynamic wheel rotation tied to movement speed
- Camera system - Multiple camera views with state management:
  - Orbit view for development and free exploration
  - Top-down view for strategic overview
  - Follow view for behind-the-vehicle gameplay perspective
- Advanced lighting system:
  - Multiple light types for realistic illumination
  - Carefully configured shadow parameters
  - Dynamic ambient and directional lighting
  - Atmospheric fog for depth and environment immersion

### System Architecture

- Camera state management:
  - Predefined camera positions and targets for different views
  - Keyboard-triggered state switching between views
  - Orbit controls enabled/disabled based on the active view
  - Follow camera with dynamic positioning behind vehicle
  - Easily extensible for additional view types

- Terrain generation system:
  - Function-based approach to terrain creation
  - Mathematical functions for height variations
  - Distance-based edge smoothing
  - Performance optimizations for vertex manipulations

- Lighting management:
  - Modular setupLighting() function
  - Light types organized for different purposes
  - Shadow optimization with camera frustum settings
  - Color temperatures tuned for outdoor environment

- Vehicle management:
  - Modular createVehicle() function
  - Hierarchical structure with parent-child relationships
  - Organized component references for animation and control
  - Shadow-casting configuration for all components

- Input handling system:
  - Keyboard event listeners for user input
  - Control mapping for vehicle movement
  - State tracking for simultaneous key presses
  - Event-based architecture for input responsiveness

- Vehicle physics:
  - Speed and acceleration calculation
  - Angular velocity and rotation
  - Direction vector management
  - Time-based movement calculations

### Future Architecture Considerations

As development progresses, the project will likely expand to include:

- Collision detection with environment and zombies
- Zombie entity management and behavior AI
- Game scoring and progression system
- Asset loading and management
- Sound effects and music integration
