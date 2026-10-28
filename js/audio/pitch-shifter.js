class PitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'pitchCents',
      defaultValue: 0,
      minValue: -1200,
      maxValue: 1200,
      automationRate: 'a-rate'
    }];
  }

  constructor() {
    super();
    this.grainSize = 1024;
    this.hop = 256;
    this.latency = 2048;
    this.delayFrames = this.latency + this.grainSize;
    this.bufferSize = 32768;
    this.inputBuffers = [
      new Float32Array(this.bufferSize),
      new Float32Array(this.bufferSize)
    ];
    this.writePosition = 0;
    this.outputPosition = 0;
    this.analysisPosition = 0;
    this.started = false;
    this.wasPitchActive = false;
    this.grains = [];

    // The Hann window is constant. Precompute it once instead of calling cos()
    // for each sample, grain and channel in the real-time audio callback.
    this.window = new Float32Array(this.grainSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (this.grainSize - 1));
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output.length) return true;

    const inputChannels = input.length;
    const outputChannels = output.length;
    const frames = output[0].length;
    const pitchParam = parameters.pitchCents;

    // Keep a rolling input buffer so that neutral and shifted signals share a
    // fixed delay and stay aligned with other instrument stems.
    for (let i = 0; i < frames; i++) {
      for (let ch = 0; ch < 2; ch++) {
        const channel = inputChannels ? input[Math.min(ch, inputChannels - 1)] : null;
        this.inputBuffers[ch][this.writePosition % this.bufferSize] = channel ? (channel[i] || 0) : 0;
      }
      this.writePosition++;
    }

    if (!this.started) {
      if (this.writePosition < this.delayFrames) {
        for (let ch = 0; ch < outputChannels; ch++) output[ch].fill(0);
        return true;
      }
      this.analysisPosition = this.writePosition - this.delayFrames;
      this.started = true;
    }

    // With no detune or warp active, avoid grain synthesis entirely. This is
    // the common case for most of playback and is much cheaper for the CPU.
    let pitchActive = false;
    if (pitchParam && pitchParam.length) {
      for (let i = 0; i < pitchParam.length; i++) {
        if (Math.abs(pitchParam[i]) > 0.05) {
          pitchActive = true;
          break;
        }
      }
    }

    if (!pitchActive) {
      for (let i = 0; i < frames; i++) {
        const readIndex = this.outputPosition % this.bufferSize;
        for (let ch = 0; ch < outputChannels; ch++) {
          output[ch][i] = this.inputBuffers[Math.min(ch, 1)][readIndex];
        }
        this.outputPosition++;
      }
      this.analysisPosition = this.outputPosition;
      this.grains.length = 0;
      this.wasPitchActive = false;
      return true;
    }

    // If pitch shifting becomes active after a neutral section, align its first
    // grain to the next hop boundary so its read head remains continuous.
    if (!this.wasPitchActive) {
      const toNextHop = (this.hop - (this.outputPosition % this.hop)) % this.hop;
      this.analysisPosition = this.outputPosition + toNextHop;
      this.wasPitchActive = true;
    }

    for (let i = 0; i < frames; i++) {
      const cents = pitchParam && pitchParam.length
        ? pitchParam[Math.min(i, pitchParam.length - 1)]
        : 0;
      const ratio = Math.pow(2, cents / 1200);

      if (this.outputPosition % this.hop === 0) {
        this.grains.push({
          outStart: this.outputPosition,
          inStart: this.analysisPosition,
          ratio
        });
        this.analysisPosition += this.hop;
      }

      // The grain list is chronological and remains small; retire expired
      // grains from the front, instead of splicing from inside the sample loop.
      while (this.grains.length &&
             this.outputPosition - this.grains[0].outStart >= this.grainSize) {
        this.grains.shift();
      }

      for (let ch = 0; ch < outputChannels; ch++) {
        let sample = 0;
        const buffer = this.inputBuffers[Math.min(ch, 1)];
        for (let g = 0; g < this.grains.length; g++) {
          const grain = this.grains[g];
          const age = this.outputPosition - grain.outStart;
          if (age < 0 || age >= this.grainSize) continue;

          const sourcePosition = grain.inStart + age * grain.ratio;
          const index0 = Math.floor(sourcePosition);
          const fraction = sourcePosition - index0;
          const a = buffer[((index0 % this.bufferSize) + this.bufferSize) % this.bufferSize];
          const b = buffer[(((index0 + 1) % this.bufferSize) + this.bufferSize) % this.bufferSize];
          sample += (a + (b - a) * fraction) * this.window[age];
        }
        output[ch][i] = sample * 0.5;
      }
      this.outputPosition++;
    }

    return true;
  }
}

registerProcessor('pitch-shifter', PitchShiftProcessor);
