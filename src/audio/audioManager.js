import * as THREE from 'three';

// Audio state variables
let engineSound;
let backgroundMusic;
let audioListener;
let audioLoaded = false;
let musicLoaded = false;
let audioContext;
let musicPlaying = false;
let audioAnalyzer;
let analyzerData;

// Initialize audio system but don't play yet
function setupAudio(camera) {
    // Create an audio listener and add it to the camera
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    
    // Store audio context for resuming later
    audioContext = audioListener.context;
    
    // Create a global audio source for the engine
    engineSound = new THREE.Audio(audioListener);
    
    // Create a global audio source for background music
    backgroundMusic = new THREE.Audio(audioListener);
    
    // Load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    
    // Create status elements for loading progress
    createLoadingStatusElements();
    
    // Load engine sound with path fallbacks
    loadSoundWithFallbacks(
        audioLoader,
        ['./sounds/engine_loop.mp3', './public/sounds/engine_loop.mp3'],
        (buffer) => {
            engineSound.setBuffer(buffer);
            engineSound.setLoop(true);
            engineSound.setVolume(0.05);
            // Don't autoplay - wait for user interaction
            audioLoaded = true;
            
            // Start with idle engine sound when played
            engineSound.setPlaybackRate(0.5);
            
            updateLoadingStatus('engine', 'complete');
            
            // Show a message to the user if both sounds are loaded
            checkAndShowAudioStartMessage();
        },
        (progress) => {
            console.log('Engine sound: ' + progress + '% loaded');
            updateLoadingStatus('engine', 'loading', progress);
        },
        (err) => {
            console.error('Could not load engine sound: ' + err);
            updateLoadingStatus('engine', 'error');
        }
    );
    
    // Load music with path fallbacks
    loadSoundWithFallbacks(
        audioLoader,
        ['./music/Electric.mp3', './public/music/Electric.mp3'],
        (buffer) => {
            backgroundMusic.setBuffer(buffer);
            backgroundMusic.setLoop(true);
            backgroundMusic.setVolume(0.7);
            musicLoaded = true;
            console.log('Background music loaded successfully');
            
            // Set up audio analyzer once music is loaded
            setupAudioAnalyzer();
            
            updateLoadingStatus('music', 'complete');
            
            // Show a message to the user if both sounds are loaded
            checkAndShowAudioStartMessage();
        },
        (progress) => {
            console.log('Background music: ' + Math.round(progress) + '% loaded');
            updateLoadingStatus('music', 'loading', Math.round(progress));
        },
        (err) => {
            console.error('Could not load background music: ' + err);
            updateLoadingStatus('music', 'error');
            
            // Try alternative file names if the first one fails
            tryAlternativeMusicFiles(audioLoader);
        }
    );
    
    return {
        engineSound,
        backgroundMusic,
        audioListener,
        audioLoaded,
        musicLoaded,
        audioContext,
        musicPlaying
    };
}

// Create visual elements to show loading progress
function createLoadingStatusElements() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'audio-loading-status';
    loadingDiv.style.position = 'absolute';
    loadingDiv.style.top = '10px';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translateX(-50%)';
    loadingDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    loadingDiv.style.color = 'white';
    loadingDiv.style.padding = '10px 20px';
    loadingDiv.style.borderRadius = '5px';
    loadingDiv.style.fontFamily = 'Arial, sans-serif';
    loadingDiv.style.zIndex = '1000';
    loadingDiv.style.minWidth = '300px';
    loadingDiv.style.textAlign = 'center';
    
    // Engine sound status
    const engineStatusDiv = document.createElement('div');
    engineStatusDiv.id = 'engine-status';
    engineStatusDiv.innerHTML = 'Engine Sound: <span class="status">Loading...</span>';
    engineStatusDiv.style.marginBottom = '5px';
    
    // Create progress bar for engine sound
    const engineProgressBarContainer = document.createElement('div');
    engineProgressBarContainer.style.width = '100%';
    engineProgressBarContainer.style.height = '10px';
    engineProgressBarContainer.style.backgroundColor = '#444';
    engineProgressBarContainer.style.borderRadius = '5px';
    engineProgressBarContainer.style.overflow = 'hidden';
    engineProgressBarContainer.style.marginBottom = '8px';
    
    const engineProgressBar = document.createElement('div');
    engineProgressBar.id = 'engine-progress';
    engineProgressBar.style.width = '0%';
    engineProgressBar.style.height = '100%';
    engineProgressBar.style.backgroundColor = '#4CAF50';
    engineProgressBar.style.transition = 'width 0.3s';
    
    engineProgressBarContainer.appendChild(engineProgressBar);
    engineStatusDiv.appendChild(engineProgressBarContainer);
    
    // Music status
    const musicStatusDiv = document.createElement('div');
    musicStatusDiv.id = 'music-status';
    musicStatusDiv.innerHTML = 'Background Music: <span class="status">Loading...</span>';
    musicStatusDiv.style.marginBottom = '5px';
    
    // Create progress bar for music
    const musicProgressBarContainer = document.createElement('div');
    musicProgressBarContainer.style.width = '100%';
    musicProgressBarContainer.style.height = '10px';
    musicProgressBarContainer.style.backgroundColor = '#444';
    musicProgressBarContainer.style.borderRadius = '5px';
    musicProgressBarContainer.style.overflow = 'hidden';
    
    const musicProgressBar = document.createElement('div');
    musicProgressBar.id = 'music-progress';
    musicProgressBar.style.width = '0%';
    musicProgressBar.style.height = '100%';
    musicProgressBar.style.backgroundColor = '#4CAF50';
    musicProgressBar.style.transition = 'width 0.3s';
    
    musicProgressBarContainer.appendChild(musicProgressBar);
    musicStatusDiv.appendChild(musicProgressBarContainer);
    
    // Add status divs to the main container
    loadingDiv.appendChild(engineStatusDiv);
    loadingDiv.appendChild(musicStatusDiv);
    
    // Add to document
    document.body.appendChild(loadingDiv);
}

