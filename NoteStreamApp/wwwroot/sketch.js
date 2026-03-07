let midiAccess = null;
let midiOutput = null;
let midiSelector;
let noteAnimations = [];
let currentNote = null;
let statusDiv;
let sseStatusDiv;
let eventSource; // SSE connection
let workflowInstanceId = null;
let startButton;
let terminateButton;
let pauseButton;
let resumeButton;
let allowButton;
let skipButton;
let playbackType = 'audio';
let selectedScore = Object.keys(MUSIC_SCORES)[0];

// Web Audio
let audioCtx = null;
let activeOscillators = {}; // keyed by midiNumber

// Audio analysis
let mic;
let fft;

const ANIMATION_CONFIG = {
  circleSize: 60,
  circleColor: 255,
  textSize: 16,
  speed: 2,
  maxAge: 180,
  startAlpha: 255,
  endAlpha: 0,
  minNoise: 1,
  maxNoise: 5
};

const MIDI_NOTE_MIN = 48;  // C3
const MIDI_NOTE_MAX = 84;  // C6
const MIDI_CHANNEL = 1;
const MIDI_VELOCITY = 120;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function setup() {
  createCanvas(windowWidth, windowHeight);

  initMIDI();
  createMIDISelector();
  createPlaybackTypeSelector();
  createScoreSelector();
  createStatusIndicator();
  createSSEStatusIndicator();
  createStartButton();
  createTerminateButton();
  createPauseButton();
  createResumeButton();
  createAllowButton();
  createSkipButton();
  initSSE();
  initAudio();
}

function draw() {
  background(0);
  frameRate(30);

  // Draw waveform overlay
  drawWaveform();

  updateNoteAnimations();
}

function initMIDI() {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
      .then(onMIDISuccess, onMIDIFailure);
  } else {
    console.error('Web MIDI API not supported in this browser');
    updateStatus('MIDI not supported', false);
  }
}

function onMIDISuccess(midi) {
  midiAccess = midi;
  console.log('MIDI Access obtained');
  const outputs = Array.from(midiAccess.outputs.values());

  if (outputs.length > 0) {
    midiOutput = outputs[0];
    console.log('MIDI Output:', midiOutput.name);
    updateStatus(`Connected: ${midiOutput.name}`, true);
    populateMIDISelector(outputs);
    playbackType = 'midi';
    updatePlaybackTypeSelector();
  } else {
    console.warn('No MIDI outputs available');
    updateStatus('No MIDI devices found', false);
  }

  outputs.forEach((output, index) => {
    console.log(`Output ${index}: ${output.name}`);
  });
}

function onMIDIFailure(error) {
  console.error('Failed to get MIDI access:', error);
  updateStatus('MIDI access denied', false);
}

