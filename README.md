# Rhythm Road

A WebGL-based rhythm game built with Three.js where you navigate a neon vehicle through a cyberpunk landscape in sync with the music.

## Project Structure

The codebase has been organized into a modular structure for better maintainability:

```
src/
├── engine/         # Core Three.js and rendering functionality
│   ├── camera.js   # Camera management
│   ├── input.js    # Input handling
│   ├── renderer.js # WebGL renderer setup
│   ├── scene.js    # Scene and lighting setup
│   └── track.js    # Endless runner track system
│
├── audio/          # Audio-related functionality
│   └── audioManager.js # Audio loading, playback, and analysis
│
├── gameplay/       # Game mechanics
│   ├── rhythmGame.js   # Rhythm game system
│   └── vehicle.js      # Player vehicle creation and management
│
├── utils/          # Utility functions
│   └── utils.js    # Common utility functions
│
└── main.js         # Main application entry point
```

## Features

- **Beat-synchronized Gameplay**: Notes and obstacles are generated based on music beats
- **Dynamic Lighting**: Neon-styled lighting that reacts to the music
- **Three-lane System**: Navigate between lanes to hit the beats in rhythm
- **Audio Analysis**: Real-time frequency analysis of music to generate gameplay elements
- **Responsive Design**: Adapts to different screen sizes and resolutions

## Getting Started

1. Clone the repository
2. Make sure you have a local server to run the project (e.g., using `npx serve`)
3. Run the local server and open the application in your browser

```bash
npx serve
```

## Controls

- **Left/Right Arrow Keys**: Change lanes
- **M Key**: Toggle music
- **C Key**: Change camera view
- **F Key**: Toggle FPS/performance stats panel
- **D Key**: Toggle detailed scene info panel
- **1-4 Keys**: Switch between different stats panels
  - 1: FPS (frames per second)
  - 2: MS (milliseconds per frame)
  - 3: MB (memory usage)
  - 4: Custom panel (if implemented)

## Dependencies

- Three.js - 3D graphics library
- Web Audio API - For audio processing and analysis

## License

ISC 