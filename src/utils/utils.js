// Clock utility for timing
class Clock {
    constructor() {
        this.startTime = Date.now();
        this.prevTime = this.startTime;
    }
    
    getDelta() {
        const time = Date.now();
        const delta = (time - this.prevTime) / 1000; // Convert to seconds
        this.prevTime = time;
        return delta;
    }
    
    getElapsedTime() {
        return (Date.now() - this.startTime) / 1000; // Convert to seconds
    }
    
    getElapsedTimeMs() {
        return Date.now() - this.startTime; // In milliseconds
    }
}

// Linear interpolation
function lerp(start, end, alpha) {
    return start * (1 - alpha) + end * alpha;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Compute a value from a normalized curve (0 to 1)
function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export { Clock, lerp, clamp, randomInt, easeInOut }; 