// ============================================
// Web Audio API
// ============================================
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function midiToFrequency(midiNumber) {
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

function playNoteWebAudio(midiNumber) {
  initAudioContext();
  if (activeOscillators[midiNumber]) return; // already playing

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(midiToFrequency(midiNumber), audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();

  activeOscillators[midiNumber] = { osc, gainNode };
}

function stopNoteWebAudio(midiNumber) {
  const entry = activeOscillators[midiNumber];
  if (!entry) return;

  const { osc, gainNode } = entry;
  // Short fade-out to avoid clicks
  gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
  osc.stop(audioCtx.currentTime + 0.1);
  delete activeOscillators[midiNumber];
}

function sendNoteOn(midiNumber) {
  if (!midiOutput) {
    console.error('No MIDI output available');
    return;
  }

  // Calculate MIDI status byte for Note On
  const noteOnStatus = 0x90 | (MIDI_CHANNEL - 1);

  midiOutput.send([noteOnStatus, midiNumber, MIDI_VELOCITY]);
  console.log(`Note On: Channel ${MIDI_CHANNEL}, Note ${midiNumber} (${midiNumberToNoteName(midiNumber)}), Velocity ${MIDI_VELOCITY}`);

  currentNote = midiNumber;
}

function sendNoteOff(midiNumber) {
  if (!midiOutput) {
    console.error('No MIDI output available');
    return;
  }

  // Calculate MIDI status byte for Note Off
  const noteOffStatus = 0x80 | (MIDI_CHANNEL - 1);

  midiOutput.send([noteOffStatus, midiNumber, 0]);
  console.log(`Note Off: Channel ${MIDI_CHANNEL}, Note ${midiNumber} (${midiNumberToNoteName(midiNumber)})`);
}

function midiNumberToNoteName(midiNumber) {
  const octave = floor(midiNumber / 12) - 1;
  const noteName = NOTE_NAMES[midiNumber % 12];
  return noteName + octave;
}

function noteNameToMidiNumber(noteName) {
  // Parse note name like "C3", "D#4", etc.
  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) {
    console.error('Invalid note name:', noteName);
    return null;
  }

  const note = match[1];
  const octave = parseInt(match[2]);

  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) {
    console.error('Invalid note:', note);
    return null;
  }

  return (octave + 1) * 12 + noteIndex;
}

function createStatusIndicator() {
  statusDiv = createDiv('Connecting to MIDI...');
  statusDiv.class('status-indicator');
  statusDiv.position(20, 20);
}

function updateStatus(message, isConnected) {
  if (statusDiv) {
    statusDiv.html(message);
    if (isConnected) {
      statusDiv.class('status-indicator status-connected');
    } else {
      statusDiv.class('status-indicator status-disconnected');
    }
  }
}

function createSSEStatusIndicator() {
  sseStatusDiv = createDiv('Connecting to SSE...');
  sseStatusDiv.class('sse-status-indicator');
  sseStatusDiv.position(windowWidth / 2 + 20, 20);
}

function updateSSEStatus(message, isConnected) {
  if (sseStatusDiv) {
    sseStatusDiv.html(message);
    if (isConnected) {
      sseStatusDiv.class('sse-status-indicator status-connected');
    } else {
      sseStatusDiv.class('sse-status-indicator status-disconnected');
    }
  }
}

function createStartButton() {
  startButton = createButton('Start');
  startButton.position(20, 100);
  startButton.class('play-button');
  startButton.mousePressed(onStartButtonPressed);
}

function createTerminateButton() {
  terminateButton = createButton('Stop');
  terminateButton.position(120, 100);
  terminateButton.class('terminate-button');
  terminateButton.attribute('disabled', '');
  terminateButton.mousePressed(onTerminatePressed);
}

function createPauseButton() {
  pauseButton = createButton('Pause');
  pauseButton.position(250, 100);
  pauseButton.class('pause-button');
  pauseButton.attribute('disabled', '');
  pauseButton.mousePressed(onPausePressed);
}

function createResumeButton() {
  resumeButton = createButton('Resume');
  resumeButton.position(360, 100);
  resumeButton.class('resume-button');
  resumeButton.attribute('disabled', '');
  resumeButton.mousePressed(onResumePressed);
}

function createAllowButton() {
  allowButton = createButton('Allow');
  allowButton.position(480, 100);
  allowButton.class('allow-button');
  allowButton.attribute('disabled', '');
  allowButton.mousePressed(() => onApprovePressed(true));
}

function createSkipButton() {
  skipButton = createButton('Skip');
  skipButton.position(580, 100);
  skipButton.class('skip-button');
  skipButton.attribute('disabled', '');
  skipButton.mousePressed(() => onApprovePressed(false));
}

