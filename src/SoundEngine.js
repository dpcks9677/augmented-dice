class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.buffers = {};
    this.bgmGainNode = null;
    this.sfxGainNode = null;
    this.currentBgmSource = null;
    this.bgmStartTime = 0; // audioCtx.currentTime timestamp when BGM timeline t=0 started
    this.isBgmPlaying = false;
    this.isDucked = false;

    const basePath = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : './';
    const cleanBase = basePath.endsWith('/') ? basePath : basePath + '/';

    this.bgmFile = `${cleanBase}sounds/roll_45.mp3`;

    this.sfxFiles = {
      dice_roll: `${cleanBase}sounds/dice_roll.mp3`,
      scoreboard: `${cleanBase}sounds/scoreboard.mp3`,
      turn_change: `${cleanBase}sounds/turn_change.mp3`
    };

    this.isLoaded = false;
  }

  async init() {
    if (this.audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();
    this.bgmGainNode = this.audioCtx.createGain();
    this.sfxGainNode = this.audioCtx.createGain();

    this.bgmGainNode.connect(this.audioCtx.destination);
    this.sfxGainNode.connect(this.audioCtx.destination);

    this.bgmGainNode.gain.value = 1.0;
    this.sfxGainNode.gain.value = 1.0;

    await this.loadAllSounds();
  }

  async loadSound(url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn(`[SoundEngine] Failed to load audio: ${url}`, err);
      return null;
    }
  }

  async loadAllSounds() {
    if (this.isLoaded) return;
    const promises = [];

    // 48초 단일 통음원 BGM 로드
    promises.push(
      this.loadSound(this.bgmFile).then(buffer => {
        if (buffer) this.buffers['bgm'] = buffer;
      })
    );

    // 효과음 SFX 로드
    Object.entries(this.sfxFiles).forEach(([name, file]) => {
      promises.push(
        this.loadSound(file).then(buffer => {
          if (buffer) this.buffers[name] = buffer;
        })
      );
    });

    await Promise.all(promises);
    this.isLoaded = true;
  }

  ensureContext() {
    if (!this.audioCtx) {
      this.init();
      return;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  startBGM(elapsedTime = 0.0, forceRestart = false) {
    this.ensureContext();
    if (!this.audioCtx || !this.isLoaded) return;

    let t = Math.max(0, Math.min(47.9, elapsedTime));

    // 이미 재생 중인 경우, 타임라인 시간차가 미세(0.8초 이내)하면 음원을 재시작하지 않고 유지
    if (!forceRestart && this.isBgmPlaying && this.currentBgmSource) {
      const currentTimelineT = this.audioCtx.currentTime - this.bgmStartTime;
      if (Math.abs(currentTimelineT - t) < 0.8) {
        return;
      }
    }

    this.stopBGM();

    const buffer = this.buffers['bgm'];
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.bgmGainNode);

    const now = this.audioCtx.currentTime;
    // 이전 턴의 Ducking/감쇄 상태 해제 및 새 턴 시작 시 볼륨 100%(1.0) 원상 복구 보장
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(1.0, now);
    this.isDucked = false;

    const remainingDuration = Math.max(0, buffer.duration - t);
    source.start(now, t, remainingDuration);

    this.currentBgmSource = source;
    this.isBgmPlaying = true;
    this.bgmStartTime = now - t;
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.currentBgmSource) {
      try {
        this.currentBgmSource.stop();
        this.currentBgmSource.disconnect();
      } catch (e) {}
      this.currentBgmSource = null;
    }
  }

  duckBGM() {
    this.ensureContext();
    if (!this.audioCtx || !this.bgmGainNode) return;
    this.isDucked = true;
    const now = this.audioCtx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value || 1.0, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(0.0, now + 0.3); // 0.3초 동안 0.0(무음)으로 감쇄
  }

  restoreBGM(exactElapsedTime = null) {
    this.ensureContext();
    if (!this.audioCtx || !this.bgmGainNode) return;
    const now = this.audioCtx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);

    // 페이드인 시작 지점을 0.0(무음)으로 고정하여 0부터 3초 페이드인 보장
    const startVol = 0.0;
    this.isDucked = false;

    this.bgmGainNode.gain.setValueAtTime(startVol, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(1.0, now + 3.0); // 0.0에서 1.0으로 3초 동안 서서히 페이드인

    if (exactElapsedTime !== null && exactElapsedTime !== undefined && !this.isBgmPlaying) {
      this.startBGM(exactElapsedTime);
    }
  }

  fadeOutBGM(duration = 1.5) {
    if (!this.audioCtx || !this.bgmGainNode || !this.isBgmPlaying) return;
    const now = this.audioCtx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value || 1.0, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(0.0, now + duration);

    setTimeout(() => {
      if (this.isBgmPlaying) {
        this.stopBGM();
      }
    }, duration * 1000);
  }

  playSFX(name, volume = 1.0) {
    this.ensureContext();
    if (!this.audioCtx || !this.isLoaded) return;

    const buffer = this.buffers[name];
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.sfxGainNode);

    source.start(0);
  }
}

export const soundEngine = new SoundEngine();
