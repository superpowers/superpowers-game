export default class Audio {
  _ctx: AudioContext;
  masterGain: GainNode;

  constructor() {}
  getContext(): AudioContext {
    if ((<any>window)["AudioContext"] == null) return null

    if (this._ctx != null) return this._ctx;

    this._ctx = new AudioContext()
    this.masterGain = this._ctx.createGain()
    this.masterGain.gain.value = 1
    this.masterGain.connect(this._ctx.destination);
    return this._ctx;
  }
}
