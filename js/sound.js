/**
 * ==========================================
 * NEON REVERSI - Web Audio API Sound Effects
 * ==========================================
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
    }

    /**
     * AudioContextを初期化または復帰させる
     * ユーザーのアクションを契機に呼び出す必要がある
     */
    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * ミュート設定の切り替え
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.initContext();
        return this.isMuted;
    }

    /**
     * 石を置いた音 (コトッという木製に近いが、少しサイバー感のある打撃音)
     */
    playPlaceStone() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // 低い胴鳴り成分 (Sine波の急速な周波数スライド)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        
        gain1.gain.setValueAtTime(0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);

        // 高いアタッククリック音 (Triangle波の超高速スライド)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(900, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.02);
        
        gain2.gain.setValueAtTime(0.3, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.1);
        osc2.start(now);
        osc2.stop(now + 0.03);
    }

    /**
     * パス音 (警告音風)
     */
    playPass() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // 2段階の下落音
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(147, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        // ローパスフィルターで丸みを持たせる
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * 勝利ファンファーレ (サイバー感のある明るい和音アルペジオ)
     */
    playWin() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (C Major)
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            
            const noteStart = now + idx * 0.1;
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.6);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(noteStart);
            osc.stop(noteStart + 0.7);
        });
    }

    /**
     * 敗北ファンファーレ (重く、暗い下降和音)
     */
    playLose() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [293.66, 277.18, 220.00, 146.83]; // D4, C#4, A3, D3 (D Minor / 暗い雰囲気)
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            
            const noteStart = now + idx * 0.15;
            
            // ローパスフィルターで重い音にする
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;

            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.8);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(noteStart);
            osc.stop(noteStart + 0.9);
        });
    }

    /**
     * 引き分け音 (中立的)
     */
    playDraw() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [329.63, 329.63]; // E4, E4
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            
            const noteStart = now + idx * 0.15;
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.4);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(noteStart);
            osc.stop(noteStart + 0.5);
        });
    }
}

// グローバルインスタンスを作成
window.soundManager = new SoundManager();
