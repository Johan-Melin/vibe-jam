# Three.js Game Development Rules

Apply Three.js-specific guidance for game development.

## File pattern
**.js

## Guidance
- Focus on Three.js best practices for 3D rendering and game loops
- Ensure proper resource disposal to prevent memory leaks
- Use object pooling for frequently created/destroyed entities like zombies
- Implement efficient collision detection appropriate for the game's needs
- Maintain separation of concerns: rendering, game logic, input handling
- Follow performance best practices such as using object instancing for similar models
- Use raycasting for interactions and collisions when appropriate
- Implement proper camera controls based on game requirements
- Structure code for modularity and reusability 