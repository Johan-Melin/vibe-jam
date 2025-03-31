// UI Score Display for Rhythm Road

// Initialize score display elements
function initScoreDisplay() {
    // Create main container
    const scoreContainer = document.createElement('div');
    scoreContainer.id = 'score-display';
    scoreContainer.style.position = 'absolute';
    scoreContainer.style.top = '20px';
    scoreContainer.style.right = '20px';
    scoreContainer.style.fontFamily = "'Orbitron', 'Rajdhani', sans-serif";
    scoreContainer.style.color = '#00ffff';
    scoreContainer.style.textShadow = '0 0 10px #00ffff, 0 0 20px #00ffff';
    scoreContainer.style.fontSize = '24px';
    scoreContainer.style.textAlign = 'right';
    scoreContainer.style.padding = '15px';
    scoreContainer.style.borderRadius = '5px';
    scoreContainer.style.background = 'rgba(0, 0, 0, 0.5)';
    scoreContainer.style.border = '1px solid #00ffff';
    scoreContainer.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
    scoreContainer.style.zIndex = '1000';
    scoreContainer.style.userSelect = 'none';
    
    // Create score element
    const scoreElement = document.createElement('div');
    scoreElement.id = 'score-value';
    scoreElement.textContent = '0';
    scoreElement.style.fontSize = '36px';
    scoreElement.style.fontWeight = 'bold';
    scoreElement.style.marginBottom = '5px';
    
    // Create multiplier container
    const multiplierContainer = document.createElement('div');
    multiplierContainer.id = 'multiplier-container';
    multiplierContainer.style.display = 'flex';
    multiplierContainer.style.alignItems = 'center';
    multiplierContainer.style.justifyContent = 'flex-end';
    multiplierContainer.style.marginTop = '5px';
    
    // Create multiplier label
    const multiplierLabel = document.createElement('div');
    multiplierLabel.textContent = 'MULTIPLIER: ';
    multiplierLabel.style.fontSize = '16px';
    
    // Create multiplier value
    const multiplierValue = document.createElement('div');
    multiplierValue.id = 'multiplier-value';
    multiplierValue.textContent = 'x1';
    multiplierValue.style.fontSize = '20px';
    multiplierValue.style.fontWeight = 'bold';
    multiplierValue.style.marginLeft = '5px';
    multiplierValue.style.color = '#ff00ff';
    multiplierValue.style.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff';
    
    // Create multiplier progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '100%';
    progressContainer.style.height = '8px';
    progressContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    progressContainer.style.borderRadius = '4px';
    progressContainer.style.marginTop = '5px';
    progressContainer.style.overflow = 'hidden';
    
    // Create multiplier progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'multiplier-progress';
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#ff00ff';
    progressBar.style.boxShadow = '0 0 10px #ff00ff';
    progressBar.style.borderRadius = '4px';
    progressBar.style.transition = 'width 0.3s ease';
    
    // Create cubes collected counter
    const cubesCollected = document.createElement('div');
    cubesCollected.id = 'cubes-collected';
    cubesCollected.textContent = 'CUBES: 0';
    cubesCollected.style.fontSize = '16px';
    cubesCollected.style.marginTop = '10px';
    cubesCollected.style.color = '#7700ff';
    cubesCollected.style.textShadow = '0 0 10px #7700ff, 0 0 20px #7700ff';
    
    // Assemble the UI
    progressContainer.appendChild(progressBar);
    multiplierContainer.appendChild(multiplierLabel);
    multiplierContainer.appendChild(multiplierValue);
    scoreContainer.appendChild(scoreElement);
    scoreContainer.appendChild(multiplierContainer);
    scoreContainer.appendChild(progressContainer);
    scoreContainer.appendChild(cubesCollected);
    
    // Add to document
    document.body.appendChild(scoreContainer);
    
    // Set up a score animation
    const scoreAnimationState = {
        targetScore: 0,
        currentDisplayScore: 0,
        lastUpdateTime: 0
    };
    
    // Return score display controller
    return {
        scoreElement,
        multiplierValue,
        progressBar,
        cubesCollected,
        scoreContainer,
        scoreAnimationState,
        
        // Hide score display
        hide: function() {
            scoreContainer.style.display = 'none';
        },
        
        // Show score display
        show: function() {
            scoreContainer.style.display = 'block';
        },
        
        // Update the UI with score data
        update: function(scoreData) {
            if (!scoreData) return;
            
            // Update target score for animation
            this.scoreAnimationState.targetScore = scoreData.score;
            
            // Update multiplier
            this.multiplierValue.textContent = `x${scoreData.multiplier}`;
            
            // Update multiplier progress
            const progressPercent = (scoreData.multiplierProgress / scoreData.threshold) * 100;
            this.progressBar.style.width = `${progressPercent}%`;
            
            // Update cubes collected
            this.cubesCollected.textContent = `CUBES: ${scoreData.cubesCollected}`;
            
            // Add pulse animation when multiplier changes
            if (parseInt(this.multiplierValue.getAttribute('data-value') || '1') !== scoreData.multiplier) {
                this.addMultiplierPulse();
                this.multiplierValue.setAttribute('data-value', scoreData.multiplier);
            }
        },
        
        // Animate score counting up
        animateScore: function(currentTime) {
            if (!this.scoreAnimationState.lastUpdateTime) {
                this.scoreAnimationState.lastUpdateTime = currentTime;
            }
            
            const elapsed = currentTime - this.scoreAnimationState.lastUpdateTime;
            
            // Update score animation, counting up about 1000 points per second
            if (this.scoreAnimationState.currentDisplayScore < this.scoreAnimationState.targetScore) {
                // Calculate how much to increment based on elapsed time
                const increment = Math.ceil(Math.min(
                    (this.scoreAnimationState.targetScore - this.scoreAnimationState.currentDisplayScore) * 0.1, // 10% of remaining difference
                    elapsed * 2 // Speed factor
                ));
                
                this.scoreAnimationState.currentDisplayScore += increment;
                
                // Ensure we don't exceed target
                if (this.scoreAnimationState.currentDisplayScore > this.scoreAnimationState.targetScore) {
                    this.scoreAnimationState.currentDisplayScore = this.scoreAnimationState.targetScore;
                }
                
                // Update display
                this.scoreElement.textContent = this.scoreAnimationState.currentDisplayScore.toLocaleString();
            }
            
            this.scoreAnimationState.lastUpdateTime = currentTime;
        },
        
        // Add pulse animation to multiplier
        addMultiplierPulse: function() {
            // Remove existing pulse class if present
            this.multiplierValue.classList.remove('multiplier-pulse');
            
            // Force reflow to restart animation
            void this.multiplierValue.offsetWidth;
            
            // Add pulse class
            this.multiplierValue.classList.add('multiplier-pulse');
            
            // Create pulse animation style if it doesn't exist
            if (!document.getElementById('multiplier-pulse-style')) {
                const style = document.createElement('style');
                style.id = 'multiplier-pulse-style';
                style.textContent = `
                    @keyframes multiplierPulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.5); }
                        100% { transform: scale(1); }
                    }
                    .multiplier-pulse {
                        animation: multiplierPulse 0.5s ease-in-out;
                    }
                `;
                document.head.appendChild(style);
            }
        },
        
        // Add a floating score indicator
        addFloatingScore: function(score, position) {
            // Convert 3D position to screen coordinates
            // This would need a reference to the camera and renderer
            // For simplicity, we'll use a random position on screen
            const x = Math.random() * window.innerWidth * 0.8;
            const y = Math.random() * window.innerHeight * 0.5;
            
            // Create floating score element
            const floatingScore = document.createElement('div');
            floatingScore.textContent = `+${score}`;
            floatingScore.style.position = 'absolute';
            floatingScore.style.left = `${x}px`;
            floatingScore.style.top = `${y}px`;
            floatingScore.style.color = '#ffffff';
            floatingScore.style.textShadow = '0 0 10px #00ffff, 0 0 20px #00ffff';
            floatingScore.style.fontFamily = "'Orbitron', sans-serif";
            floatingScore.style.fontSize = '24px';
            floatingScore.style.fontWeight = 'bold';
            floatingScore.style.zIndex = '1001';
            floatingScore.style.pointerEvents = 'none';
            floatingScore.style.transition = 'all 1s ease-out';
            
            // Add to document
            document.body.appendChild(floatingScore);
            
            // Start animation
            setTimeout(() => {
                floatingScore.style.transform = 'translateY(-100px)';
                floatingScore.style.opacity = '0';
            }, 10);
            
            // Remove after animation
            setTimeout(() => {
                document.body.removeChild(floatingScore);
            }, 1000);
        }
    };
}

export { initScoreDisplay }; 