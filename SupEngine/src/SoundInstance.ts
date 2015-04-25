enum SoundStates {playing, paused, stopped};

export default class SoundInstance {
  audioCtx: AudioContext;
  audioMasterGain: GainNode;
  buffer: string|AudioBuffer;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  panner: PannerNode;

  offset = 0;
  startTime: number;
  isLooping = false;
  state = SoundStates.stopped;
  volume = 1;
  pitch = 0;
  pan = 0;

  constructor(audioCtx: AudioContext, audioMasterGain: GainNode, buffer: string|AudioBuffer) {
    this.audioCtx = audioCtx;
    this.audioMasterGain = audioMasterGain;
    this.buffer = buffer;
  }

  destroy() {
    this.stop();
    this.audioCtx = null;
    this.audioMasterGain = null;
  }

  play() {
    if (this.audioCtx == null || this.buffer == null) return;
    if (this.state == SoundStates.playing) return;
    if (this.source != null) this.stop();

    // if this.buffer instanceof HTMLAudioElement
    if (typeof this.buffer == "string") {
      let audio = new Audio();
      audio.src = <string>this.buffer;
      this.source = <any>this.audioCtx.createMediaElementSource(audio);
      // FIXME: Very new so not included in d.ts file just yet
      if ((<any>this.source)["mediaElement"] == null) { this.source = null; return; }
      (<any>this.source)["mediaElement"].loop = this.isLooping;
    }
    else {
      // Assuming AudioBuffer
      this.source = this.audioCtx.createBufferSource();
      this.source.buffer = <AudioBuffer>this.buffer;
      this.source.loop = this.isLooping;
    }

    this.panner = this.audioCtx.createPanner();
    this.panner.setPosition(-this.pan, 0, 0);

    if (this.gainNode == null) {
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain = this.gainNode.gain;
      this.source.connect(this.gainNode);

      // NOTE: the panner node doesn't work in Firefox right now
      // so we by-pass it until then
      // this.gainNode.connect this.panner
      this.gainNode.connect(this.audioMasterGain);
    }
    else {
      this.panner.connect(this.audioMasterGain);
      this.source.connect(this.panner);
      }

    this.gainNode.gain.value = this.volume;

    // NOTE: playbackRate is not supported on MediaElementSources
    if (this.source.playbackRate != null) this.source.playbackRate.value = Math.pow( 2, this.pitch );

    this.state = 20;
    this.state = SoundStates.playing;
    this.source.onended = () => { this.state = SoundStates.stopped; }

    this.startTime = this.audioCtx.currentTime - this.offset;

    if ((<any>this.source)["mediaElement"] != null) {
      (<any>this.source)["mediaElement"].currentTime = this.offset;
      (<any>this.source)["mediaElement"].play();
    }
    else this.source.start(0, this.offset);
  }

  stop() {
    if (this.audioCtx == null) return;

    if (this.source != null) {
      if ((<any>this.source)["mediaElement"] != null) {
        (<any>this.source)["mediaElement"].pause();
        (<any>this.source)["mediaElement"].currentTime = 0;
      }
      else this.source.stop(0);

      this.source.disconnect();
      delete this.source;
      delete this.gainNode;

      if (this.panner != null) {
        this.panner.disconnect();
        delete this.panner;
      }
    }

    this.offset = 0;
    this.state = SoundStates.stopped;
  }

  pause() {
    if (this.audioCtx == null || this.source == null) return;

    this.offset = this.audioCtx.currentTime - this.startTime

    if ((<any>this.source)["mediaElement"] != null) (<any>this.source)["mediaElement"].pause();
    else this.source.stop(0);
    delete this.source;
    delete this.panner;

    this.state = SoundStates.paused;
  }

  getState(): SoundStates {
    // Workaround Webkit audio's lack of support for the onended callback
    if (this.state == SoundStates.playing) {
      // FIXME: Very new so not included in d.ts file just yet
      if ((<any>this.source)["playbackState"] != null && (<any>this.source)["playbackState"] == (<any>this.source)["FINISHED_STATE"]) this.state = SoundStates.stopped;
      else if ((<any>this.source)["mediaElement"] != null && (<any>this.source)["mediaElement"].paused) this.state = SoundStates.stopped;
    }

    return this.state;
  }

  setLoop(isLooping: boolean) {
    this.isLooping = isLooping;
    if (this.source == null) return;

    if ((<any>this.source)["mediaElement"] != null) (<any>this.source)["mediaElement"].loop = this.isLooping;
    else this.source.loop = this.isLooping;
  }

  setVolume(volume: number) {
    this.volume = Math.max( 0, Math.min( 1, volume ) );
    if (this.source != null) this.gainNode.gain.value = this.volume;
  }

  setPan(pan: number) {
    this.pan = Math.max( -1, Math.min( 1, pan ) );
    if (this.source != null) this.panner.setPosition(-this.pan, 0, 0);
  }

  setPitch(pitch: number) {
    this.pitch = Math.max( -1, Math.min( 1, pitch ) );
    // NOTE: playbackRate is not supported on MediaElementSources
    if (this.source != null && this.source.playbackRate != null) this.source.playbackRate.value = Math.pow( 2, this.pitch )
  }
}