function onTerminatePressed() {
  if (!workflowInstanceId) {
    console.error('No workflow instanceId available');
    return;
  }

  const url = `http://localhost:5500/terminate/${workflowInstanceId}`;
  fetch(url, { method: 'POST' })
    .then(response => {
      if (response.ok) {
        console.log('Workflow terminated for instanceId:', workflowInstanceId);
        startButton.removeAttribute('disabled');
        if (pauseButton) pauseButton.attribute('disabled', '');
        if (resumeButton) resumeButton.attribute('disabled', '');
        if (allowButton) allowButton.attribute('disabled', '');
        if (skipButton) skipButton.attribute('disabled', '');
        terminateButton.attribute('disabled', '');
      } else {
        console.error('Failed to terminate workflow:', response.status);
      }
    })
    .catch(error => {
      console.error('Error terminating workflow:', error);
    });
}

function onApprovePressed(approve) {
  if (!workflowInstanceId) {
    console.error('No workflow instanceId available');
    return;
  }

  const url = `http://localhost:5500/approve/${workflowInstanceId}/${approve}`;
  fetch(url, { method: 'POST' })
    .then(response => {
      if (response.ok) {
        console.log(`Workflow approve (${approve}) sent for instanceId:`, workflowInstanceId);
      } else {
        console.error('Failed to send approve:', response.status);
      }
    })
    .catch(error => {
      console.error('Error sending approve:', error);
    });
}

function onPausePressed() {
  if (!workflowInstanceId) {
    console.error('No workflow instanceId available');
    return;
  }

  const url = `http://localhost:5500/pause/${workflowInstanceId}`;
  fetch(url, { method: 'POST' })
    .then(response => {
      if (response.ok) {
        console.log('Workflow paused for instanceId:', workflowInstanceId);
      } else {
        console.error('Failed to pause workflow:', response.status);
      }
    })
    .catch(error => {
      console.error('Error pausing workflow:', error);
    });
}

function onResumePressed() {
  if (!workflowInstanceId) {
    console.error('No workflow instanceId available');
    return;
  }

  const url = `http://localhost:5500/resume/${workflowInstanceId}`;
  fetch(url, { method: 'POST' })
    .then(response => {
      if (response.ok) {
        console.log('Workflow resumed for instanceId:', workflowInstanceId);
      } else {
        console.error('Failed to resume workflow:', response.status);
      }
    })
    .catch(error => {
      console.error('Error resuming workflow:', error);
    });
}

function onStartButtonPressed() {
  noteAnimations = [];
  initAudioContext();

  const startUrl = 'http://localhost:5500/startmusic';
  fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getMusicScoreByTitle(selectedScore))
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        console.error('Failed to start music workflow:', response.status);
      }
    })
    .then(data => {
      if (data && data.instanceId) {
        workflowInstanceId = data.instanceId;
        console.log('Music workflow started with instanceId:', workflowInstanceId);
        startButton.attribute('disabled', '');
        if (terminateButton) terminateButton.removeAttribute('disabled');
        if (pauseButton) pauseButton.removeAttribute('disabled');
        if (resumeButton) resumeButton.removeAttribute('disabled');
        if (allowButton) allowButton.removeAttribute('disabled');
        if (skipButton) skipButton.removeAttribute('disabled');
      }
    })
    .catch(error => {
      console.error('Error starting music workflow:', error);
    });
}

// ============================================
// Server-Sent Events (SSE)
// ============================================
function initSSE() {
  const sseUrl = 'http://localhost:5051/sse';
  console.log('Connecting to SSE:', sseUrl);

  eventSource = new EventSource(sseUrl);

  eventSource.onopen = function() {
    console.log('SSE connection opened');
    updateSSEStatus('SSE Connected', true);
  };

  eventSource.addEventListener('note', function(event) {
    try {
      const data = JSON.parse(event.data);
      //console.log('SSE note received:', data);
      handleSSENote(data);
    } catch (error) {
      console.error('Error parsing SSE note data:', error);
    }
  });

  eventSource.addEventListener('instanceId', function(event) {
    try {
      workflowInstanceId = JSON.parse(event.data);
      //console.log('Received workflow instanceId:', workflowInstanceId);
    } catch (error) {
      console.error('Error parsing SSE instanceId data:', error);
    }
  });

  eventSource.onerror = function(error) {
    console.error('SSE connection error:', error);
    if (eventSource.readyState === EventSource.CLOSED) {
      console.log('SSE connection closed, attempting to reconnect...');
      updateSSEStatus('SSE Disconnected', false);
    } else if (eventSource.readyState === EventSource.CONNECTING) {
      updateSSEStatus('SSE Connecting...', false);
    } else {
      updateSSEStatus('SSE Error', false);
    }
  };
}