// Update the visual loading status
function updateLoadingStatus(type, status, progress = 0) {
    const statusElement = document.getElementById(`${type}-status`);
    const progressBar = document.getElementById(`${type}-progress`);
    
    if (!statusElement || !progressBar) return;
    
    const statusTextElement = statusElement.querySelector('.status');
    
    switch (status) {
        case 'loading':
            statusTextElement.textContent = `Loading... ${progress}%`;
            progressBar.style.width = `${progress}%`;
            break;
        case 'complete':
            statusTextElement.textContent = 'Ready ✓';
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#4CAF50'; // Green
            break;
        case 'error':
            statusTextElement.textContent = 'Error loading!';
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#f44336'; // Red
            break;
    }
    
    // Check if all audio is loaded
    checkAllAudioLoaded();
}

// Check if all audio is loaded and update UI accordingly
function checkAllAudioLoaded() {
    if (audioLoaded && musicLoaded) {
        console.log("All audio components loaded successfully");
        
        const loadingDiv = document.getElementById('audio-loading-status');
        if (loadingDiv) {
            // Show the completed status for 1.5 seconds before fading
            setTimeout(() => {
                loadingDiv.style.transition = 'opacity 1s';
                loadingDiv.style.opacity = '0';
                
                // After the loading UI fades out, setup key/click listeners
                setTimeout(() => {
                    loadingDiv.style.display = 'none';
                    
                    // Instead of auto-starting, listen for any key or click
                    setupStartListeners();
                }, 1000);
            }, 1500);
        } else {
            // If no loading UI exists, just setup the listeners
            setupStartListeners();
        }
    }
}

// Set up listeners for any key or click to start audio
function setupStartListeners() {
    console.log("Audio loaded - waiting for user interaction to start");
    
    // Show a subtle hint that won't block the game
    showStartHint();
    
    // One-time event listeners for first interaction
    const startAudioOnce = () => {
        // Start the audio
        startAudioAutomatically();
        
        // Remove the hint if it exists
        const hintElement = document.getElementById('start-audio-hint');
        if (hintElement) {
            hintElement.style.opacity = '0';
            setTimeout(() => {
                if (hintElement.parentNode) {
                    hintElement.parentNode.removeChild(hintElement);
                }
            }, 1000);
        }
        
        // Remove all event listeners
        window.removeEventListener('keydown', startAudioOnce);
        window.removeEventListener('click', startAudioOnce);
        window.removeEventListener('touchstart', startAudioOnce);
    };
    
    // Add event listeners for common interactions
    window.addEventListener('keydown', startAudioOnce);
    window.addEventListener('click', startAudioOnce);
    window.addEventListener('touchstart', startAudioOnce);
}

