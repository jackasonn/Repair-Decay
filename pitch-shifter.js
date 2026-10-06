class PitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{name:'pitchCents',defaultValue:0,minValue:-1200,maxValue:1200,automationRate:'a-rate'}]
  }

  constructor() {
    super();
    this.grainSize=1024;
    this.hop=256;
    this.latency=2048;
    this.bufferSize=32768;
    this.inputBuffers=[new Float32Array(this.bufferSize),new Float32Array(this.bufferSize)];
    this.writePosition=0;
    this.outputPosition=0;
    this.analysisPosition=0;
    this.started=false;
    this.grains=[];
    this.port.onmessage=e=>{
      if(e.data&&typeof e.data.pitchCents==='number')this.pitchCents=e.data.pitchCents;
    };
  }

  process(inputs,outputs,parameters) {
    const input=inputs[0];
    const output=outputs[0];
    if(!output.length)return true;

    const pitchParam=parameters.pitchCents;
    const inputChannels=input.length;
    const outputChannels=output.length;
    const frames=output[0].length;

    for(let i=0;i<frames;i++) {
      for(let ch=0;ch<2;ch++) {
        const value=inputChannels?input[Math.min(ch,inputChannels-1)]?.[i]||0:0;
        this.inputBuffers[ch][this.writePosition%this.bufferSize]=value;
      }
      this.writePosition++;
    }

    if(!this.started) {
      if(this.writePosition<this.latency+this.grainSize) {
        for(let ch=0;ch<outputChannels;ch++)output[ch].fill(0);
        return true;
      }
      this.analysisPosition=this.writePosition-this.latency-this.grainSize;
      this.outputPosition=0;
      this.started=true;
    }

    for(let i=0;i<frames;i++) {
      const cents=pitchParam&&pitchParam.length?pitchParam[Math.min(i,pitchParam.length-1)]:0;
      const ratio=Math.pow(2,cents/1200);

      if(this.outputPosition%this.hop===0) {
        this.grains.push({
          outStart:this.outputPosition,
          inStart:this.analysisPosition,
          ratio,
        });
        this.analysisPosition+=this.hop;
      }

      for(let ch=0;ch<outputChannels;ch++) {
        let sample=0;
        for(let g=this.grains.length-1;g>=0;g--) {
          const grain=this.grains[g];
          const age=this.outputPosition-grain.outStart;
          if(age<0)continue;
          if(age>=this.grainSize) {
            this.grains.splice(g,1);
            continue;
          }
          const window=0.5-0.5*Math.cos(2*Math.PI*age/(this.grainSize-1));
          const sourcePosition=grain.inStart+age*grain.ratio;
          const i0=Math.floor(sourcePosition);
          const frac=sourcePosition-i0;
          const a=this.inputBuffers[Math.min(ch,1)][((i0%this.bufferSize)+this.bufferSize)%this.bufferSize];
          const b=this.inputBuffers[Math.min(ch,1)][(((i0+1)%this.bufferSize)+this.bufferSize)%this.bufferSize];
          sample+=(a+(b-a)*frac)*window;
        }
        output[ch][i]=sample*0.5;
      }
      this.outputPosition++;
    }

    return true;
  }
}

registerProcessor('pitch-shifter',PitchShiftProcessor);
