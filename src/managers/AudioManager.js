/**
 * Synthétiseur Web Audio : aucun fichier audio n'est chargé.
 * Le choix « son coupé » est mémorisé séparément de la sauvegarde de partie.
 */
class AudioManager {
    constructor() {
        this.muted = false;
        try {
            this.muted = typeof localStorage !== 'undefined' && localStorage.getItem('rpg_audio_muted') === 'true';
        } catch (error) {
            this.muted = false;
        }

        const Context = window.AudioContext || window.webkitAudioContext;
        this.ctx = Context ? new Context() : null;
        this.master = null;
        if (this.ctx) {
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 1;
            this.master.connect(this.ctx.destination);
        }
    }

    /** Coupe ou rétablit le son et mémorise le choix sur l'appareil. */
    setMuted(value) {
        this.muted = !!value;
        if (this.master) this.master.gain.value = this.muted ? 0 : 1;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('rpg_audio_muted', this.muted ? 'true' : 'false');
            }
        } catch (error) {
            // Stockage indisponible (navigation privée) : le choix reste valable pour la session.
        }
        return this.muted;
    }

    toggleMute() {
        return this.setMuted(!this.muted);
    }

    play(type) {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.master || this.ctx.destination);

        const now = this.ctx.currentTime;
        if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'collect') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'levelup') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(800, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'swing') {
            // Sifflement court de la lame : montée puis chute rapide, volume discret.
            osc.type = 'square';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(170, now + 0.08);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.008, now + 0.09);
            osc.start(now); osc.stop(now + 0.09);
        } else if (type === 'hurt') {
            // Dégât encaissé : plus grave et plus long que le coup porté.
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.008, now + 0.24);
            osc.start(now); osc.stop(now + 0.24);
        } else if (type === 'bush') {
            // Ronce tranchée : froissement bref et sec.
            osc.type = 'square';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.008, now + 0.13);
            osc.start(now); osc.stop(now + 0.13);
        } else if (type === 'chest') {
            // Récompense : arpège de trois notes, proche du level up mais plus court.
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.09);
            osc.frequency.setValueAtTime(784, now + 0.18);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        } else {
            // Type inconnu : ne pas laisser un oscillateur connecté mais jamais démarré.
            osc.disconnect();
            gain.disconnect();
        }
    }
}

// Instance globale du manager audio
window.audioManager = new AudioManager();