// Show a subtle hint to press any key or click to start audio
function showStartHint() {
    const hintDiv = document.createElement('div');
    hintDiv.id = 'start-audio-hint';
    hintDiv.style.position = 'absolute';
    hintDiv.style.bottom = '20px';
    hintDiv.style.left = '50%';
    hintDiv.style.transform = 'translateX(-50%)';
    hintDiv.style.backgroundColor = 'rgba(0,0,0,0.4)';
    hintDiv.style.color = 'white';
    hintDiv.style.padding = '8px 16px';
    hintDiv.style.borderRadius = '4px';
    hintDiv.style.fontFamily = 'Arial, sans-serif';
    hintDiv.style.fontSize = '14px';
    hintDiv.style.opacity = '0';
    hintDiv.style.transition = 'opacity 0.5s';
    hintDiv.style.zIndex = '1000';
    hintDiv.style.pointerEvents = 'none'; // So it doesn't interfere with game controls
    hintDiv.textContent = 'Press any key or click to start music';
    
    // Add to document
    document.body.appendChild(hintDiv);
    
    // Fade in the hint
    setTimeout(() => {
        hintDiv.style.opacity = '1';
    }, 100);
    
    // Fade out the hint after 5 seconds if no interaction
    setTimeout(() => {
        if (hintDiv.parentNode) {
            hintDiv.style.opacity = '0';
        }
    }, 5000);
}

// Only show the audio start message when both engine and music are loaded
function checkAndShowAudioStartMessage() {
    if (audioLoaded && musicLoaded) {
        // No longer showing message or auto-starting,
        // now waiting for user interaction
        console.log("Audio loaded, waiting for user interaction");
    }
}

// Function to try loading a sound from multiple paths
function loadSoundWithFallbacks(audioLoader, paths, onSuccess, onProgress, onError) {
    let currentPathIndex = 0;
    
    function tryNextPath() {
        if (currentPathIndex >= paths.length) {
            // We've tried all paths and none worked
            onError(new Error(`Failed to load audio. Tried paths: ${paths.join(', ')}`));
            return;
        }
        
        const currentPath = paths[currentPathIndex];
        console.log(`Trying to load audio from: ${currentPath}`);
        
        audioLoader.load(
            currentPath,
            (buffer) => {
                console.log(`Successfully loaded audio from: ${currentPath}`);
                onSuccess(buffer);
            },
            (xhr) => {
                const progress = xhr.loaded / xhr.total * 100;
                onProgress(progress);
            },
            (err) => {
                console.warn(`Failed to load audio from: ${currentPath}, trying next path...`);
                currentPathIndex++;
                tryNextPath();
            }
        );
    }
    
    // Start trying paths
    tryNextPath();
}

// Try to load music using alternative filenames
function tryAlternativeMusicFiles(audioLoader) {
    const possibleFilenames = [
        ['./music/background.mp3', './public/music/background.mp3'],
        ['./music/track.mp3', './public/music/track.mp3'],
        ['./music/theme.mp3', './public/music/theme.mp3'],
        ['./music/music.mp3', './public/music/music.mp3']
    ];
    
    let fileIndex = 0;
    
    function tryNextFile() {
        if (fileIndex >= possibleFilenames.length) {
            console.error('Failed to load any music files');
            return;
        }
        
        const paths = possibleFilenames[fileIndex];
        fileIndex++;
        
        console.log(`Trying to load alternative music file`);
        updateLoadingStatus('music', 'loading', 0);
        
        loadSoundWithFallbacks(
            audioLoader,
            paths,
            function(buffer) {
                backgroundMusic.setBuffer(buffer);
                backgroundMusic.setLoop(true);
                backgroundMusic.setVolume(0.7);
                musicLoaded = true;
                console.log(`Successfully loaded alternative music`);
                updateLoadingStatus('music', 'complete');
                checkAndShowAudioStartMessage();
            },
            function(progress) {
                console.log(`Alternative music: ${Math.round(progress)}% loaded`);
                updateLoadingStatus('music', 'loading', progress);
            },
            function(err) {
                console.error(`Failed to load alternative music: ${err}`);
                updateLoadingStatus('music', 'error');
                tryNextFile();
            }
        );
    }
    
    tryNextFile();
}

