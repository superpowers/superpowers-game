export default class Audio {
  private ctx: AudioContext;
  masterGain: GainNode;

  constructor() { /* Nothing here */ }
  getContext(): AudioContext {
    if (this.ctx != null) return this.ctx;
    if ((window as any).AudioContext == null) return null;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }
}