function handleSSENote(data) {
  if (!data.NoteName || !data.DurationMs || !data.Type) {
    console.error('Invalid SSE data, missing NoteName, DurationMs, or Type:', data);
    return;
  }

  const midiNumber = noteNameToMidiNumber(data.NoteName);
  if (midiNumber === null) return;

  //console.log(`Playing SSE note: ${data.NoteName} (MIDI ${midiNumber}) for ${data.DurationMs}ms via ${data.Type}`);

  if (data.Type === 'audio') {
    playNoteWebAudio(midiNumber);
    const anim = createNoteAnimation(data.Id, data.NoteName, midiNumber);

    setTimeout(() => {
      stopNoteWebAudio(midiNumber);
      anim.release();
    }, data.DurationMs);

  } else if (data.Type === 'midi') {
    sendNoteOn(midiNumber);
    const anim = createNoteAnimation(data.Id, data.NoteName, midiNumber);

    setTimeout(() => {
      sendNoteOff(midiNumber);
      anim.release();
    }, data.DurationMs);
  }
}

function initAudio() {
  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(0, 256);
  fft.setInput(mic);

  console.log('Microphone and FFT analyzer initialized');
}

function drawWaveform() {
  if (!fft) return;

  let waveform = fft.waveform();

  push();
  noFill();
  stroke(255);
  strokeWeight(2);

  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length - 1, 0, windowWidth);
    let y = map(waveform[i], -1, 1, windowHeight, 0);
    vertex(x, y);
  }
  endShape();

  pop();
}

function createMIDISelector() {
  midiSelector = createSelect();
  midiSelector.position(20, 60);
  midiSelector.class('midi-selector');
  midiSelector.option('No MIDI devices');
  midiSelector.disable();
  midiSelector.changed(onMIDIDeviceChange);
}

function populateMIDISelector(outputs) {
  if (!midiSelector) return;

  // Clear existing options
  midiSelector.html('');

  // Add all MIDI outputs to the selector
  outputs.forEach((output, index) => {
    midiSelector.option(output.name, index);
  });

  // Enable the selector
  midiSelector.enable();

  // Prefer GRIND if available, otherwise select the first device
  const grindIndex = outputs.findIndex(output => output.name === 'GRIND');
  const selectedIndex = grindIndex !== -1 ? grindIndex : 0;
  midiSelector.selected(selectedIndex);
  midiOutput = outputs[selectedIndex];
  updateStatus(`Connected: ${midiOutput.name}`, true);
}

function onMIDIDeviceChange() {
  const selectedIndex = parseInt(midiSelector.value());
  const outputs = Array.from(midiAccess.outputs.values());

  if (selectedIndex >= 0 && selectedIndex < outputs.length) {
    midiOutput = outputs[selectedIndex];
    console.log('Switched to MIDI Output:', midiOutput.name);
    updateStatus(`Connected: ${midiOutput.name}`, true);
  }
}

let playbackTypeSelector;

function createPlaybackTypeSelector() {
  playbackTypeSelector = createSelect();
  playbackTypeSelector.position(340, 60);
  playbackTypeSelector.class('playback-type-selector');
  playbackTypeSelector.option('midi');
  playbackTypeSelector.option('audio');
  playbackTypeSelector.selected(playbackType);
  playbackTypeSelector.changed(() => {
    playbackType = playbackTypeSelector.value();
  });
}

