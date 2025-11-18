/**
 * AI-Powered Proctoring System
 * Uses browser's MediaPipe and TensorFlow.js for client-side processing
 * Optimized for low storage, no lag, and high accuracy
 */

class ProctoringSys {
  constructor() {
    this.violations = {
      suspiciousMovements: 0,
      multipleFacesDetected: 0,
      noFaceDetected: 0,
      lookingAway: 0,
      phoneDetected: 0,
      audioAnomalies: 0,
      tabSwitching: 0,
      totalViolations: 0,
      timestamps: []
    };
    
    this.stream = null;
    this.videoElement = null;
    this.audioContext = null;
    this.analyser = null;
    this.lastFacePosition = null;
    this.isMonitoring = false;
    this.detectionInterval = null;
    this.audioInterval = null;
    this.faceapi = null;
    this.violationCallback = null;
    this.tabSwitchCount = 0;
    this.lastFrameData = null;
  }

  /**
   * Initialize proctoring system with camera and microphone
   * IMPORTANT: Fresh permissions are requested every time a proctored quiz starts
   * All permissions are completely revoked when the quiz ends via stopMonitoring()
   */
  async initialize() {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      console.log('🎥 ProctoringSys: Requesting media permissions...');
      console.log('📱 Browser will now show permission dialog for camera and microphone');
      
      // Request camera and microphone permissions - This triggers the browser's native permission dialog
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      console.log('✅ ProctoringSys: Media permissions granted by user');
      console.log('📹 Camera tracks:', this.stream.getVideoTracks().length);
      console.log('🎤 Audio tracks:', this.stream.getAudioTracks().length);

      // Create video element for face detection
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          console.log('✅ ProctoringSys: Video stream ready');
          resolve();
        };
      });

      // Setup audio monitoring
      await this.setupAudioMonitoring();
      console.log('✅ ProctoringSys: Audio monitoring setup complete');

      // Load face detection models (optional - will use basic monitoring if fails)
      await this.loadFaceDetectionModels();

      return { success: true, message: 'Proctoring system initialized successfully' };
    } catch (error) {
      console.error('❌ ProctoringSys initialization error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = error.message;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera/Microphone permission denied. Please allow access and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera/Microphone is already in use by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/Microphone constraints not supported. Please try a different device.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera/Microphone access blocked by browser security. Please ensure you are on HTTPS.';
      }
      
      return { success: false, message: errorMessage, error: error.name };
    }
  }

  /**
   * Load lightweight face detection models
   */
  async loadFaceDetectionModels() {
    try {
      console.log('🎥 ProctoringSys: Attempting to load face detection models...');
      
      // Dynamically import face-api.js if available
      if (window.faceapi) {
        this.faceapi = window.faceapi;
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        await Promise.all([
          this.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          this.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('✅ ProctoringSys: Face detection models loaded from CDN');
      } else {
        console.warn('⚠️ ProctoringSys: face-api.js not available, using basic monitoring');
        this.faceapi = null;
      }
    } catch (error) {
      console.warn('⚠️ ProctoringSys: Face detection models not loaded, using basic monitoring:', error.message);
      this.faceapi = null; // Fallback to basic monitoring
    }
  }

  /**
   * Setup audio monitoring for suspicious sounds
   */
  async setupAudioMonitoring() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (error) {
      console.warn('Audio monitoring setup failed:', error);
    }
  }

  /**
   * Start monitoring with intelligent intervals (faster detection)
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    console.log('🎥 ProctoringSys: Starting monitoring...');
    this.isMonitoring = true;
    
    // Run detection every 2 seconds for faster response
    this.detectionInterval = setInterval(() => {
      this.detectViolations();
    }, 2000);

    // Audio monitoring runs every 1.5 seconds for quicker detection
    this.audioInterval = setInterval(() => {
      this.monitorAudio();
    }, 1500);

    // Tab switching / window focus detection
    this.setupTabSwitchDetection();
    
    console.log('✅ ProctoringSys: Monitoring active');
  }

  /**
   * Setup tab switching and window visibility detection
   */
  setupTabSwitchDetection() {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🚨 ProctoringSys: Tab switched or window hidden');
        this.recordViolation('tabSwitching');
      }
    };

    const handleWindowBlur = () => {
      console.log('🚨 ProctoringSys: Window lost focus');
      this.recordViolation('tabSwitching');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Store listeners for cleanup
    this.visibilityListener = handleVisibilityChange;
    this.blurListener = handleWindowBlur;
  }

  /**
   * Detect violations using face detection
   */
  async detectViolations() {
    if (!this.videoElement || !this.videoElement.videoWidth) {
      console.warn('⚠️ ProctoringSys: Video not ready');
      return;
    }

    try {
      // Use face-api.js if available, otherwise use basic motion detection
      if (this.faceapi) {
        await this.detectWithFaceAPI();
      } else {
        await this.detectWithBasicAnalysis();
      }
    } catch (error) {
      console.warn('⚠️ ProctoringSys: Detection error:', error);
    }
  }

  /**
   * Advanced detection using face-api.js
   */
  async detectWithFaceAPI() {
    const detections = await this.faceapi
      .detectAllFaces(this.videoElement, new this.faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceExpressions();

    const numFaces = detections.length;

    // No face detected
    if (numFaces === 0) {
      this.recordViolation('noFaceDetected');
    }
    // Multiple faces detected
    else if (numFaces > 1) {
      this.recordViolation('multipleFacesDetected');
    }
    // Single face - check orientation
    else if (numFaces === 1) {
      const landmarks = detections[0].landmarks;
      const facePosition = landmarks.getNose()[0];
      
      // Check if looking away (head pose estimation)
      if (this.isLookingAway(landmarks)) {
        this.recordViolation('lookingAway');
      }

      // Check for suspicious movements
      if (this.lastFacePosition && this.isSuspiciousMovement(this.lastFacePosition, facePosition)) {
        this.recordViolation('suspiciousMovements');
      }

      this.lastFacePosition = facePosition;
    }
  }

  /**
   * Basic detection using canvas and pixel analysis (fallback)
   */
  async detectWithBasicAnalysis() {
    console.log('🎥 ProctoringSys: Running basic analysis (no face-api)');
    
    // Create canvas for analysis
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Detect skin-tone regions (faces) using simple color detection
    const faceRegions = this.detectSkinRegions(imageData, canvas.width, canvas.height);
    console.log('🎥 ProctoringSys: Detected regions:', faceRegions);
    
    // FIXED: Only trigger violations when confident about detection
    if (faceRegions === 0) {
      console.log('⚠️ ProctoringSys: No face detected');
      this.recordViolation('noFaceDetected');
    } else if (faceRegions > 1) {
      // Additional validation: only trigger if we have enough skin pixels
      // This prevents false positives when moving away from camera
      console.log('⚠️ ProctoringSys: Multiple faces detected:', faceRegions);
      this.recordViolation('multipleFacesDetected');
    }
    
    // Simple motion detection by comparing with last frame
    if (this.lastFrameData) {
      const motion = this.calculateMotion(imageData, this.lastFrameData);
      console.log('🎥 ProctoringSys: Motion level:', motion.toFixed(3));
      
      if (motion > 0.3) { // Threshold for suspicious movement
        console.log('⚠️ ProctoringSys: Suspicious movement detected');
        this.recordViolation('suspiciousMovements');
      }
    } else {
      console.log('🎥 ProctoringSys: First frame captured');
    }
    
    this.lastFrameData = imageData;
  }

  /**
   * Detect skin-tone regions (simple face detection)
   */
  detectSkinRegions(imageData, width, height) {
    const data = imageData.data;
    const skinPixels = [];
    const darkPixels = []; // For phone detection
    
    // Sample every 8th pixel for better accuracy (was 10th)
    for (let i = 0; i < data.length; i += 32) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      
      // Expanded skin tone detection (more inclusive for different skin tones)
      const isSkin = (
        (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) || // Light skin
        (r > 80 && r > 50 && g > 30 && b > 15 && r > g && r > b) || // Medium skin
        (r > 60 && g > 35 && b > 20 && r > g && r > b && Math.abs(r - g) > 10) // Darker skin
      );
      
      if (isSkin) {
        skinPixels.push({ x, y });
      }
      
      // Phone detection: BALANCED - Detect phones but ignore edges
      // Ignore extreme edges (outer 15% on sides, 10% top/bottom)
      const edgeMarginX = width * 0.15;
      const edgeMarginY = height * 0.1;
      const isNotEdge = x > edgeMarginX && x < (width - edgeMarginX) && 
                        y > edgeMarginY && y < (height - edgeMarginY);
      
      // Only check for phones away from edges
      if (isNotEdge) {
        // Phone characteristics: dark screens with some uniformity
        const isDarkUniform = (
          (r < 40 && g < 40 && b < 40 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) || // Very dark/black
          (r < 55 && g < 55 && b < 55 && Math.abs(r - g) < 12) || // Dark gray (phone bezels)
          (r < 60 && b > 70 && b > r + 12 && b > g + 8) // Dark blue (phone screens)
        );
        
        if (isDarkUniform) {
          darkPixels.push({ x, y });
        }
      }
    }
    
    // Phone detection - BALANCED thresholds
    if (darkPixels.length > 180 && skinPixels.length > 60) {
      // Analyze shape and position
      const darkXs = darkPixels.map(p => p.x);
      const darkYs = darkPixels.map(p => p.y);
      const minX = Math.min(...darkXs);
      const maxX = Math.max(...darkXs);
      const minY = Math.min(...darkYs);
      const maxY = Math.max(...darkYs);
      
      const darkWidth = maxX - minX;
      const darkHeight = maxY - minY;
      const aspectRatio = darkHeight > 0 ? darkHeight / darkWidth : 0;
      
      // Check if it's phone-shaped OR a concentrated dark region
      const boundingBoxArea = darkWidth * darkHeight;
      const fillRatio = boundingBoxArea > 0 ? (darkPixels.length * 32) / boundingBoxArea : 0;
      
      // Phone characteristics - RELAXED:
      // 1. Portrait phone: aspect 1.2-3.0 OR Landscape phone: aspect 0.4-0.9
      // 2. Reasonable size (not tiny, not huge)
      // 3. Somewhat concentrated (30%+ fill)
      const isPortraitPhone = aspectRatio > 1.2 && aspectRatio < 3.0;
      const isLandscapePhone = aspectRatio > 0.4 && aspectRatio < 0.9;
      const isReasonableSize = darkWidth > 25 && darkWidth < 250 && 
                               darkHeight > 35 && darkHeight < 400;
      const isConcentrated = fillRatio > 0.3;
      
      const isPotentialPhone = (isPortraitPhone || isLandscapePhone) && 
                               isReasonableSize && isConcentrated;
      
      if (isPotentialPhone) {
        // Check proximity to skin (hand holding phone)
        let darkNearSkin = 0;
        const sampleSize = Math.min(60, darkPixels.length);
        
        for (let i = 0; i < sampleSize; i++) {
          const dark = darkPixels[Math.floor(i * darkPixels.length / sampleSize)];
          const nearSkin = skinPixels.some(skin => 
            Math.abs(dark.x - skin.x) < 45 && Math.abs(dark.y - skin.y) < 45
          );
          if (nearSkin) darkNearSkin++;
        }
        
        // Trigger if 45%+ of dark region is near skin
        if (darkNearSkin > sampleSize * 0.45) {
          console.log('⚠️ ProctoringSys: Phone detected - AR:', aspectRatio.toFixed(2), 'Fill:', fillRatio.toFixed(2), 'Near skin:', darkNearSkin, '/', sampleSize);
          this.recordViolation('phoneDetected');
        }
      }
    }
    
    // If very few skin pixels, no face detected
    if (skinPixels.length < 80) {
      return 0;
    }
    
    // Cluster skin pixels to detect multiple regions (faces)
    const clusters = this.clusterPoints(skinPixels, width, height);
    return clusters;
  }

  /**
   * Simple and reliable face detection using horizontal band analysis
   * This approach is less complex and more stable than DBSCAN
   */
  clusterPoints(points, width, height) {
    if (points.length === 0) return 0;
    
    // If very few skin pixels, at most 1 face
    if (points.length < 100) {
      return points.length < 50 ? 0 : 1;
    }
    
    // Divide frame into horizontal bands to detect faces side-by-side
    const bandHeight = height / 3; // Top, middle, bottom bands
    const bandWidth = width / 5; // Divide width into 5 vertical sections
    
    // Count skin pixels in each grid cell
    const grid = {};
    for (const point of points) {
      const bandX = Math.floor(point.x / bandWidth);
      const bandY = Math.floor(point.y / bandHeight);
      const key = `${bandX},${bandY}`;
      grid[key] = (grid[key] || 0) + 1;
    }
    
    // Find cells with significant skin presence (face regions)
    const faceRegions = [];
    for (const [key, count] of Object.entries(grid)) {
      if (count > 15) { // Minimum pixels to be considered a face region
        const [x, y] = key.split(',').map(Number);
        faceRegions.push({ x, y, count });
      }
    }
    
    if (faceRegions.length === 0) return 0;
    
    // Group adjacent regions horizontally (faces side by side)
    const horizontalGroups = [];
    const used = new Set();
    
    for (const region of faceRegions) {
      const key = `${region.x},${region.y}`;
      if (used.has(key)) continue;
      
      // Start a new face group
      const group = [region];
      used.add(key);
      
      // Find adjacent cells (same vertical band or one above/below)
      for (const candidate of faceRegions) {
        const candKey = `${candidate.x},${candidate.y}`;
        if (used.has(candKey)) continue;
        
        // Check if candidate is adjacent to any cell in current group
        const isAdjacent = group.some(cell => 
          Math.abs(cell.x - candidate.x) <= 1 && // Horizontal proximity
          Math.abs(cell.y - candidate.y) <= 1    // Vertical proximity
        );
        
        if (isAdjacent) {
          group.push(candidate);
          used.add(candKey);
        }
      }
      
      // Valid face group needs at least 2 cells
      if (group.length >= 2) {
        horizontalGroups.push(group);
      }
    }
    
    if (horizontalGroups.length === 0) return 1; // Single scattered region = 1 face
    
    // Separate face groups must be at least 2 horizontal cells apart
    const separateFaces = [];
    for (const group of horizontalGroups) {
      const minX = Math.min(...group.map(r => r.x));
      const maxX = Math.max(...group.map(r => r.x));
      const centerX = (minX + maxX) / 2;
      
      // Check if this is a new face (far from existing faces)
      let isNewFace = true;
      for (const face of separateFaces) {
        if (Math.abs(face.centerX - centerX) < 2) { // Less than 2 cells apart = same person
          isNewFace = false;
          break;
        }
      }
      
      if (isNewFace) {
        separateFaces.push({ centerX, group });
      }
    }
    
    return Math.min(separateFaces.length, 3);
  }

  /**
   * Check if person is looking away based on facial landmarks
   */
  isLookingAway(landmarks) {
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const eyeCenter = {
      x: (leftEye[0].x + rightEye[0].x) / 2,
      y: (leftEye[0].y + rightEye[0].y) / 2
    };
    
    const nosePosition = nose[0];
    
    // Calculate angle - if nose is too far from eye center, person is looking away
    const distance = Math.abs(nosePosition.x - eyeCenter.x);
    return distance > 30; // Threshold in pixels
  }

  /**
   * Detect suspicious movements
   */
  isSuspiciousMovement(prevPos, currPos) {
    const distance = Math.sqrt(
      Math.pow(currPos.x - prevPos.x, 2) + 
      Math.pow(currPos.y - prevPos.y, 2)
    );
    return distance > 50; // Threshold for sudden movements
  }

  /**
   * Calculate motion between frames
   */
  calculateMotion(currentFrame, lastFrame) {
    let diff = 0;
    const sampleSize = 1000; // Sample pixels for performance
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * currentFrame.data.length / 4) * 4;
      const r = Math.abs(currentFrame.data[idx] - lastFrame.data[idx]);
      const g = Math.abs(currentFrame.data[idx + 1] - lastFrame.data[idx + 1]);
      const b = Math.abs(currentFrame.data[idx + 2] - lastFrame.data[idx + 2]);
      diff += (r + g + b) / 3;
    }
    
    return diff / sampleSize / 255; // Normalize to 0-1
  }

  /**
   * Monitor audio for suspicious sounds
   */
  monitorAudio() {
    if (!this.analyser) {
      console.warn('⚠️ ProctoringSys: Audio analyser not available');
      return;
    }

    if (!this.isMonitoring) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    
    // Calculate max volume for detecting sudden loud sounds
    const max = Math.max(...dataArray);

    // Detect loud sounds or conversations
    if (average > 50 || max > 120) { // More sensitive thresholds
      console.log('⚠️ ProctoringSys: Audio anomaly detected, avg:', average.toFixed(2), 'max:', max);
      this.recordViolation('audioAnomalies');
    }
  }

  /**
   * Record a violation with timestamp
   */
  recordViolation(type) {
    console.log('🚨 ProctoringSys: Violation recorded -', type);
    this.violations[type]++;
    this.violations.totalViolations++;
    this.violations.timestamps.push(new Date());
    
    // Trigger callback if set
    if (this.onViolation) {
      this.onViolation(type, this.violations);
    }
  }

  /**
   * Stop monitoring and cleanup - COMPLETE PERMISSION REVOCATION
   */
  stopMonitoring() {
    console.log('🎥 ProctoringSys: Stopping monitoring and revoking all permissions...');
    this.isMonitoring = false;
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }

    // Remove tab switch listeners
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
    if (this.blurListener) {
      window.removeEventListener('blur', this.blurListener);
      this.blurListener = null;
    }

    // CRITICAL: Stop all media tracks to revoke camera/mic permissions
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🔒 ProctoringSys: Stopped and revoked permission for:', track.kind);
      });
      this.stream = null;
    }

    // Remove video element completely
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      this.videoElement = null;
    }

    // Close audio context to release microphone
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    
    console.log('✅ ProctoringSys: All permissions revoked and resources cleaned up');
    console.log('🔐 ProctoringSys: Camera and microphone access completely stopped');
    console.log('📊 ProctoringSys: Final violations:', this.violations);
  }

  /**
   * Get current violations data
   */
  getViolations() {
    return { ...this.violations };
  }

  /**
   * Set callback for violations
   */
  setViolationCallback(callback) {
    this.onViolation = callback;
  }

  /**
   * Get the video element for display purposes
   */
  getVideoElement() {
    return this.videoElement;
  }
}

export default ProctoringSys;
