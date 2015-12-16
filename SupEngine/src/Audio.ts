export default class Audio {
  _ctx: AudioContext;
  masterGain: GainNode;

  constructor() {}
  getContext(): AudioContext {
    if (this._ctx != null) return this._ctx;
    if ((window as any).AudioContext == null) return null;

    this._ctx = new AudioContext();
    this.masterGain = this._ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this._ctx.destination);
    return this._ctx;
  }
}
