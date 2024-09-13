// https://www.analog.com/media/en/analog-dialogue/volume-54/number-2/phased-array-antenna-patterns-part-1-linear-array-beam-characteristics-and-array-factor.pdf

document.addEventListener("DOMContentLoaded", function() {
    // set up the canvas
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
  
    // Expose variables and functions globally
    window.animationRunning = false;
  
    window.setCanvasSize = function() {
      const mockupTop = document.querySelector('.mockup .part.top');
      const rect = mockupTop.getBoundingClientRect();
  
      canvas.width = rect.width * 0.92;  // 92% width like the original video
      canvas.height = rect.height * 0.80;  // 80% height
  
      // Reinitialize sources with new canvas size
      initSources();
    };
  
    // default simulation values
    let wavelength = 100;      // pixels
    let frequency = 0.02;      // cycles / frame
    let amplitude = 1;         // pixels
    let numSources = 5;     
    let spacing = 50;          // pixels
    let blockLowerHalf = true; // blocking the lower part by default
    let time = 0;              // frame count
    let sources = [];          // store the source nodes
    
    
    function initSources() {
      sources = [];
      const startX = (canvas.width - (numSources - 1) * spacing) / 2;
      const yPosition = canvas.height - canvas.height * 0.1;
      for (let i = 0; i < numSources; i++) {
        const x = startX + i * spacing;
        sources.push(new Source(x, yPosition));
      }
    }
  
    class Source {
      constructor(x, y, phase = 0) {
        this.x = x;
        this.y = y;
        this.phase = phase; // phase offset for beam steering
      }
      getColor() {
        const phaseShift = Math.sin(this.phase - time * 0.05); // Calculate phase shift based on time
        const intensity = (phaseShift + 1) / 2; // Normalize between 0 and 1
        const r = Math.floor(intensity * 255); // Map intensity to red color channel
        const b = 255 - r; // Complementary blue color for contrast
        return `rgb(${r}, 0, ${b})`;
      }
    }
  
    // Do not initialize sources here; they will be initialized after canvas size is set
    // initSources();
  
    function waveFunction(x, y, source) {
      // zero out anything below the sources if bottom blocked
      if (blockLowerHalf && y > canvas.height - canvas.height * 0.1) {
        return 0;
      }
  
      // calculate the distance from source to (x, y)
      const dx = x - source.x;
      const dy = y - source.y;
      const r = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const k = (2 * Math.PI) / wavelength;  // angular wave number
      const omega = 2 * Math.PI * frequency; // angular frequency
      return amplitude * Math.sin(k * r - omega * time + source.phase);
    }
  
    function steerBeam(thetaDegrees) {
      // beam steering with phase shift calculation for far field
      const theta = (thetaDegrees * Math.PI) / 180;
      const k = (2 * Math.PI) / wavelength;  // angular wave number
      const deltaPhi = (2 * Math.PI * spacing * Math.sin(theta)) / wavelength;
  
      for (let n = 0; n < sources.length; n++) {
        sources[n].phase = n * deltaPhi;
      }
    }
  
    // HSV to RGB conversion (for visualizing wave intensities)
    function HSVtoRGB(h, s, v) {
      let r, g, b;
      let i = Math.floor(h * 6);
      let f = h * 6 - i;
      let p = v * (1 - s);
      let q = v * (1 - f * s);
      let t = v * (1 - (1 - f) * s);
  
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
    }
  
    // Expose animate function globally
    window.animate = function() {
      if (!window.animationRunning) return;
  
      if (canvas.style.display !== 'none') {
        time += 1;
        draw();
      }
      requestAnimationFrame(animate);
    };
  
    // Do not start the animation loop immediately
    // animate(); // Remove or comment out this line
  
    // Draw function
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      const step = 4;
  
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          let totalAmplitude = 0;
  
          for (const source of sources) {
            totalAmplitude += waveFunction(x, y, source);
          }
  
          const normalizedAmplitude = (totalAmplitude + amplitude * sources.length) / (2 * amplitude * sources.length);
          const gamma = 0.7;
          const adjustedAmplitude = Math.pow(normalizedAmplitude, gamma);
          const hue = (1 - adjustedAmplitude) * 240;
          const rgb = HSVtoRGB(hue / 360, 1, 1);
  
          for (let i = 0; i < step; i++) {
            for (let j = 0; j < step; j++) {
              if (x + i < canvas.width && y + j < canvas.height) {
                const index = ((x + i) + (y + j) * canvas.width) * 4;
                data[index] = rgb.r;
                data[index + 1] = rgb.g;
                data[index + 2] = rgb.b;
                data[index + 3] = 255;
              }
            }
          }
        }
      }
  
      ctx.putImageData(imageData, 0, 0);
      drawAxes();
  
      // Draw sources as circles
      for (const source of sources) {
        drawSource(source);
      }
  
      // Draw the current beam direction arrow (black arrow based on angle)
      const centerX = canvas.width / 2;
      const centerY = canvas.height - canvas.height * 0.1;
  
      const beamAngle = parseFloat(angleInput.value);
      const beamArrowColor = 'black';
  
      const angleRadians = (beamAngle * Math.PI) / 180;
      const beamLength = 50;
  
      const beamToX = centerX + beamLength * Math.sin(angleRadians);
      const beamToY = centerY - beamLength * Math.cos(angleRadians); // Calculate the end of the arrow
  
      drawArrow(ctx, centerX, centerY, beamToX, beamToY, beamArrowColor);
  
      // Add label for current beam direction
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText(`θ = ${beamAngle}°`, beamToX + 5, beamToY + 15);
  
      // Draw a line to indicate the blocked region (if applicable)
      if (blockLowerHalf) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - canvas.height * 0.1);
        ctx.lineTo(canvas.width, canvas.height - canvas.height * 0.1);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  
    // Draw source as a circle with color based on its phase
    function drawSource(source) {
      ctx.beginPath();
      ctx.arc(source.x, source.y, 10, 0, Math.PI * 2); // Draw circle at source position
      ctx.fillStyle = source.getColor(); // Get color based on phase
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.stroke(); // Outline the source
    }
  
    // Arrow drawing function
    function drawArrow(ctx, fromX, fromY, toX, toY, color) {
      const headLength = 10; // Length of the arrowhead
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
  
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
  
      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
  
      // Draw arrowhead
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(toX, toY);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  
    // Helper function to draw axes
    function drawAxes() {
      ctx.strokeStyle = 'gray';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - canvas.height * 0.1);
      ctx.lineTo(canvas.width, canvas.height - canvas.height * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
    }
  
    // Ensure controls are properly initialized
    function initializeControls() {
      // Angle input and beam steering
      window.angleInput = document.getElementById('angleInput');
      const angleValueDisplay = document.getElementById('angleValue');
      angleInput.addEventListener('input', (e) => {
        const angle = parseFloat(e.target.value);
        angleValueDisplay.textContent = `${angle}°`;
        steerBeam(angle);
      });
  
      // Initialize other controls if they exist
      // Wavelength control
      window.wavelengthInput = document.getElementById('wavelengthInput');
      const wavelengthValueDisplay = document.getElementById('wavelengthValue');
      wavelengthInput.addEventListener('input', (e) => {
        wavelength = parseFloat(e.target.value);
        wavelengthValueDisplay.textContent = wavelength;
      });
  
      // Frequency control
      window.frequencyInput = document.getElementById('frequencyInput');
      const frequencyValueDisplay = document.getElementById('frequencyValue');
      frequencyInput.addEventListener('input', (e) => {
        frequency = parseFloat(e.target.value);
        frequencyValueDisplay.textContent = frequency;
      });
  
      // Amplitude control
      // window.amplitudeInput = document.getElementById('amplitudeInput');
      // const amplitudeValueDisplay = document.getElementById('amplitudeValue');
      // amplitudeInput.addEventListener('input', (e) => {
      //   amplitude = parseFloat(e.target.value);
      //   amplitudeValueDisplay.textContent = amplitude;
      // });
  
      // Number of sources control
      window.numSourcesInput = document.getElementById('numSourcesInput');
      const numSourcesValueDisplay = document.getElementById('numSourcesValue');
      numSourcesInput.addEventListener('input', (e) => {
        numSources = parseInt(e.target.value);
        numSourcesValueDisplay.textContent = numSources;
        initSources(); // Reinitialize sources when the number changes
      });
  
      // Spacing control
      window.spacingInput = document.getElementById('spacingInput');
      const spacingValueDisplay = document.getElementById('spacingValue');
      spacingInput.addEventListener('input', (e) => {
        spacing = parseInt(e.target.value);
        spacingValueDisplay.textContent = spacing;
        initSources(); // Reinitialize sources when spacing changes
      });
  
      // Block lower half toggle
      const toggleButton = document.getElementById('toggleLowerHalf');
      toggleButton.addEventListener('click', () => {
        blockLowerHalf = !blockLowerHalf;
        toggleButton.textContent = blockLowerHalf ? 'Enable Lower Half' : 'Disable Lower Half';
      });
  
      // Update initial values
      angleValueDisplay.textContent = `${angleInput.value}°`;
      wavelengthValueDisplay.textContent = wavelengthInput.value;
      frequencyValueDisplay.textContent = frequencyInput.value;
      // amplitudeValueDisplay.textContent = amplitudeInput.value;
      numSourcesValueDisplay.textContent = numSourcesInput.value;
      spacingValueDisplay.textContent = spacingInput.value;
    }
  
    // Initialize controls when the canvas becomes visible
    initializeControls();
  
    // Listen for window resize to adjust canvas size
    window.addEventListener('resize', () => {
      if (canvas.style.display === 'block') {
        setCanvasSize();
      }
    });
  });