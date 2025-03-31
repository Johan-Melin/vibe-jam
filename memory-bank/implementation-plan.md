Implementation Plan for Zombie Road Smash (Base Game)
This document outlines a step-by-step guide for AI developers to implement the base version of "Zombie Road Smash" using Three.js in the Cursor editor. The plan ensures small, manageable tasks with validation tests to confirm each step is correctly implemented. Project-specific rules in Cursor are recommended to tailor AI behavior for this game development process.

Step 1: Set Up the Project Environment in Cursor
Instructions:

Open Cursor and create a new project directory for "Zombie Road Smash."
Initialize a Node.js project by running npm init -y in the terminal within Cursor.
Install Three.js by running npm install three in the terminal.
Create an index.html file with a canvas element for rendering the game.
Create a main.js file and link it to index.html using a <script> tag.
Import Three.js in main.js to ensure it’s available for use.
Test:

Open index.html in a browser via Cursor’s preview feature or a local server.
Check the browser console for errors related to Three.js loading.
Confirm the canvas element appears on the page.
Step 2: Configure Project Rules in Cursor
Instructions:

In Cursor, use Cmd + Shift + P and select "New Cursor Rule" to create a project rule.
Save the rule file in .cursor/rules (e.g., threejs-rules.md).
Add a semantic description: "Apply Three.js-specific guidance for game development."
Set a file pattern: **.js to apply the rule to all JavaScript files.
Include instructions in the rule: "Focus on Three.js best practices for 3D rendering and game loops."
Test:

Reference main.js in a Cursor AI prompt (e.g., "How should I set up a scene in @main.js?").
Verify the AI response aligns with Three.js practices and the project rule.
Step 3: Create a Basic 3D Scene
Instructions:

In main.js, initialize a Three.js scene object.
Add a PerspectiveCamera to the scene with default settings.
Set up a WebGLRenderer and connect it to the canvas element in index.html.
Add a simple 3D cube to the scene using basic geometry and material.
Render the scene using the camera in a basic render loop.
Test:

Reload the browser preview.
Ensure a 3D cube is visible on the canvas.
Check the console for rendering-related errors.
Step 4: Add Camera Controls
Instructions:

Import OrbitControls from Three.js examples in main.js.
Initialize OrbitControls with the camera and renderer.
Update the controls within the render loop to enable camera movement.
Test:

Reload the browser preview.
Use the mouse to rotate, pan, and zoom the camera around the cube.
Confirm smooth camera movement with no errors.
Step 5: Add a Ground Plane
Instructions:

Create a large plane geometry in main.js to act as the game’s ground.
Apply a simple material (e.g., a solid color) to the plane.
Add the plane to the scene and position it flat on the XZ plane.
Adjust the camera to view both the cube and the ground.
Test:

Reload the browser preview.
Verify the ground plane is visible beneath the cube.
Ensure the camera can orbit to see both objects.
Step 6: Implement Basic Lighting
Instructions:

Add an ambient light to the scene for even illumination.
Add a directional light positioned above the scene to create shadows.
Enable shadow casting on the directional light and shadow receiving on the cube and ground.
Turn on shadow mapping in the renderer settings.
Test:

Reload the browser preview.
Confirm the cube and ground are lit with visible shadows.
Check for lighting errors in the console.

Step 7: Create a Simple Vehicle Model
Instructions:

Build a basic vehicle using a box for the body and cylinders for wheels in main.js.
Group the vehicle components into a single object.
Add the vehicle to the scene and position it on the ground plane.
Test:

Reload the browser preview.
Ensure the vehicle is visible on the ground.
Verify the vehicle casts shadows correctly.

Step 8: Add Vehicle Movement Controls
Instructions:

Set up keyboard event listeners in main.js for arrow keys (up, down, left, right).
Enable forward and backward movement with up and down keys.
Enable left and right steering (rotation) with left and right keys.
Update the vehicle’s position and rotation in the render loop based on key inputs.
Test:

Step 9: Add Basic Obstacles
**�t - In src/objects, create a file named obstacle.js.
Define an Obstacle class that creates simple 3D objects (e.g., boxes or spheres).
In track.js, add a method to spawn obstacles at random horizontal positions along the track.
Add spawned obstacles to the scene in game.js.
Test:
Run the game and watch as the player moves forward.
Verify obstacles appear on the track at varying positions and remain visible as the player approaches.

Step 10: Implement Collision Detection
Instructions:
In game.js, create a function to check for collisions between the player and obstacles.
Use Three.js’s Box3 or similar bounding box method for collision detection.
Log a message to the console when a collision occurs.
Test:
Move the player into an obstacle using arrow keys.
Check the browser console for a collision message.

Step 11: Add Collectibles
Instructions:
In src/objects, create a file named collectible.js.
Define a Collectible class that creates small 3D objects (e.g., glowing spheres).
In track.js, add a method to spawn collectibles at random horizontal positions along the track.
Add spawned collectibles to the scene in game.js.
Test:
Start the game and move the player forward.
Confirm collectibles appear on the track at random positions as the player progresses.

Step 12: Implement Collectible Interaction
Instructions:
In game.js, extend the collision detection function to detect player-collectible intersections.
When a collectible is collected, remove it from the scene and log a message to the console.
Test:
Move the player into a collectible.
Ensure the collectible disappears from the track and a message appears in the console.

Step 13: Add Basic Scoring System
Instructions:
In game.js, create a score variable initialized to zero.
Increment the score when a collectible is collected.
Add a simple HTML element (e.g., a <div>) in index.html to display the score, styled via css.
Update the score display in the render loop.
Test:
Collect several collectibles while playing.
Verify the score increases and updates correctly on the screen.

Step 14: Implement Health System
Instructions:
In game.js, create a health variable initialized to 3.
Decrease health by 1 when the player collides with an obstacle.
Add a health display element in index.html, styled via css.
Update the health display in the render loop.
Test:
Collide with obstacles multiple times.
Confirm health decreases and the display updates accurately.

Step 15: Add Game Over Condition
Instructions:
In game.js, check if health reaches zero in the render loop.
If health is zero, stop the render loop and display a "Game Over" message via an HTML overlay.
Test:
Collide with obstacles until health reaches zero.
Ensure the game stops and a "Game Over" message appears on the screen.

Step 16: Integrate Basic Audio
Instructions:
In src/utils, create a file named audio.js.
Use the Web Audio API to load a background music file from the assets folder.
In game.js, start the music when the game begins.
Test:
Launch the game and listen for background music.
Check the console for no audio-related errors.

Step 17: Synchronize Obstacles and Collectibles with Music
Instructions:
In track.js, adjust obstacle and collectible spawning to occur at fixed intervals (e.g., every second).
Tie the interval timing to the game’s runtime, approximating music rhythm for now.
Test:
Play the game and observe obstacles and collectibles appearing at regular intervals.
Confirm the timing feels rhythmic and consistent with the background music.

Step 18: Add Visual Effects for Interactions
Instructions:
In game.js, add a simple visual effect (e.g., a color flash or particle burst) when collecting a collectible.
Add a different effect (e.g., a red flash) when hitting an obstacle.
Use Three.js features like materials or basic particle systems.
Test:
Collect a collectible and verify a visual effect occurs.
Hit an obstacle and confirm a distinct effect appears.