function updatePlaybackTypeSelector() {
  if (playbackTypeSelector) {
    playbackTypeSelector.selected(playbackType);
  }
}

function createScoreSelector() {
  let selector = createSelect();
  selector.position(460, 60);
  selector.class('score-selector');
  Object.keys(MUSIC_SCORES).forEach(title => {
    selector.option(title);
  });
  selector.selected(selectedScore);
  selector.changed(() => {
    selectedScore = selector.value();
  });
}

class NoteAnimation {
  constructor(id, noteName, x, y, midiNumber) {
    this.id = id;
    this.note = noteName;
    this.midiNumber = midiNumber;
    this.x = x;
    this.y = y;
    this.targetY = 0;
    this.alpha = ANIMATION_CONFIG.startAlpha;
    this.circleSize = ANIMATION_CONFIG.circleSize;
    this.speed = ANIMATION_CONFIG.speed;
    this.age = 0;
    this.maxAge = ANIMATION_CONFIG.maxAge;
    this.isActive = true; // Note is being held
    this.releaseAge = null; // Age when note was released
    this.growingSize = this.circleSize; // Growing ring starts at circle size
    this.noiseAmount = map(x, 0, windowWidth, ANIMATION_CONFIG.minNoise, ANIMATION_CONFIG.maxNoise);
  }

  update() {
    this.y -= this.speed;
    this.age++;

    this.growingSize += 1;

    // Only start fading after note is released
    if (!this.isActive) {
      if (this.releaseAge === null) {
        this.releaseAge = this.age;
      }
      const fadeAge = this.age - this.releaseAge;
      this.alpha = map(fadeAge, 0, this.maxAge, ANIMATION_CONFIG.startAlpha, ANIMATION_CONFIG.endAlpha);
    }
  }

  release() {
    this.isActive = false;
  }

  display() {
    push();

    let offsetX = random(-this.noiseAmount, this.noiseAmount);
    let offsetY = random(-this.noiseAmount, this.noiseAmount);
    let drawX = this.x + offsetX;
    let drawY = this.y + offsetY;

    fill(ANIMATION_CONFIG.circleColor, this.alpha);
    stroke(ANIMATION_CONFIG.circleColor, this.alpha);
    strokeWeight(2);
    circle(this.x, this.y, this.circleSize);

    // Growing ring
    noFill();
    stroke(ANIMATION_CONFIG.circleColor, this.alpha);
    strokeWeight(2);
    circle(drawX, drawY, this.growingSize);

    noStroke();
    fill(0, this.alpha);
    textAlign(CENTER, CENTER);
    textSize(ANIMATION_CONFIG.textSize);
    text(this.note, this.x, this.y);

    pop();
  }

  isDead() {
    // Only die if released and faded out, or if off screen
    if (this.y < -this.circleSize) return true;
    if (!this.isActive && this.releaseAge !== null) {
      const fadeAge = this.age - this.releaseAge;
      return fadeAge >= this.maxAge;
    }
    return false;
  }
}

function createNoteAnimation(id, noteName, midiNumber) {
  // Calculate X position based on MIDI note number within video area
  const padding = ANIMATION_CONFIG.circleSize / 2;
  let x = map(midiNumber, MIDI_NOTE_MIN, MIDI_NOTE_MAX,
              0 + padding,
              windowWidth - padding);

  let y = windowHeight - ANIMATION_CONFIG.circleSize;

  const anim = new NoteAnimation(id, noteName, x, y, midiNumber);
  noteAnimations.push(anim);
  return anim;
}

function updateNoteAnimations() {
  // Update and display all animations
  for (let i = noteAnimations.length - 1; i >= 0; i--) {
    noteAnimations[i].update();
    noteAnimations[i].display();

    // Remove dead animations
    if (noteAnimations[i].isDead()) {
      noteAnimations.splice(i, 1);
    }
  }
}
