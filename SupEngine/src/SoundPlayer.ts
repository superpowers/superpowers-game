class SoundPlayer {
  audioCtx: AudioContext;
  audioMasterGain: GainNode;
  buffer: string|AudioBuffer;
  source: AudioBufferSourceNode|MediaElementAudioSourceNode;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;

  offset = 0;
  startTime: number;
  isLooping = false;
  state = SoundPlayer.State.Stopped;
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
    if (this.state === SoundPlayer.State.Playing) return;
    if (this.source != null) this.stop();

    // if this.buffer instanceof HTMLAudioElement
    if (typeof this.buffer === "string") {
      let audio = new Audio();
      audio.src = <string>this.buffer;
      this.source = this.audioCtx.createMediaElementSource(audio);
      // FIXME: Very new so not included in d.ts file just yet
      if ((<any>this.source)["mediaElement"] == null) { this.source = null; return; }
      (<any>this.source)["mediaElement"].loop = this.isLooping;
    }
    else {
      // Assuming AudioBuffer
      let source = this.source = this.audioCtx.createBufferSource();
      source.buffer = <AudioBuffer>this.buffer;
      source.loop = this.isLooping;
      
      // NOTE: As of November 2015, playbackRate is not supported on MediaElementSources
      // so let's only apply it for buffer sources
      source.playbackRate.value = Math.pow(2, this.pitch);
    }

    this.pannerNode = this.audioCtx.createStereoPanner();
    this.pannerNode.pan.value = this.pan;
    this.pannerNode.connect(this.audioMasterGain);

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.pannerNode);

    this.source.connect(this.gainNode);

    this.state = SoundPlayer.State.Playing;
    this.source.addEventListener("ended", () => { this.state = SoundPlayer.State.Stopped; });

    this.startTime = this.audioCtx.currentTime - this.offset;

    if ((<any>this.source)["mediaElement"] != null) {
      (<any>this.source)["mediaElement"].currentTime = this.offset;
      (<any>this.source)["mediaElement"].play();
    }
    else (this.source as AudioBufferSourceNode).start(0, this.offset);
  }

  stop() {
    if (this.audioCtx == null) return;

    if (this.source != null) {
      if ((<any>this.source)["mediaElement"] != null) {
        (<any>this.source)["mediaElement"].pause();
        (<any>this.source)["mediaElement"].currentTime = 0;
      }
      else (this.source as AudioBufferSourceNode).stop(0);

      this.source.disconnect();
      delete this.source;
      
      this.gainNode.disconnect();
      delete this.gainNode;

      this.pannerNode.disconnect();
      delete this.pannerNode;
    }

    this.offset = 0;
    this.state = SoundPlayer.State.Stopped;
  }

  pause() {
    if (this.audioCtx == null || this.source == null) return;

    this.offset = this.audioCtx.currentTime - this.startTime

    if ((<any>this.source).mediaElement != null) (<any>this.source).mediaElement.pause();
    else (this.source as AudioBufferSourceNode).stop(0);
    
    this.source.disconnect();
    delete this.source;

    this.gainNode.disconnect();
    delete this.gainNode;

    this.pannerNode.disconnect();
    delete this.pannerNode;

    this.state = SoundPlayer.State.Paused;
  }

  getState(): SoundPlayer.State {
    // Workaround Webkit audio's lack of support for the onended callback
    if (this.state === SoundPlayer.State.Playing) {
      // FIXME: Very new so not included in d.ts file just yet
      if ((<any>this.source).playbackState != null && (<any>this.source).playbackState === (<any>this.source).FINISHED_STATE) this.state = SoundPlayer.State.Stopped;
      else if ((<any>this.source).mediaElement != null && (<any>this.source).mediaElement.paused) this.state = SoundPlayer.State.Stopped;
    }

    return this.state;
  }

  setLoop(isLooping: boolean) {
    this.isLooping = isLooping;
    if (this.source == null) return;

    if ((<any>this.source).mediaElement != null) {
      (<any>this.source).mediaElement.loop = this.isLooping;
    } else {
      (this.source as AudioBufferSourceNode).loop  = this.isLooping;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max( 0, Math.min( 1, volume ) );
    if (this.source != null) this.gainNode.gain.value = this.volume;
  }

  setPan(pan: number) {
    this.pan = Math.max( -1, Math.min( 1, pan ) );
    if (this.source != null) this.pannerNode.pan.value = this.pan;
  }

  setPitch(pitch: number) {
    this.pitch = Math.max( -1, Math.min( 1, pitch ) );
    if (this.source != null) {
      // NOTE: playbackRate is not supported on MediaElementSources
      if ((this.source as AudioBufferSourceNode).playbackRate != null) {
        (this.source as AudioBufferSourceNode).playbackRate.value = Math.pow(2, this.pitch);
      }
    }
  }
}

namespace SoundPlayer {
  export enum State { Playing, Paused, Stopped };
}

export default SoundPlayer;
