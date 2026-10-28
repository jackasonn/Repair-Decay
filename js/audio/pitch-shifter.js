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
    // Two overlapping, periodically wrapped read heads shift pitch without
    // ever changing the source's playbackRate or total output duration.
    this.windowSize = 1024;
    this.latency = 2048;
    this.delayFrames = this.latency + this.windowSize;
    this.bufferSize = 32768;
    this.inputBuffers = [
      new Float32Array(this.bufferSize),
      new Float32Array(this.bufferSize)
    ];
    this.writePosition = 0;
    this.outputPosition = 0;
    this.started = false;
    this.wasPitchActive = false;
    this.pitchPhase = 0;
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
      this.started = true;
    }

    // With no DETUNE or WARP active, read the delayed input unmodified.
    // This is the common, efficient path and keeps all stems in sync.
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
      this.pitchPhase = 0;
      this.wasPitchActive = false;
      return true;
    }

    // The old overlap-add algorithm restarted each grain at the unshifted
    // timeline position, which left the dominant output pitch effectively
    // unchanged. A pair of complementary windowed read heads uses a moving
    // delay instead: the derivative of each read position is 2^(cents/1200).
    // Periodic read-position wraps are hidden by the opposite head.
    if (!this.wasPitchActive) {
      this.pitchPhase = 0;
      this.wasPitchActive = true;
    }
    const windowSize = this.windowSize;
    const bufferSize = this.bufferSize;
    const readSample = (buffer, position) => {
      const index = Math.floor(position);
      const fraction = position - index;
      const first = ((index % bufferSize) + bufferSize) % bufferSize;
      const second = (first + 1) % bufferSize;
      return buffer[first] + (buffer[second] - buffer[first]) * fraction;
    };

    for (let i = 0; i < frames; i++) {
      const cents = pitchParam && pitchParam.length
        ? pitchParam[Math.min(i, pitchParam.length - 1)]
        : 0;
      const ratio = Math.pow(2, cents / 1200);
      this.pitchPhase += (ratio - 1) / windowSize;
      if (this.pitchPhase >= 1) this.pitchPhase -= 1;
      else if (this.pitchPhase < 0) this.pitchPhase += 1;

      const phase = this.pitchPhase;
      const otherPhase = phase < 0.5 ? phase + 0.5 : phase - 0.5;
      const weightA = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
      const weightB = 1 - weightA;
      // Centre both heads around the normal, fixed-latency read position.
      const positionA = this.outputPosition + (phase - 0.5) * windowSize;
      const positionB = this.outputPosition + (otherPhase - 0.5) * windowSize;

      for (let ch = 0; ch < outputChannels; ch++) {
        const buffer = this.inputBuffers[Math.min(ch, 1)];
        output[ch][i] =
          readSample(buffer, positionA) * weightA +
          readSample(buffer, positionB) * weightB;
      }
      this.outputPosition++;
    }

    return true;
  }
}

registerProcessor('pitch-shifter', PitchShiftProcessor);