// Consolidated function to handle all audio toggling
function toggleAudio() {
    if (!audioLoaded) {
        console.log("Engine sound not loaded yet");
        return;
    }
    
    if (!musicLoaded) {
        console.log("Background music not loaded yet");
        return;
    }
    
    // First ensure audio context is running
    if (audioContext && audioContext.state !== 'running') {
        console.log("Starting audio context");
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            
            // Start both engine and music
            if (!engineSound.isPlaying) {
                engineSound.play();
                console.log("Engine sound started");
            }
            
            if (backgroundMusic && !backgroundMusic.isPlaying) {
                backgroundMusic.play();
                musicPlaying = true;
                console.log("Background music started");
            }
            
            // Remove the message if it exists
            const messageDiv = document.getElementById('audio-message');
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        });
    } 
    // If context is running, toggle sounds
    else {
        // Toggle engine sound
        if (engineSound.isPlaying) {
            engineSound.pause();
            console.log("Engine sound paused");
            
            // Also pause background music
            if (backgroundMusic.isPlaying) {
                backgroundMusic.pause();
                musicPlaying = false;
                console.log("Background music paused");
            }
        } else {
            engineSound.play();
            console.log("Engine sound resumed");
            
            // Also resume background music
            if (backgroundMusic && !backgroundMusic.isPlaying) {
                backgroundMusic.play();
                musicPlaying = true;
                console.log("Background music resumed");
            }
        }
        
        // Remove the message if it exists
        const messageDiv = document.getElementById('audio-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }
    
    return musicPlaying;
}

// Start audio after user interaction
function startAudioAutomatically() {
    // Only start if not already playing
    if (musicPlaying) {
        console.log("Music already playing, no need to start again");
        return;
    }
    
    console.log("Starting audio after user interaction");
    
    // First ensure audio context is running
    if (audioContext && audioContext.state !== 'running') {
        console.log("Resuming audio context...");
        
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            startPlayback();
        }).catch(err => {
            console.error("Failed to resume audio context:", err);
            // Try anyway - user interaction often unlocks it
            startPlayback();
        });
    } else {
        // Context already running, just play the sounds
        startPlayback();
    }
    
    function startPlayback() {
        try {
            // Start engine sound
            if (engineSound && !engineSound.isPlaying) {
                engineSound.play();
                console.log("Engine sound started");
            }
            
            // Start background music
            if (backgroundMusic && !backgroundMusic.isPlaying) {
                backgroundMusic.play();
                musicPlaying = true;
                console.log("Background music started");
                
                // Double-check playback after a moment
                setTimeout(() => {
                    if (!backgroundMusic.isPlaying) {
                        console.warn("Music didn't start properly, trying again");
                        try {
                            backgroundMusic.play();
                            musicPlaying = true;
                        } catch (e) {
                            console.error("Error restarting music:", e);
                        }
                    }
                }, 500);
            }
        } catch (error) {
            console.error("Error starting audio:", error);
        }
    }
}

// Display a message to the user about starting audio
// This is now only used as a fallback if automatic start fails
function showAudioStartMessage() {
    // Create a simple overlay message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'audio-message';
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.fontFamily = 'Arial, sans-serif';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.cursor = 'pointer';
    messageDiv.textContent = 'Click here or press M to start engine sound and music';
    
    // Add click handler to start audio using the consolidated function
    messageDiv.addEventListener('click', toggleAudio);
    
    // Add to document
    document.body.appendChild(messageDiv);
}

// Update engine sound based on vehicle speed
function updateEngineSound(speed, maxSpeed) {
    if (!audioLoaded || !engineSound) return;
    
    // Calculate engine sound playback rate based on speed
    // Idle sound at 0.5x speed, max sound at 2.0x speed
    const minRate = 0.5;  // Idle engine sound
    const maxRate = 2.0;  // Maximum revving sound
    
    // Calculate target playback rate based on speed percentage
    const speedPercentage = Math.abs(speed) / maxSpeed;
    const targetRate = minRate + (speedPercentage * (maxRate - minRate));
    
    // Apply the playback rate with a little smoothing
    const currentRate = engineSound.playbackRate;
    const newRate = currentRate + (targetRate - currentRate) * 0.1;
    engineSound.setPlaybackRate(newRate);
}

// Set up audio analyzer for music visualization
function setupAudioAnalyzer() {
    // Create analyzer node
    audioAnalyzer = audioListener.context.createAnalyser();
    audioAnalyzer.fftSize = 256;
    audioAnalyzer.smoothingTimeConstant = 0.8;
    
    // Connect music to analyzer
    backgroundMusic.setFilters([audioAnalyzer]);
    
    // Create array for analyzer data
    analyzerData = new Uint8Array(audioAnalyzer.frequencyBinCount);
    
    console.log("Audio analyzer setup complete");
}

// Get frequency data from the analyzer
function getAnalyzerData() {
    if (!audioAnalyzer) return null;
    
    audioAnalyzer.getByteFrequencyData(analyzerData);
    return analyzerData;
}

export { 
    setupAudio,
    toggleAudio,
    updateEngineSound,
    setupAudioAnalyzer,
    getAnalyzerData,
    audioLoaded,
    musicLoaded,
    musicPlaying
}; 