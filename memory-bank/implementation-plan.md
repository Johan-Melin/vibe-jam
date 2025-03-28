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

Reload the browser preview.
Use arrow keys to move and turn the vehicle.
Confirm smooth movement on the ground plane.
Step 9: Prevent Vehicle from Falling Through Ground
Instructions:

Add a collision check to keep the vehicle on the ground plane.
Use a simple method (e.g., raycasting or position limits) to detect ground level.
Adjust the vehicle’s position if it goes below the ground.
Test:

Reload the browser preview.
Try moving the vehicle off the ground’s edge.
Ensure it stays on the ground and doesn’t fall through.
Step 10: Add Basic Zombie Models
Instructions:

Create a simple zombie model using boxes for the body and limbs in main.js.
Generate multiple zombie instances (e.g., 5–10).
Randomly place the zombies on the ground plane within a defined area.
Test:

Reload the browser preview.
Verify multiple zombies appear on the ground.
Ensure they are spread out and visible.
Step 11: Implement Zombie Movement Toward Vehicle
Instructions:

Add a behavior for zombies to move toward the vehicle in main.js.
Calculate the direction from each zombie to the vehicle’s position.
Update each zombie’s position in the render loop to approach the vehicle.
Test:

Reload the browser preview.
Move the vehicle and observe zombies following it.
Confirm zombies adjust direction as the vehicle moves.
Step 12: Add Vehicle-Zombie Collision Detection
Instructions:

Implement collision detection between the vehicle and zombies in main.js.
Use a simple method (e.g., bounding boxes) to check for overlaps.
Remove a zombie from the scene when it collides with the vehicle.
Test:

Reload the browser preview.
Drive the vehicle into a zombie.
Verify the zombie disappears upon collision.
Step 13: Create a Score Display
Instructions:

Initialize a score variable in main.js starting at zero.
Increase the score when a zombie is hit by the vehicle.
Display the score on the screen using an HTML element overlaid on the canvas.
Test:

Reload the browser preview.
Hit a zombie with the vehicle.
Confirm the score increases and updates on the screen.
Step 14: Add a Fuel Mechanic
Instructions:

Create a fuel variable in main.js with an initial value (e.g., 100).
Decrease the fuel gradually as the vehicle moves forward or backward.
Display the fuel level on the screen next to the score.
Stop vehicle movement when fuel reaches zero.
Test:

Reload the browser preview.
Move the vehicle and watch the fuel decrease.
Verify the vehicle stops when fuel hits zero.
Step 15: Add a Game Over Screen
Instructions:

Define a game over condition (e.g., fuel reaches zero).
Create an HTML element for a "Game Over" message, initially hidden.
Show the message and stop the game loop when the condition is met.
Test:

Reload the browser preview.
Play until fuel runs out.
Confirm the "Game Over" message appears and the game stops.