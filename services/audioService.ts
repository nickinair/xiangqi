// Simple Web Audio API synthesizer for game sounds without external assets

const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

export const initAudio = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Audio resume failed", e));
  }
};

export const playSelectSound = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // High pitched short "click"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.05);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playMoveSound = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    
    // "Thud" / "Clack" sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.1);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playCheckSound = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    
    // Double tone alert
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t); // A4
    osc.frequency.setValueAtTime(554.37, t + 0.15); // C#5
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    
    // Lowpass filter to soften the sawtooth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.6);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playWinSound = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    
    // Major chord arpeggio: C4, E4, G4, C5 (Fanfare)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 1.0);
    });
  } catch (e) {
    // Ignore audio errors
  }
};