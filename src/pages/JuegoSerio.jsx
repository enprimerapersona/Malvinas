import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Snowflake, Utensils, Compass, RotateCcw,
    AlertTriangle, BookOpen, ChevronRight, Activity, HeartPulse,
    Volume2, VolumeX, Calendar, Save,
    Award, Download, Printer, FastForward
} from 'lucide-react';

const COLORS = {
    base: '#09090c',
    accent: '#b45354',
    sky: '#7b98ab',
    deep: '#35446a',
    paper: '#f0ece5'
};

const SAVE_KEY = 'malvinas_juego_save_v2';
const AUDIO_KEY = 'malvinas_juego_audio';

// ─── MÚSICA AMBIENT desde Wikimedia Commons (PD / CC) ────────────────
// URLs verificadas en upload.wikimedia.org. Si una falla (404/CORS/red),
// el hook hace fallback automático al sintetizador.
const MOOD_AUDIO_URLS = {
    // Pachelbel - Canon en D (PD): cálido, hogar y reencuentro
    home:    'https://upload.wikimedia.org/wikipedia/commons/b/bc/Pachelbel%27s_Canon_01.wav',
    reunion: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Pachelbel%27s_Canon_01.wav',
    // Albinoni - Concerto Op.9 No.2 II Adagio (CC0): melancólico, frío
    cold:    'https://upload.wikimedia.org/wikipedia/commons/d/da/Albinoni%2C_Concerto_for_Oboe_and_Strings_No._2_in_D_minor%2C_Op._9%2C_II._Adagio.ogg',
    // Beethoven - Moonlight Sonata 1er mov. (CC-BY-SA, atribución abajo)
    tense:   'https://upload.wikimedia.org/wikipedia/commons/e/eb/Beethoven_Moonlight_1st_movement.ogg',
    // Tchaikovsky - Obertura 1812 (PD UE, grabación 1951): batalla
    battle:  'https://upload.wikimedia.org/wikipedia/commons/4/45/Tchaikovsky_-_Op.49_Ouverture_solennelle_1812.ogg'
};

// ─── HOOK DE AUDIO (Wikimedia Commons + synth fallback) ──────────────
// Genera ambient music por "mood" y SFX de click. Cross-fade entre escenas.
const useGameAudio = () => {
    const ctxRef = useRef(null);
    const masterGainRef = useRef(null);
    const currentMoodRef = useRef(null);
    const pendingMoodRef = useRef(null);
    const currentGraphRef = useRef(null);
    const initialEnabled = typeof window !== 'undefined' ? localStorage.getItem(AUDIO_KEY) !== 'off' : true;
    const [enabled, setEnabledState] = useState(initialEnabled);
    const enabledRef = useRef(initialEnabled);
    const [started, setStarted] = useState(false);
    const startedRef = useRef(false);
    const initialVol = typeof window !== 'undefined' ? Number(localStorage.getItem('malvinas_juego_volume') || '0.7') : 0.7;
    const [volume, setVolumeState] = useState(initialVol);
    const volumeRef = useRef(initialVol);
    const reverbBufferRef = useRef(null);
    const audioFileRef = useRef(null);

    const getReverbBuffer = (ctx) => {
        if (reverbBufferRef.current) return reverbBufferRef.current;
        const length = ctx.sampleRate * 2.5; // 2.5s reverb decay
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-i / (ctx.sampleRate * 0.4));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        reverbBufferRef.current = impulse;
        return impulse;
    };

    const ensureCtx = () => {
        if (typeof window === 'undefined') return null;
        if (!ctxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            ctxRef.current = new Ctx();
            // master gain → destination
            masterGainRef.current = ctxRef.current.createGain();
            masterGainRef.current.gain.value = volumeRef.current;
            masterGainRef.current.connect(ctxRef.current.destination);
        }
        return ctxRef.current;
    };

    const fadeOutGraph = (graph) => {
        if (!graph) return;
        const ctx = ctxRef.current;
        if (!ctx) return;
        try {
            graph.gain.gain.cancelScheduledValues(ctx.currentTime);
            graph.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
        } catch (e) { /* ignore */ }
        setTimeout(() => {
            (graph.nodes || []).forEach(n => {
                try { if (typeof n.stop === 'function') n.stop(); } catch (e) {}
                try { if (typeof n.disconnect === 'function') n.disconnect(); } catch (e) {}
            });
            if (graph.cleanup) graph.cleanup();
        }, 1500);
    };

    // Toca una nota corta con envelope ADSR simple (para arpeggios/melodías)
    const playNote = (ctx, dest, freq, startTime, duration, volNote = 0.18, type = 'sine') => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0;
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(volNote, startTime + 0.04);
        g.gain.linearRampToValueAtTime(volNote * 0.6, startTime + duration * 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(g).connect(dest);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    };

    const buildMoodGraph = (mood) => {
        const ctx = ensureCtx();
        if (!ctx) return null;

        const out = ctx.createGain();
        out.gain.value = 0;

        const convolver = ctx.createConvolver();
        convolver.buffer = getReverbBuffer(ctx);
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.55; 
        const dryGain = ctx.createGain();
        dryGain.gain.value = 0.85;

        out.connect(dryGain).connect(masterGainRef.current);
        out.connect(convolver).connect(wetGain).connect(masterGainRef.current);

        const nodes = [convolver, wetGain, dryGain];
        let cleanup = null;

        const addOsc = (type, freq, gainVal, detuneLfoFreq) => {
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.value = gainVal;
            osc.connect(g).connect(out);
            osc.start();
            nodes.push(osc, g);
            if (detuneLfoFreq) {
                const lfo = ctx.createOscillator();
                lfo.frequency.value = detuneLfoFreq;
                const lfoG = ctx.createGain();
                lfoG.gain.value = 0.6;
                lfo.connect(lfoG).connect(osc.frequency);
                lfo.start();
                nodes.push(lfo, lfoG);
            }
        };

        if (mood === 'home') {
            // Acorde C mayor (4 voces) + arpeggio melódico cíclico
            [65.41, 98, 130.81, 164.81].forEach((f, i) =>
                addOsc(i % 2 ? 'sine' : 'triangle', f, 0.18, 0.18 + i * 0.07)
            );
            // Arpeggio: C5, E5, G5, E5 cada 1.5 s
            const notes = [523.25, 659.25, 783.99, 659.25];
            let i = 0;
            const tick = () => {
                if (currentMoodRef.current !== 'home') return;
                const t = ctx.currentTime;
                playNote(ctx, out, notes[i % notes.length], t, 0.6, 0.14, 'triangle');
                i++;
            };
            const arpTimer = setInterval(tick, 1500);
            cleanup = () => clearInterval(arpTimer);
        } else if (mood === 'cold') {
            // Viento + drone bajo + melodía solitaria descendente
            const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
            const noise = ctx.createBufferSource();
            noise.buffer = buf;
            noise.loop = true;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 700;
            filter.Q.value = 0.6;
            const ng = ctx.createGain();
            ng.gain.value = 0.30;
            noise.connect(filter).connect(ng).connect(out);
            noise.start();
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.06;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 320;
            lfo.connect(lfoG).connect(filter.frequency);
            lfo.start();
            nodes.push(noise, filter, ng, lfo, lfoG);
            // drone bajo
            addOsc('sine', 55, 0.22);
            addOsc('sine', 82.41, 0.12);
            // melodía lenta solitaria — A4 → G4 → E4 → C4
            const melodyNotes = [440, 392, 329.63, 261.63];
            let i = 0;
            const tick = () => {
                if (currentMoodRef.current !== 'cold') return;
                playNote(ctx, out, melodyNotes[i % melodyNotes.length], ctx.currentTime, 1.6, 0.12, 'sine');
                i++;
            };
            setTimeout(tick, 2000);
            const melTimer = setInterval(tick, 5000);
            cleanup = () => clearInterval(melTimer);
        } else if (mood === 'battle') {
            // Drone tenso + booms + war drum
            addOsc('sawtooth', 49, 0.18);
            const drone2 = ctx.createOscillator();
            drone2.type = 'sawtooth';
            drone2.frequency.value = 73.42;
            const droneFilter = ctx.createBiquadFilter();
            droneFilter.type = 'lowpass';
            droneFilter.frequency.value = 200;
            droneFilter.Q.value = 4;
            const dg = ctx.createGain();
            dg.gain.value = 0.16;
            drone2.connect(droneFilter).connect(dg).connect(out);
            drone2.start();
            nodes.push(drone2, droneFilter, dg);
            // tambores de guerra (kick) cada 1.2 s
            const playKick = () => {
                if (!ctxRef.current || ctxRef.current.state !== 'running') return;
                if (currentMoodRef.current !== 'battle') return;
                const c = ctxRef.current;
                const osc = c.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(35, c.currentTime + 0.18);
                const bg = c.createGain();
                bg.gain.setValueAtTime(0.6, c.currentTime);
                bg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
                osc.connect(bg).connect(out);
                osc.start();
                osc.stop(c.currentTime + 0.22);
            };
            // boom lejano cada 3-5 s (cañón naval)
            const playBoom = () => {
                if (!ctxRef.current || ctxRef.current.state !== 'running') return;
                if (currentMoodRef.current !== 'battle') return;
                const c = ctxRef.current;
                const osc = c.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(20, c.currentTime + 0.6);
                const bg = c.createGain();
                bg.gain.setValueAtTime(0.7, c.currentTime);
                bg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
                osc.connect(bg).connect(out);
                osc.start();
                osc.stop(c.currentTime + 0.7);
            };
            const kickTimer = setInterval(playKick, 1200);
            const boomTimer = setInterval(playBoom, 3500 + Math.random() * 1500);
            cleanup = () => { clearInterval(kickTimer); clearInterval(boomTimer); };
        } else if (mood === 'tense') {
            // A menor con tremolo + acentos de piano fantasma
            [110, 146.83, 174.61].forEach(f => {
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = f;
                const g = ctx.createGain();
                g.gain.value = 0.18;
                osc.connect(g).connect(out);
                osc.start();
                const trem = ctx.createOscillator();
                trem.frequency.value = 0.5;
                const tremG = ctx.createGain();
                tremG.gain.value = 0.08;
                trem.connect(tremG).connect(g.gain);
                trem.start();
                nodes.push(osc, g, trem, tremG);
            });
            // acento ocasional cada 6 s — un Mi grave
            const tick = () => {
                if (currentMoodRef.current !== 'tense') return;
                playNote(ctx, out, 164.81, ctx.currentTime, 1.2, 0.20, 'triangle');
            };
            setTimeout(tick, 1500);
            const accentTimer = setInterval(tick, 6000);
            cleanup = () => clearInterval(accentTimer);
        } else if (mood === 'reunion') {
            // G mayor con shimmer + melodía esperanzada
            [98, 123.47, 146.83, 196].forEach((f, i) =>
                addOsc(i === 0 ? 'triangle' : 'sine', f, 0.20, 0.15 + i * 0.05)
            );
            // melodía: G4, B4, D5, G5 ascendente cada 2s
            const melodyNotes = [392, 493.88, 587.33, 783.99];
            let i = 0;
            const tick = () => {
                if (currentMoodRef.current !== 'reunion') return;
                playNote(ctx, out, melodyNotes[i % melodyNotes.length], ctx.currentTime, 1.0, 0.18, 'sine');
                i++;
            };
            const melTimer = setInterval(tick, 2000);
            cleanup = () => clearInterval(melTimer);
        }

        // fade in (master 0.85 = más fuerte que antes)
        out.gain.setTargetAtTime(0.85, ctx.currentTime, 0.6);

        return { gain: out, nodes, cleanup };
    };

    // Reproduce un archivo HTMLAudioElement loopeado para el mood.
    // Se conecta al masterGain (respeta el slider de volumen).
    // Si la URL falla, devuelve false → caller hace fallback al synth.
    const playMoodFile = (mood) => {
        const url = MOOD_AUDIO_URLS[mood];
        if (!url) return false;
        const ctx = ensureCtx();
        if (!ctx || !masterGainRef.current) return false;

        const el = new Audio();
        el.crossOrigin = 'anonymous';
        el.loop = true;
        el.preload = 'auto';
        el.src = url;

        let mediaSource;
        try {
            mediaSource = ctx.createMediaElementSource(el);
        } catch (e) {
            // Algunos browsers re-bloquean el mismo MediaElement en otra fuente; abortamos
            return false;
        }
        const gain = ctx.createGain();
        gain.gain.value = 0;
        mediaSource.connect(gain).connect(masterGainRef.current);

        const ref = { el, gain, mediaSource, mood, ok: true };

        const startPlay = () => {
            if (!ref.ok) return;
            el.play().catch(() => { ref.ok = false; });
            // fade in
            try {
                gain.gain.cancelScheduledValues(ctx.currentTime);
                gain.gain.setTargetAtTime(0.85, ctx.currentTime, 0.6);
            } catch (e) { /* ignore */ }
        };
        el.addEventListener('canplay', startPlay, { once: true });
        // Si tarda demasiado, intento play igual (algunos browsers no emiten canplay)
        setTimeout(() => { if (ref.ok && !el.paused === false) startPlay(); }, 800);
        // Si falla la carga, marcamos para fallback
        el.addEventListener('error', () => { ref.ok = false; }, { once: true });

        audioFileRef.current = ref;
        return true;
    };

    const fadeOutFile = (ref) => {
        if (!ref) return;
        const ctx = ctxRef.current;
        if (!ctx) return;
        try {
            ref.gain.gain.cancelScheduledValues(ctx.currentTime);
            ref.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        } catch (e) { /* ignore */ }
        setTimeout(() => {
            try { ref.el.pause(); } catch (e) { /* ignore */ }
            try { ref.gain.disconnect(); } catch (e) { /* ignore */ }
            try { ref.mediaSource.disconnect(); } catch (e) { /* ignore */ }
            ref.ok = false;
        }, 1300);
    };

    const applyMoodNow = (mood) => {
        if (currentMoodRef.current === mood) return;
        // fade out anterior (synth y/o file)
        if (currentGraphRef.current) {
            fadeOutGraph(currentGraphRef.current);
            currentGraphRef.current = null;
        }
        if (audioFileRef.current) {
            fadeOutFile(audioFileRef.current);
            audioFileRef.current = null;
        }
        currentMoodRef.current = mood;
        if (mood && mood !== 'silent') {
            // 1) intentar archivo de Wikimedia
            const playedFile = playMoodFile(mood);
            // 2) si no hay URL para ese mood o falló, usar synth
            if (!playedFile) {
                currentGraphRef.current = buildMoodGraph(mood);
            }
        }
    };

    const setMood = useCallback((mood) => {
        if (!enabledRef.current) return;
        if (!startedRef.current) {
            pendingMoodRef.current = mood;
            return;
        }
        applyMoodNow(mood);
    }, []);

    const start = useCallback(() => {
        const ctx = ensureCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        startedRef.current = true;
        setStarted(true);

        const moodToApply = pendingMoodRef.current || currentMoodRef.current;
        pendingMoodRef.current = null;
        if (moodToApply) {
            const prev = currentMoodRef.current;
            currentMoodRef.current = null;
            applyMoodNow(prev || moodToApply);
            if (prev && prev !== moodToApply) applyMoodNow(moodToApply);
        }
    }, []);

    const stopAll = useCallback(() => {
        if (currentGraphRef.current) {
            fadeOutGraph(currentGraphRef.current);
            currentGraphRef.current = null;
        }
        if (audioFileRef.current) {
            fadeOutFile(audioFileRef.current);
            audioFileRef.current = null;
        }
        currentMoodRef.current = null;
        pendingMoodRef.current = null;
    }, []);

    const playClick = useCallback(() => {
        if (!enabledRef.current || !startedRef.current) return;
        const ctx = ensureCtx();
        if (!ctx) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 1;
        const g = ctx.createGain();
        g.gain.value = 0.25;
        g.gain.setTargetAtTime(0, ctx.currentTime + 0.02, 0.02);
        noise.connect(filter).connect(g).connect(masterGainRef.current);
        noise.start();
        noise.stop(ctx.currentTime + 0.12);
    }, []);

    const setEnabled = useCallback((v) => {
        enabledRef.current = v;
        setEnabledState(v);
        try { localStorage.setItem(AUDIO_KEY, v ? 'on' : 'off'); } catch (e) {}
        if (!v) stopAll();
    }, [stopAll]);

    const toggle = useCallback(() => {
        const newEnabled = !enabledRef.current;
        setEnabled(newEnabled);
        // Si se activa pero aún no había arrancado, intentamos arrancar
        if (newEnabled && !startedRef.current) {
            start();
        }
    }, [setEnabled, start]);

    const setVolume = useCallback((v) => {
        const clamped = Math.max(0, Math.min(1, v));
        volumeRef.current = clamped;
        setVolumeState(clamped);
        if (masterGainRef.current && ctxRef.current) {
            masterGainRef.current.gain.setTargetAtTime(clamped, ctxRef.current.currentTime, 0.05);
        }
        try { localStorage.setItem('malvinas_juego_volume', String(clamped)); } catch (e) {}
    }, []);

    useEffect(() => {
        return () => {
            stopAll();
            if (ctxRef.current) {
                try { ctxRef.current.close(); } catch (e) {}
            }
        };
    }, [stopAll]);

    return { enabled, started, volume, toggle, setMood, playClick, stopAll, start, setVolume };
};

// ─── ILUSTRACIONES SVG (fallback cuando una escena no tiene .img) ────
const SceneIllustration = ({ kind = 'default' }) => {
    const W = 800, H = 280;
    const baseProps = {
        viewBox: `0 0 ${W} ${H}`,
        preserveAspectRatio: 'xMidYMid slice',
        style: { width: '100%', height: '100%', display: 'block' }
    };
    const Background = ({ from = COLORS.base, to = COLORS.deep }) => (
        <>
            <defs>
                <linearGradient id={`bg-${kind}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={from} />
                    <stop offset="100%" stopColor={to} />
                </linearGradient>
                <pattern id={`grain-${kind}`} width="3" height="3" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.4" fill={COLORS.paper} opacity="0.04" />
                </pattern>
            </defs>
            <rect x="0" y="0" width={W} height={H} fill={`url(#bg-${kind})`} />
            <rect x="0" y="0" width={W} height={H} fill={`url(#grain-${kind})`} />
        </>
    );

    switch (kind) {
        case 'home':
            return (
                <svg {...baseProps}>
                    <Background from="#1a1f2e" to={COLORS.deep} />
                    <rect x="540" y="40" width="180" height="140" fill={COLORS.base} stroke={COLORS.sky} strokeWidth="2" opacity="0.6" />
                    <line x1="630" y1="40" x2="630" y2="180" stroke={COLORS.sky} strokeWidth="1" opacity="0.4" />
                    <line x1="540" y1="110" x2="720" y2="110" stroke={COLORS.sky} strokeWidth="1" opacity="0.4" />
                    <circle cx="600" cy="80" r="22" fill={COLORS.paper} opacity="0.7" />
                    <rect x="180" y="180" width="380" height="14" fill={COLORS.accent} opacity="0.5" />
                    <rect x="200" y="194" width="8" height="60" fill={COLORS.accent} opacity="0.4" />
                    <rect x="540" y="194" width="8" height="60" fill={COLORS.accent} opacity="0.4" />
                    <ellipse cx="280" cy="180" rx="40" ry="8" fill={COLORS.paper} opacity="0.85" />
                    <ellipse cx="460" cy="180" rx="40" ry="8" fill={COLORS.paper} opacity="0.85" />
                    <line x1="370" y1="0" x2="370" y2="80" stroke={COLORS.sky} strokeWidth="1" opacity="0.4" />
                    <ellipse cx="370" cy="90" rx="40" ry="14" fill="#ffd28a" opacity="0.3" />
                    <ellipse cx="370" cy="86" rx="20" ry="6" fill="#ffd28a" />
                </svg>
            );
        case 'plane':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to={COLORS.deep} />
                    {[100, 300, 600].map((x, i) => (
                        <ellipse key={i} cx={x} cy={80 + i * 30} rx={70 + i * 20} ry={14} fill={COLORS.paper} opacity={0.08 + i * 0.04} />
                    ))}
                    <g transform="translate(360 130)">
                        <ellipse cx="0" cy="0" rx="120" ry="20" fill={COLORS.paper} opacity="0.85" />
                        <rect x="-30" y="-32" width="50" height="20" fill={COLORS.paper} opacity="0.85" rx="4" />
                        <polygon points="-120,0 -160,-25 -120,-15" fill={COLORS.paper} opacity="0.7" />
                        <polygon points="120,0 145,-15 120,-12" fill={COLORS.paper} opacity="0.85" />
                        <rect x="-40" y="-15" width="100" height="6" fill={COLORS.deep} opacity="0.5" />
                        {[-50, -10, 30, 70].map(x => (
                            <circle key={x} cx={x} cy="0" r="4" fill={COLORS.accent} />
                        ))}
                    </g>
                    <text x="60" y="50" fill={COLORS.paper} fontSize="14" fontStyle="italic" opacity="0.5" fontFamily="Georgia">Atlántico Sur — abril 1982</text>
                </svg>
            );
        case 'arrival':
            return (
                <svg {...baseProps}>
                    <Background from="#1d2538" to={COLORS.sky} />
                    <ellipse cx="400" cy="220" rx="500" ry="50" fill={COLORS.paper} opacity="0.18" />
                    <polygon points="0,200 200,100 380,180 600,80 800,200 800,280 0,280" fill={COLORS.base} opacity="0.85" />
                    <polygon points="0,230 250,140 500,200 800,150 800,280 0,280" fill={COLORS.deep} opacity="0.7" />
                    <g transform="translate(620 80)">
                        <rect x="0" y="0" width="3" height="120" fill={COLORS.paper} />
                        <rect x="3" y="2" width="80" height="14" fill="#75aadb" />
                        <rect x="3" y="16" width="80" height="14" fill={COLORS.paper} />
                        <rect x="3" y="30" width="80" height="14" fill="#75aadb" />
                    </g>
                </svg>
            );
        case 'cold':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to="#1a2b3a" />
                    {Array.from({ length: 30 }).map((_, i) => (
                        <circle key={i} cx={Math.random() * W} cy={Math.random() * H} r={Math.random() * 2 + 0.5} fill={COLORS.paper} opacity={Math.random() * 0.7 + 0.3} />
                    ))}
                    <path d={`M 0 ${H} L 150 200 L 320 220 L 480 195 L 660 215 L 800 200 L 800 ${H} Z`} fill={COLORS.base} />
                    <g transform="translate(380 150)">
                        <ellipse cx="0" cy="60" rx="34" ry="10" fill={COLORS.base} opacity="0.6" />
                        <rect x="-12" y="20" width="24" height="36" fill={COLORS.deep} opacity="0.85" />
                        <circle cx="0" cy="14" r="11" fill={COLORS.deep} opacity="0.85" />
                        <path d="M -13 12 Q 0 -2 13 12 Z" fill={COLORS.base} />
                    </g>
                    <text x="60" y="50" fill={COLORS.sky} fontSize="13" opacity="0.6" fontFamily="Georgia" fontStyle="italic">Mount Tumbledown · -2°C</text>
                </svg>
            );
        case 'friend':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.deep} to="#1f2940" />
                    <ellipse cx="400" cy="240" rx="60" ry="10" fill={COLORS.accent} opacity="0.4" />
                    <ellipse cx="400" cy="225" rx="20" ry="14" fill="#ff8a4a" opacity="0.9" />
                    <ellipse cx="400" cy="218" rx="10" ry="10" fill="#ffd28a" />
                    {[330, 470].map((cx, i) => (
                        <g key={i} transform={`translate(${cx} 130)`}>
                            <rect x="-22" y="30" width="44" height="60" fill={COLORS.base} />
                            <circle cx="0" cy="20" r="16" fill={COLORS.base} />
                            <path d="M -18 18 Q 0 0 18 18 Z" fill={COLORS.accent} opacity="0.85" />
                        </g>
                    ))}
                    <ellipse cx="400" cy="170" rx="6" ry="3" fill={COLORS.paper} opacity="0.7" />
                </svg>
            );
        case 'radio':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to={COLORS.deep} />
                    {[60, 90, 120, 150].map((r, i) => (
                        <circle key={i} cx={400} cy={140} r={r} fill="none" stroke={COLORS.accent} strokeWidth="1.5" opacity={0.7 - i * 0.15} />
                    ))}
                    <g transform="translate(370 110)">
                        <rect x="0" y="0" width="60" height="60" rx="6" fill="#3a2818" stroke={COLORS.accent} strokeWidth="2" />
                        <rect x="6" y="8" width="48" height="22" fill="#1a1208" stroke="#7c5e3e" strokeWidth="1" />
                        <text x="30" y="24" textAnchor="middle" fill={COLORS.accent} fontSize="9" fontFamily="monospace">BBC 9410</text>
                        <circle cx="14" cy="44" r="4" fill="#7c5e3e" />
                        <circle cx="46" cy="44" r="4" fill="#7c5e3e" />
                        <line x1="30" y1="-15" x2="30" y2="0" stroke={COLORS.paper} strokeWidth="1" />
                        <circle cx="30" cy="-15" r="2" fill={COLORS.paper} />
                    </g>
                </svg>
            );
        case 'hunger':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to="#1f1a17" />
                    <ellipse cx="400" cy="180" rx="140" ry="22" fill={COLORS.paper} opacity="0.85" />
                    <ellipse cx="400" cy="178" rx="120" ry="14" fill={COLORS.base} opacity="0.4" />
                    <rect x="370" y="160" width="55" height="14" rx="2" fill="#c0a880" />
                    {[378, 388, 398, 408, 418].map(x => (
                        <circle key={x} cx={x} cy="167" r="1" fill="#7c5e3e" />
                    ))}
                    <text x="400" y="80" textAnchor="middle" fill={COLORS.accent} fontSize="14" opacity="0.6" fontStyle="italic" fontFamily="Georgia">Día 9 sin pan caliente</text>
                </svg>
            );
        case 'punishment':
            return (
                <svg {...baseProps}>
                    <Background from="#0a0a0e" to="#1a1d24" />
                    {[100, 250, 550, 700].map((x, i) => (
                        <circle key={i} cx={x} cy={Math.random() * H} r={1.5} fill={COLORS.paper} opacity="0.4" />
                    ))}
                    <ellipse cx="400" cy="240" rx="380" ry="40" fill={COLORS.deep} opacity="0.4" />
                    <g transform="translate(400 200)" opacity="0.85">
                        <line x1="-90" y1="0" x2="90" y2="0" stroke={COLORS.accent} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                        <line x1="0" y1="-30" x2="0" y2="30" stroke={COLORS.accent} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                        <rect x="-12" y="-22" width="24" height="48" fill={COLORS.base} />
                        <circle cx="0" cy="-30" r="9" fill={COLORS.base} />
                        <line x1="-90" y1="0" x2="-12" y2="0" stroke={COLORS.base} strokeWidth="6" />
                        <line x1="12" y1="0" x2="90" y2="0" stroke={COLORS.base} strokeWidth="6" />
                        {[-90, 90, 0, 0].map((x, i) => (
                            <line key={i} x1={x} y1={i < 2 ? -6 : i === 2 ? -36 : 32} x2={x} y2={i < 2 ? 8 : i === 2 ? -22 : 46} stroke="#7c5e3e" strokeWidth="2" />
                        ))}
                    </g>
                </svg>
            );
        case 'naval_fire':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to="#0a1828" />
                    <path d={`M 0 200 Q 200 190 400 200 T 800 200 L 800 ${H} L 0 ${H} Z`} fill={COLORS.deep} opacity="0.85" />
                    <line x1="0" y1="200" x2="800" y2="200" stroke={COLORS.sky} strokeWidth="1" opacity="0.5" />
                    <g transform="translate(180 180)">
                        <rect x="0" y="0" width="60" height="14" fill={COLORS.base} />
                        <polygon points="0,0 -8,0 0,-4" fill={COLORS.base} />
                        <rect x="20" y="-18" width="6" height="18" fill={COLORS.base} />
                        <rect x="36" y="-12" width="4" height="12" fill={COLORS.base} />
                    </g>
                    <circle cx="240" cy="170" r="50" fill={COLORS.accent} opacity="0.4" />
                    <circle cx="240" cy="170" r="22" fill="#ffd28a" />
                    <circle cx="240" cy="170" r="8" fill={COLORS.paper} />
                    <path d="M 240 170 Q 460 60 660 110" stroke={COLORS.accent} strokeWidth="2" fill="none" strokeDasharray="4 4" opacity="0.7" />
                </svg>
            );
        case 'hospital':
            return (
                <svg {...baseProps}>
                    <Background from="#1a1f2a" to={COLORS.deep} />
                    <polygon points="200,200 600,200 540,90 260,90" fill={COLORS.paper} opacity="0.85" />
                    <polygon points="200,200 260,90 240,90 180,200" fill={COLORS.paper} opacity="0.6" />
                    <line x1="200" y1="200" x2="600" y2="200" stroke={COLORS.base} strokeWidth="2" />
                    <rect x="380" y="120" width="40" height="14" fill={COLORS.accent} />
                    <rect x="392" y="105" width="14" height="44" fill={COLORS.accent} />
                    <text x="400" y="240" textAnchor="middle" fill={COLORS.paper} fontSize="13" fontFamily="Georgia" fontStyle="italic" opacity="0.7">Hospital de campaña — Puerto Argentino</text>
                </svg>
            );
        case 'media':
            return (
                <svg {...baseProps}>
                    <Background from="#1a1d28" to={COLORS.deep} />
                    <g transform="translate(400 140) rotate(-8)">
                        <rect x="-90" y="-110" width="180" height="220" fill={COLORS.paper} stroke={COLORS.base} strokeWidth="2" />
                        <rect x="-90" y="-110" width="180" height="32" fill={COLORS.accent} />
                        <text x="0" y="-90" textAnchor="middle" fill={COLORS.paper} fontSize="16" fontWeight="900" fontFamily="Georgia">GENTE</text>
                        <text x="0" y="-50" textAnchor="middle" fill={COLORS.base} fontSize="14" fontWeight="800" fontFamily="Arial">ESTAMOS</text>
                        <text x="0" y="-30" textAnchor="middle" fill={COLORS.accent} fontSize="20" fontWeight="900" fontFamily="Arial">GANANDO</text>
                        <ellipse cx="0" cy="40" rx="50" ry="40" fill={COLORS.sky} opacity="0.4" />
                        <text x="0" y="100" textAnchor="middle" fill={COLORS.base} fontSize="9">— el sueño de un país —</text>
                    </g>
                </svg>
            );
        case 'battle':
            return (
                <svg {...baseProps}>
                    <Background from="#0a0a14" to="#1a1f2e" />
                    {[150, 380, 600].map((cx, i) => (
                        <g key={i}>
                            <circle cx={cx} cy={50 + i * 12} r="40" fill="#ffd28a" opacity="0.18" />
                            <circle cx={cx} cy={50 + i * 12} r="14" fill="#ffd28a" opacity="0.7" />
                            <circle cx={cx} cy={50 + i * 12} r="4" fill={COLORS.paper} />
                        </g>
                    ))}
                    <polygon points="0,280 250,160 480,200 700,140 800,210 800,280" fill={COLORS.base} />
                    <polygon points="0,280 100,210 250,260 480,250 800,280" fill={COLORS.deep} opacity="0.6" />
                    {[180, 320, 540, 680].map((x, i) => (
                        <circle key={i} cx={x} cy={170 + (i * 7) % 30} r="3" fill={COLORS.accent} />
                    ))}
                </svg>
            );
        case 'surrender':
            return (
                <svg {...baseProps}>
                    <Background from="#1a1f2e" to={COLORS.base} />
                    <ellipse cx="400" cy="220" rx="500" ry="60" fill={COLORS.paper} opacity="0.1" />
                    <line x1="500" y1="40" x2="500" y2="220" stroke={COLORS.paper} strokeWidth="2" />
                    <path d="M 500 50 Q 580 60 600 90 Q 580 100 500 90 Z" fill={COLORS.paper} opacity="0.85" />
                    <g transform="translate(280 220) rotate(-25)">
                        <rect x="0" y="-3" width="80" height="6" fill={COLORS.base} />
                        <rect x="80" y="-2" width="40" height="4" fill={COLORS.base} />
                        <rect x="115" y="-6" width="20" height="14" fill={COLORS.base} />
                        <line x1="60" y1="-3" x2="65" y2="3" stroke={COLORS.accent} strokeWidth="2" />
                    </g>
                    <text x="400" y="260" textAnchor="middle" fill={COLORS.paper} fontSize="14" fontStyle="italic" fontFamily="Georgia" opacity="0.85">14 de junio de 1982</text>
                </svg>
            );
        case 'prisoner':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to="#1a1f24" />
                    {[80, 130, 180].map((y, i) => (
                        <g key={i}>
                            <line x1="0" y1={y} x2="800" y2={y - 8} stroke={COLORS.paper} strokeWidth="1.5" opacity="0.7" />
                            {Array.from({ length: 12 }).map((_, j) => (
                                <g key={j} transform={`translate(${60 + j * 60} ${y - j * 0.7})`}>
                                    <line x1="-8" y1="-8" x2="8" y2="8" stroke={COLORS.paper} strokeWidth="1" opacity="0.6" />
                                    <line x1="-8" y1="8" x2="8" y2="-8" stroke={COLORS.paper} strokeWidth="1" opacity="0.6" />
                                </g>
                            ))}
                        </g>
                    ))}
                    <g transform="translate(620 220) rotate(-12)">
                        <rect x="-70" y="-22" width="140" height="44" fill="none" stroke={COLORS.accent} strokeWidth="3" />
                        <text x="0" y="6" textAnchor="middle" fill={COLORS.accent} fontWeight="900" fontFamily="Georgia" fontSize="18">PW · 1982</text>
                    </g>
                </svg>
            );
        case 'return':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.deep} to="#1a1f28" />
                    <path d="M 0 220 Q 400 230 800 220" stroke={COLORS.paper} strokeWidth="2" fill="none" />
                    <path d="M 80 230 L 120 230 M 200 230 L 240 230 M 320 230 L 360 230 M 440 230 L 480 230 M 560 230 L 600 230 M 680 230 L 720 230" stroke={COLORS.paper} strokeWidth="3" />
                    <g transform="translate(380 170)">
                        <rect x="-50" y="-20" width="100" height="40" rx="6" fill={COLORS.accent} />
                        <rect x="-46" y="-14" width="20" height="14" fill={COLORS.sky} opacity="0.7" />
                        <rect x="-22" y="-14" width="20" height="14" fill={COLORS.sky} opacity="0.7" />
                        <rect x="2" y="-14" width="20" height="14" fill={COLORS.sky} opacity="0.7" />
                        <rect x="26" y="-14" width="20" height="14" fill={COLORS.sky} opacity="0.7" />
                        <circle cx="-30" cy="22" r="8" fill={COLORS.base} />
                        <circle cx="30" cy="22" r="8" fill={COLORS.base} />
                    </g>
                    <circle cx="650" cy="60" r="20" fill={COLORS.paper} opacity="0.5" />
                </svg>
            );
        case 'reunion':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.paper} to="#d4cdbf" />
                    {[280, 520].map((cx, i) => (
                        <g key={i} transform={`translate(${cx} 100)`}>
                            <rect x="-30" y="40" width="60" height="100" fill={COLORS.deep} />
                            <circle cx="0" cy="25" r="22" fill={COLORS.base} />
                            <line x1={i === 0 ? 30 : -30} y1="80" x2="400" y2="120" stroke={COLORS.base} strokeWidth="3" />
                        </g>
                    ))}
                    <circle cx="400" cy="220" r="18" fill={COLORS.accent} />
                    <text x="400" y="260" textAnchor="middle" fill={COLORS.deep} fontSize="14" fontStyle="italic" fontFamily="Georgia">"Volveríamos a ese frío si fuera a abrazarte."</text>
                </svg>
            );
        case 'mail':
            return (
                <svg {...baseProps}>
                    <Background from={COLORS.base} to="#1f1a17" />
                    <g transform="translate(400 140) rotate(-6)">
                        <rect x="-110" y="-70" width="220" height="140" fill={COLORS.paper} stroke={COLORS.base} strokeWidth="2" />
                        <polygon points="-110,-70 0,0 110,-70" fill="#dccdb5" />
                        <line x1="-110" y1="70" x2="0" y2="0" stroke={COLORS.base} strokeWidth="1.5" />
                        <line x1="110" y1="70" x2="0" y2="0" stroke={COLORS.base} strokeWidth="1.5" />
                        <rect x="60" y="-58" width="38" height="44" fill={COLORS.accent} />
                        <text x="79" y="-30" textAnchor="middle" fill={COLORS.paper} fontSize="9" fontWeight="900">CORREO</text>
                        <text x="-90" y="-30" fill={COLORS.deep} fontSize="13" fontStyle="italic" fontFamily="Georgia">Para mi hijo</text>
                    </g>
                </svg>
            );
        default:
            return (
                <svg {...baseProps}>
                    <Background />
                    <circle cx="400" cy="140" r="80" fill={COLORS.accent} opacity="0.3" />
                    <circle cx="400" cy="140" r="50" fill={COLORS.sky} opacity="0.5" />
                    <circle cx="400" cy="140" r="20" fill={COLORS.paper} />
                </svg>
            );
    }
};

// ─── ESTRUCTURA DEL JUEGO ─────────────────────────────────────────────
// Cada escena tiene: mood (audio), day (X/74), kind (svg fallback),
// img opcional, choices con effects.
const SCENES = {
    intro: {
        img: '/malvinas_intro.png',
        mood: 'home', day: 0,
        chapter: 'Prólogo', title: 'Otoño 1982 · Buenos Aires',
        text: 'Tenés 18 años. Acabás de empezar el Servicio Militar Obligatorio en Campo de Mayo y tu mundo no es más grande que las calles de tu barrio. Una mañana de abril, de forma abrupta, anuncian por altavoz: "Hoy todos los conscriptos forman para una misión especial". Te entregan un casco verde demasiado pesado, un fusil FAL viejo con la correa gastada, y un boleto de avión hacia un sur helado que apenas conocés de los mapas escolares.\n\nEl sargento te grita el apellido rompiendo el silencio. Hay nervios palpables pero también un orgullo confuso flotando en el aire. Algunos compañeros se ríen para no dejar escapar el llanto. Tu cuerpo, tenso y congelado, todavía no termina de entender hacia qué abismo te están empujando.',
        choices: [
            { label: 'Subo al avión sin preguntar. Cumplo mi deber.', next: 'casa_familia', effects: { miedo: +1, conviccion: +2 } },
            { label: 'Le pregunto al sargento a dónde vamos exactamente.', next: 'pregunta_sgto', effects: { miedo: 0, conviccion: +1, info: +2 } },
            { label: 'Intento avisarle a mi mamá antes de partir.', next: 'casa_familia', effects: { miedo: +2, empatia: +1, conviccion: -1 } }
        ]
    },
    casa_familia: {
        img: '/malvinas_casa.png', mood: 'home', day: 0,
        chapter: '0', title: 'La cena que no fue',
        text: 'Esa noche, mientras esperás el llamado a la formación final, te acordás de la última cena del domingo. Mamá había hecho milanesas con puré. Tu hermana chica te contaba un chiste de la escuela y vos no te reíste porque ya estabas pensando en el cuartel.\n\nAhora, sentado en el catre, con la mochila a tus pies, te das cuenta: no le diste el beso de despedida. No te despediste de tu perro. No le respondiste el último mensaje a tu novia.\n\nMañana muy temprano partís en avión.',
        choices: [
            { label: 'Escribo una carta breve y le pido al cabo que la envíe.', next: 'avion', effects: { empatia: +3, salud: +1 } },
            { label: 'Cierro los ojos. Pienso en mamá calentándome la leche.', next: 'avion', effects: { empatia: +2, miedo: +1 } },
            { label: 'Me prometo volver vivo para terminar lo que dejé sin terminar.', next: 'avion', effects: { conviccion: +3, salud: +1 } }
        ]
    },
    pregunta_sgto: {
        img: '/malvinas_cuartel2.png', mood: 'tense', day: 0,
        chapter: '1', title: 'En el cuartel',
        text: '"Vamos a recuperar nuestras Malvinas, soldado. Los ingleses las ocupan desde hace 149 años y las vamos a recuperar." El sargento te mira fijo y severo. "¿Alguna duda?"\n\nUn par de compañeros tuyos asienten con orgullo. Otros tragan saliva. Vos pensás en el mapa que te mostró el profesor de Geografía en quinto año: dos islas grises en una esquina del Atlántico, lejos de todo.',
        info: 'La ocupación británica data del 3 de enero de 1833. La decisión militar de 1982 fue tomada por la Junta Dictatorial liderada por Galtieri sin consultar al pueblo, en parte para canalizar el descontento social por la crisis económica y los crímenes del régimen.',
        choices: [
            { label: 'Saludo firme y avanzo hacia la formación.', next: 'casa_familia', effects: { conviccion: +2, info: +1 } },
            { label: 'Me quedo callado, mirando al suelo.', next: 'casa_familia', effects: { miedo: +1, info: +1 } }
        ]
    },
    avion: {
        img: '/malvinas_avion2.png',
        mood: 'tense', day: 1,
        chapter: '1', title: 'Vuelo al sur',
        text: 'El Hércules está repleto, sofocante y ensordecedor. Sus gigantescas turbinas hacen vibrar cada centímetro de chapa del fuselaje, metiéndose en los huesos. Los muchachos, tratando de espantar el silencio, cantan la Marcha de Malvinas a todo pulmón; algunos ya van por la quinta vez. Hay risas nerviosas, bromas pesadas para disimular la ansiedad, y un suboficial en el rincón que reza apretando un rosario.\n\nMirás por la pequeña ventanilla circular y descubrís, a través de un denso colchón de nubes blancas, la inmensidad del Atlántico Sur: oscuro, profundo e infinito. Algunos en este avión jamás habían salido de los límites de su provincia. Muchos jamás habían visto la nieve o sentido verdadero frío. Demasiados no van a tener la oportunidad de volver.\n\nUn cabo te reparte de prisa una hoja de papel en blanco. "Si querés escribirle unas últimas líneas a tu vieja, hacelo ahora. Allá, en el barro, después no se va a poder".',
        choices: [
            { label: 'Escribo: "No te preocupes mami, vuelvo pronto."', next: 'islas', effects: { empatia: +2 } },
            { label: 'Escribo todo lo que siento: el miedo, la nieve, la lejanía.', next: 'islas', effects: { empatia: +3, miedo: +2 } },
            { label: 'Guardo la hoja en blanco en el bolsillo interno.', next: 'islas', effects: { miedo: +1 } }
        ]
    },
    islas: {
        img: '/malvinas_llegada.png',
        mood: 'cold', day: 2,
        chapter: '2', title: 'Puerto Argentino',
        text: 'Al bajar la rampa del avión, el viento te corta la cara como si te hubieran tirado un balde de cuchillos. Hace 2°C. Llovizna helada y horizontal. Todo huele a turba húmeda y a combustible JP-1 derramado.\n\nTu sección es asignada a defender el Monte Tumbledown, un cerro pelado al oeste de Puerto Argentino. La orden es clara y categórica: hay que cavar pozos de zorro en la piedra. Los ingleses van a venir desde el mar; hay que esperarlos.\n\nUn cabo veterano te muestra el suelo: "Pico, pala, paciencia. Y cuidado con el agua subterránea."',
        info: 'El suelo malvinense es turbera: retiene el agua y al cavar trincheras ("pozos de zorro"), el agua subterránea inundaba el foso. Los soldados vivían empapados a temperaturas bajo cero, lo que provocó miles de casos de pie de trinchera y congelamientos.',
        choices: [
            { label: 'Pico la piedra rápido para armar una buena defensa.', next: 'guardia_nocturna', effects: { conviccion: +2, hambre: +1 } },
            { label: 'Ayudo primero a los compañeros que no tienen palas.', next: 'guardia_nocturna', effects: { empatia: +3, conviccion: +1, hambre: +1 } },
            { label: 'Cavo despacio, tratando de conservar la poca energía.', next: 'guardia_nocturna', effects: { miedo: +1, frio: +2 } }
        ]
    },
    guardia_nocturna: {
        img: '/malvinas_guardia2.png', mood: 'cold', day: 3,
        chapter: '3', title: 'Primera Guardia',
        text: '2 AM. Tu turno de vigilancia. Estás solo en la intemperie. La humedad se cuela por los puños del capote y se mete en los huesos. La campera militar de mala calidad parece de papel mojado.\n\nA lo lejos escuchás el cañoneo naval británico contra la pista del aeropuerto. Cada estallido te hace temblar el suelo bajo las botas. Mirás las estrellas: en Buenos Aires nunca se veían tantas. Acá sí. Acá brillan como si fueran clavos en el techo del mundo.\n\nIntentás recordar el olor del café con leche de tu casa pero no lo lográs. El frío borra los olores antes que los recuerdos.',
        choices: [
            { label: 'Abrazo mi fusil para tratar de no temblar.', next: 'amigo', effects: { frio: +2, miedo: +2 } },
            { label: 'Me pongo a pensar en la cocina caliente de mi casa.', next: 'amigo', effects: { empatia: +1, frio: +2, hambre: +1 } },
            { label: 'Intento mantener la visión enfocada en el horizonte.', next: 'amigo', effects: { conviccion: +1, frio: +1 } }
        ]
    },
    amigo: {
        img: '/malvinas_radio.png', mood: 'home', day: 4,
        chapter: '4', title: 'Ramón',
        text: 'Al día siguiente descubrís que tu compañero de pozo es Ramón Antúnez, de un pueblo cerca de Goya, Corrientes. Tiene 19 años, una hermana enferma y una novia llamada Alicia que le tejió tres pulóveres de lana gruesa. "Pero no me dejaron traer ni uno", te cuenta riéndose para no llorar.\n\nA la noche, Ramón saca un transistor a pilas que escondió en la mochila bajo unas medias. Sintoniza onda corta. La señal viene y va con el viento. Una voz seca dice algo en inglés. Después llega un acento uruguayo: "Versión británica indica que el avance hacia Puerto Argentino es sostenido."',
        info: 'Para contrarrestar la censura del gobierno dictatorial argentino que insistía con "Estamos ganando", muchos soldados sintonizaban radios uruguayas (Radio Carve de Montevideo era muy escuchada) o la propia BBC para entender la realidad del terreno.',
        choices: [
            { label: 'Sintonizo radio de Argentina. Necesito buenas noticias.', next: 'oficial_humano', effects: { conviccion: +2, info: -2 } },
            { label: 'Sintonizo una radio de afuera (BBC/Uruguay).', next: 'oficial_humano', effects: { conviccion: -1, info: +3, miedo: +1 } },
            { label: 'Apago la radio. No me importa lo que digan allá lejos.', next: 'oficial_humano', effects: { empatia: +1 } }
        ]
    },
    oficial_humano: {
        img: '/malvinas_oficial.png', mood: 'home', day: 5,
        chapter: '4', title: 'El Subteniente Mendoza',
        text: 'Al amanecer aparece en el pozo el Subteniente Carlos Mendoza, un cordobés de 24 años recién egresado del Colegio Militar. No es como los otros oficiales. Lleva la misma cara de cansancio que vos.\n\n"Pibes" — les dice — "vengo de la cocina del Estado Mayor. Me afané dos latas." Las pone sobre el barro: corned beef y duraznos en almíbar. "Compártanlas. Y si alguien pregunta, no me vieron."\n\nAntes de irse te aprieta el hombro y te dice: "Vos sos de Buenos Aires, ¿no? Tengo una novia ahí. Si no vuelvo, contale que la pensé hasta el final."',
        info: 'Hubo oficiales y suboficiales argentinos que se comportaron con dignidad y empatía hacia la tropa, contrastando con los casos documentados de maltrato. Muchos cayeron en combate junto a sus conscriptos. La memoria de Malvinas también es la de ellos.',
        choices: [
            { label: 'Le prometo que voy a buscar a su novia si vuelvo.', next: 'hambre', effects: { empatia: +4, conviccion: +1 } },
            { label: 'Le doy las gracias. Compartimos las latas con todo el pozo.', next: 'hambre', effects: { empatia: +3, hambre: -2 } },
            { label: 'Me como mi parte y guardo el resto para Ramón.', next: 'hambre', effects: { empatia: +2, hambre: -1 } }
        ]
    },
    hambre: {
        img: '/malvinas_hambre.png', mood: 'tense', day: 14,
        chapter: '5', title: 'La logística rota',
        text: 'Pasaron 9 días desde la última ración caliente. La "ración de combate" — un mate cocido fingido y un caldo de oveja aguado — llega tarde y fría, si es que llega. La artillería enemiga cortó casi todos los suministros desde San Carlos.\n\nUn grupo del pozo de al lado planea una incursión nocturna a Puerto Argentino para robar comida del depósito reservado a los oficiales. "Allá hay corned beef, fideos, dulce de leche, vino", susurra uno con los ojos brillantes. "Está todo, pibe. Está todo."',
        info: 'El desabastecimiento fue dramático. Las diferencias de provisiones entre oficiales de alto rango y suboficiales/conscriptos crearon graves tensiones. La desnutrición aguda fue diagnosticada en cientos de soldados al volver al continente.',
        choices: [
            { label: 'Me uno al grupo. La necesidad es más fuerte.', next: 'castigo', effects: { hambre: -2, miedo: +2 } },
            { label: 'Decido aguantar. Es peligroso si nos descubren.', next: 'ataque_aereo_previo', effects: { hambre: +3, conviccion: +1 } },
            { label: 'Le doy lo último que me queda a Ramón, que está peor.', next: 'ataque_aereo_previo', effects: { empatia: +4, hambre: +4, salud: -1 } }
        ]
    },
    castigo: {
        img: '/malvinas_castigo.png', mood: 'tense', day: 16,
        chapter: '5', title: 'Descubiertos',
        text: 'Madrugada. La incursión sale mal. Un cabo los sorprende a la vuelta y les arranca las latas de las manos. A uno de los pibes — Sosa, de Tucumán, 18 años — el cabo lo manda al "estaqueamiento": cuatro estacas en la tierra helada, las muñecas y los tobillos atados, la cara contra el barro mojado.\n\nLo dejan tres horas. Cuando lo desatan no se puede parar. Tiene los dedos azules y las venas explotadas en las piernas. Pasarán semanas hasta que la denuncia llegue a Buenos Aires.',
        info: 'Los estaqueamientos están documentados como tortura grave por veteranos sobrevivientes y constituyen causas judiciales abiertas. En 2023 la Cámara Federal de Comodoro Rivadavia los calificó formalmente como "delitos de lesa humanidad".',
        choices: [
            { label: 'Trato de cubrir a Sosa durante la noche con mi capote.', next: 'ataque_aereo_previo', effects: { empatia: +3, miedo: +1, frio: +2 } },
            { label: 'Trago saliva y guardo mi frustración para sobrevivir.', next: 'ataque_aereo_previo', effects: { miedo: +2, info: +2 } }
        ]
    },
    ataque_aereo_previo: {
        img: '/malvinas_collage2.png', mood: 'battle', day: 50,
        chapter: '6', title: 'Fuego naval',
        text: 'Mayo avanza. Los británicos desembarcan en San Carlos el 21. Avanzan lento pero seguros. Las noches se vuelven una pesadilla de hierro: barcos británicos disparan andanadas de cañón naval sobre las posiciones argentinas para quebrar la moral y no dejarlos dormir.\n\nLos proyectiles silban sobre el techo de la trinchera. Cada uno suena como un tren cayendo del cielo. Algunos explotan a metros, otros a kilómetros. Nunca sabés cuál te va a tocar.\n\nRamón te aprieta el brazo. No habla. Tiene los ojos cerrados y la boca apretada. Vos sentís el corazón en las orejas.',
        choices: [
            { label: 'Tapo mis oídos y rezo.', next: 'paramedico', effects: { miedo: +3 } },
            { label: 'Me asomo para intentar ver de dónde disparan.', next: 'paramedico', effects: { conviccion: +2, miedo: +1 } },
            { label: 'Acuno a Ramón, que entró en pánico.', next: 'paramedico', effects: { empatia: +3 } }
        ]
    },
    paramedico: {
        img: '/malvinas_paramedico2.png', mood: 'battle', day: 52,
        chapter: '6', title: 'Sangre joven',
        text: 'Antes del amanecer, una explosión muy cercana. Salen cuatro pibes corriendo del pozo de al lado. Tres traen al cuarto desmayado, sangrando del muslo. Le tiraron una andanada arriba.\n\nEl paramédico — un suboficial que en la vida civil era enfermero en Mar del Plata — corta el pantalón con tijera y aprieta. "Pinza, pinza, pinza", grita. No hay morfina. Le dan whisky de una petaca.\n\nEl chico abre los ojos. Pregunta por su mamá. El paramédico dice que sí, que ya viene, mientras ata el torniquete con desesperación.',
        info: 'Los paramédicos y enfermeros argentinos en Malvinas trabajaron con suministros mínimos en hospitales de campaña improvisados. Salvaron cientos de vidas con coraje y muchos cayeron junto a quienes intentaban salvar.',
        choices: [
            { label: 'Le tomo la mano al chico mientras lo trasladan.', next: 'hospital_campana', effects: { empatia: +3, miedo: +1 } },
            { label: 'Ayudo al paramédico cargando vendajes.', next: 'hospital_campana', effects: { empatia: +2, info: +1 } },
            { label: 'Vuelvo a mi pozo. No puedo soportar la imagen.', next: 'hospital_campana', effects: { miedo: +3, salud: -1 } }
        ]
    },
    hospital_campana: {
        img: '/malvinas_hospital.png', mood: 'tense', day: 60,
        chapter: '7', title: 'Congelamiento',
        text: 'Amanece y al sacarte las botas no sentís los dedos del pie izquierdo. Cuando los ves, están negros. Negros como los de un cadáver. El sargento te ordena ir caminando hasta el hospital de campaña en Puerto Argentino. Cuatro kilómetros que se sienten cuarenta.\n\nAdentro hay decenas de pibes como vos. Algunos sin un dedo, otros sin un pie. Una enfermera de Catamarca te lava con agua tibia. Te dice algo en voz baja para que no la escuche el médico: "Mové los dedos así, así. Quizás todavía los podés salvar."\n\nMirás el techo de lona y entendés: esto que vivís no se lo van a creer en tu casa.',
        info: 'El "Pie de trinchera" se causaba por la humedad permanente, la inmovilidad y el congelamiento. Generó múltiples amputaciones que hubieran sido evitables con el abrigo que las familias enviaban al continente — pero las donaciones llamadas "Operación Lana" jamás llegaron en su mayoría a las islas.',
        choices: [
            { label: 'Pido volver a mi pozo. Está Ramón ahí y viene el ataque final.', next: 'medios', effects: { conviccion: +3, empatia: +2, frio: -1 } },
            { label: 'Dejo que los médicos me atiendan y descanso un poco.', next: 'medios', effects: { frio: -3, hambre: -1, salud: +2 } }
        ]
    },
    medios: {
        img: '/malvinas_medios2.png', mood: 'tense', day: 65,
        chapter: '8', title: 'Revistas del continente',
        text: 'En la sala de espera del hospital ves una pila de revistas "Gente" llegada en un Hércules de logística. La tapa muestra a una madre sonriente con la foto de su hijo conscripto. El título grita en mayúsculas: "ESTAMOS GANANDO".\n\nAdentro hay listas de donaciones millonarias: golosinas, abrigos, cigarrillos, chocolates. Toneladas. Vos no comiste un chocolate en treinta días.\n\nUn compañero, sentado al lado tuyo, abre la revista. Lee los nombres. Después la cierra y mira al vacío. "Mi vieja debe estar leyendo esto ahora mismo en el living", dice.',
        choices: [
            { label: 'Lloro de impotencia. Alguien nos mintió todo este tiempo.', next: 'final_ataque', effects: { info: +3, miedo: +1 } },
            { label: 'Tiro la revista. Acá la única verdad es el plomo que viene.', next: 'final_ataque', effects: { conviccion: +1, empatia: -1 } },
            { label: 'Guardo una página para mostrarle a mi familia cuando vuelva.', next: 'final_ataque', effects: { info: +2, conviccion: +2 } }
        ]
    },
    final_ataque: {
        img: '/malvinas_batalla.png', mood: 'battle', day: 73,
        chapter: '9', title: 'La Batalla Final',
        text: 'Noche del 13 al 14 de junio de 1982. Monte Longdon, Dos Hermanas y Tumbledown caen uno tras otro. Todo es fuego intenso, bengalas británicas que iluminan los cerros como si fuera mediodía blanco, gritos en dos idiomas, disparos que pasan zumbando.\n\nVos y Ramón están atrincherados con el último cargador. A 200 metros se escucha la respiración del enemigo entre las piedras. Un compañero al lado tuyo grita "¡Viva la Patria!". Otro reza. Otro llora. Otro hace todas esas cosas a la vez.\n\nLa orden por radio es clara: aguantar hasta el último cartucho. Nadie te dice qué hacer después.',
        info: 'Los enfrentamientos cuerpo a cuerpo en los cerros perimetrales fueron de altísima intensidad. Algunos grupos resistieron hasta agotar municiones contra tropas de élite paracaidistas británicas que avanzaban en la noche con visión nocturna. Por la madrugada del 14 quedó claro que la posición era insostenible.',
        choices: [
            { label: 'Soporto la posición y devuelvo el fuego hasta el final.', next: 'rendicion', effects: { conviccion: +4, miedo: +3 } },
            { label: 'Trato de replegar al grupo a una posición segura.', next: 'rendicion', effects: { empatia: +2, info: +2 } },
            { label: 'Todo es caos. Sigo a Ramón a ciegas, lo tomo del brazo.', next: 'rendicion', effects: { miedo: +4, empatia: +2 } }
        ]
    },
    rendicion: {
        img: '/malvinas_rendicion2.png', mood: 'cold', day: 74,
        chapter: '10', title: 'La rendición',
        text: 'Humo blanco sobre Puerto Argentino. La orden es romper las armas y rendirse. Vos rompés el cerrojo de tu fusil contra una roca. El golpe seco te suena como el cierre de un libro.\n\nEl General Menéndez firma la capitulación a las 23:30 horas. Caminás hacia el galpón gris donde te van a registrar como prisionero de guerra. Hay miles. Pibes mojados, sucios, hambrientos, callados. Un teniente inglés joven, casi de tu edad, te ofrece un cigarrillo. Lo aceptás.\n\nTerminó. 74 días que cambiaron para siempre quién eras.',
        info: 'Saldo del conflicto: 649 caídos argentinos, 255 británicos y 3 isleños. Los conscriptos argentinos fueron capturados, registrados en el Boletín de Cautivos y devueltos al continente en barcos transatlánticos como el Canberra y vuelos comerciales fletados.',
        choices: [
            { label: 'Cierro los ojos, respiro la paz de estar vivo.', next: 'prisionero', effects: { empatia: +1, salud: +1 } },
            { label: 'Siento vergüenza de haber perdido.', next: 'prisionero', effects: { conviccion: -2, miedo: +1 } },
            { label: 'Juro que nadie los va a olvidar.', next: 'prisionero', effects: { info: +3, conviccion: +2 } }
        ]
    },
    prisionero: {
        img: '/malvinas_prisionero.png', mood: 'cold', day: 75,
        chapter: '10', title: 'Prisionero de guerra',
        text: 'Te alojan en el galpón de un frigorífico abandonado. Hay alambre de púas y guardias. Pero también — para tu sorpresa — hay galletas inglesas con manteca, té caliente, primeros vendajes que no viste en 60 días. Un médico militar inglés te examina los pies y dice algo en su idioma; otro traduce: "Por suerte vas a conservarlos".\n\nA tu lado, Ramón duerme por primera vez en semanas. Tres horas seguidas. Cuando se despierta, te pregunta si esto es el cielo. "No, Ramón. Es el principio de la vuelta."\n\nDos días después los embarcan en el Canberra rumbo a Puerto Madryn.',
        memories: (path) => {
            const lines = [];
            if (path.some(p => p.label.includes('Acuno a Ramón'))) lines.push('Te das cuenta de algo: aquella noche bajo el fuego naval cuando lo abrazaste, lo tuyo no fue valentía. Fue todo lo contrario. Y ahí está él durmiendo profundo, vivo, junto a vos.');
            if (path.some(p => p.label.includes('Le doy lo último'))) lines.push('La galletita inglesa se siente extraña en la mano. Pensás que las pocas raciones que le diste a Ramón en Tumbledown valieron cada gramo de hambre tuyo.');
            if (path.some(p => p.label.includes('Trato de cubrir a Sosa'))) lines.push('Sosa, el de Tucumán al que cubriste con tu capote, está en otro galpón. Lo ves de lejos por una rendija. Levanta la mano. Vos también.');
            return lines;
        },
        choices: [
            { label: 'Le pido a Ramón que me prometa volver a vernos en libertad.', next: 'regreso', effects: { empatia: +3 } },
            { label: 'Hablo con el médico inglés en mi inglés básico de la escuela.', next: 'regreso', effects: { info: +2, salud: +1 } },
            { label: 'Me quedo callado. Ya no me salen palabras.', next: 'regreso', effects: { miedo: +2, salud: -1 } }
        ]
    },
    regreso: {
        img: '/malvinas_hero.png', mood: 'tense', day: 90,
        chapter: 'Epílogo', title: 'La vuelta del silencio',
        text: 'Desembarcan en Puerto Madryn una madrugada, a escondidas. El gobierno teme que los argentinos vean en sus propios ojos lo que pasó. No hay banderas, no hay diarios, no hay aplausos. Hay micros sin parar y rutas vacías hasta Bahía Blanca.\n\nEn casa, tu mamá dejó tu cama tendida intacta los 74 días. Pero esa misma semana, los vecinos cruzan a la otra vereda cuando te ven. La frase "héroe de Malvinas" tarda 25 años en pronunciarse en voz alta.\n\nLos primeros años son los del olvido oficial: la "desmalvinización". Te ofrecen un trabajo en una panadería; el dueño te dice "que lo de Malvinas no se diga acá, ¿no?". Te quedan los amigos del CECIM y las cartas de Ramón desde Corrientes.',
        memories: (path, stats) => {
            const lines = [];
            if (path.some(p => p.label.includes('Escribo una carta breve'))) lines.push('Tu mamá te muestra la carta que escribiste antes de partir: la guardó en una caja de zapatos junto al escapulario y una foto del perro. Está abierta, abierta, abierta. La leyó cien veces.');
            if (path.some(p => p.label.includes('No te preocupes mami'))) lines.push('La carta del avión, la que decía "vuelvo pronto", tu mamá la tiene pegada en el espejo de la cómoda. Te dice que la leía cada noche para dormirse.');
            if (path.some(p => p.label.includes('Le prometo que voy a buscar a su novia'))) lines.push('El Subteniente Mendoza no volvió. Cumplís tu promesa: buscás a su novia, la encontrás en una facultad de Belgrano. Ella te abraza llorando entre las aulas. "Lo soñé toda la guerra", te dice.');
            if (path.some(p => p.label.includes('Guardo una página para mostrarle'))) lines.push('Le mostrás a tu mamá la página que arrancaste de la revista Gente en el hospital de campaña. Le explicás todo. Ella la rompe en pedazos sobre la mesa de la cocina y se queda mirando el rincón.');
            if (stats.frio >= 7) lines.push('Cada cambio de tiempo te punzan los pies. Aprendiste el nombre técnico de tu dolencia recién en una atención médica del CECIM, años después: secuelas de pie de trinchera.');
            if (stats.empatia >= 7) lines.push('Ramón te llama por teléfono cada primer domingo del mes. Treinta años. Treinta años de domingos.');
            return lines;
        },
        info: 'Más de 500 veteranos argentinos se suicidaron en las décadas posteriores a 1982 por trastorno de estrés post-traumático, falta de reconocimiento social, abandono del Estado e incapacidad para reinsertarse. Hubo que esperar hasta 2007 para que la Pensión Vitalicia para Veteranos de Guerra fuera reformada significativamente.',
        choices: [
            { label: 'Me sumo al CECIM. Acompañar a otros me devuelve algo.', next: 'reencuentro', effects: { empatia: +3, info: +2 } },
            { label: 'Me encierro. No quiero hablar con nadie del tema.', next: 'reencuentro', effects: { miedo: +2, salud: -2 } },
            { label: 'Estudio. Quiero entender por qué pasó lo que pasó.', next: 'reencuentro', effects: { info: +4, conviccion: +1 } }
        ]
    },
    reencuentro: {
        img: '/malvinas_soldado_reflexion2.png', mood: 'reunion', day: null,
        chapter: 'Epílogo II', title: '10 años después',
        text: 'Año 1992. La inmensa plaza San Martín de Buenos Aires está iluminada débilmente por cientos de velitas que parpadean contra el viento. Es el décimo aniversario. Ramón viajó desde su pueblo en Corrientes en un colectivo destartalado de 18 horas de viaje solo para verte. Te abraza fuerte, con esa fuerza bruta que solo se aprende en la guerra. Te presenta a su hija pequeña: la llamó Malvina, y la sostiene orgulloso en brazos.\n\n"Pibe...", te murmura apretando su frente contra la tuya, con los ojos vidriosos. "Volveríamos a ese frío maldito mil veces... si fuera para abrazarnos de nuevo".\n\nEn la plaza brillan exactamente 649 velitas silenciosas. Una por cada compañero que se quedó haciendo guardia eterna en el sur. La velita de Sosa, el chico de Tucumán, está justo en el centro. La encendiste vos con las manos temblando. Ramón te aprieta el hombro. Una llovizna fina y fría comienza a caer sobre la ciudad, pero nadie en la plaza se mueve un solo centímetro.',
        memories: (path, stats) => {
            const lines = [];
            if (path.some(p => p.label.includes('Me sumo al CECIM'))) lines.push('Mirás alrededor: media plaza son compañeros del CECIM. Vos los trajiste a muchos. Acompañaste sus papeles, sus pensiones, sus crisis. Esta plaza la armaste un poco vos.');
            if (path.some(p => p.label.includes('Estudio'))) lines.push('Hace dos meses presentaste tu tesina sobre Malvinas en la facultad. La gente aplaudió de pie. Tu vieja vino con la bufanda azul y blanco que tejió para vos en 1982 y nunca te llegó a las islas.');
            if (path.some(p => p.label.includes('Me encierro'))) lines.push('Es la primera plaza pública a la que entrás en diez años. Ramón te sacó de tu casa casi a la fuerza. Te das cuenta, llorando, de que estuvo bien venir.');
            if (stats.miedo >= 8) lines.push('Cuando una bengala publicitaria estalla a lo lejos, te agachás instintivamente. Ramón te pone la mano en la espalda. "Tranquilo, hermano. Estás en Buenos Aires. Estás conmigo."');
            return lines;
        },
        info: 'El CECIM (Centro de Excombatientes de las Islas Malvinas) y otras organizaciones de veteranos sostuvieron durante décadas el reclamo por reconocimiento, salud, educación y pensiones. Su trabajo militante y el aporte del Equipo Argentino de Antropología Forense permitieron, a partir de 2017, identificar a casi 120 caídos del Cementerio de Darwin.',
        choices: [
            { label: 'Descubrir cómo el viaje me ha marcado para siempre →', next: 'final', effects: {} }
        ]
    },
    mama: {
        chapter: '1', title: 'Sin opción', mood: 'tense', day: 0,
        text: 'No hay teléfono fijo libre y hay orden estricta de no difundir movimientos de tropas. La fila al único teléfono público es de cien personas. Tu mamá no se entera hasta tres días después cuando lo dicen por cadena nacional.',
        choices: [
            { label: 'Subir al avión con angustia contenida.', next: 'avion', effects: { miedo: +1, salud: -1 } }
        ]
    }
};

const initialStats = {
    miedo: 0, conviccion: 0, empatia: 0, info: 0, frio: 0, hambre: 0, salud: 0
};

const STAT_META = {
    empatia: { label: 'Empatía', color: '#43a047', icon: Heart },
    conviccion: { label: 'Convicción', color: COLORS.accent, icon: Compass },
    miedo: { label: 'Miedo / Trauma', color: '#9c27b0', icon: AlertTriangle },
    info: { label: 'Conciencia crítica', color: COLORS.sky, icon: BookOpen },
    frio: { label: 'Daño por frío', color: '#3b82f6', icon: Snowflake },
    hambre: { label: 'Desnutrición', color: '#f59e0b', icon: Utensils },
    salud: { label: 'Reservas físicas', color: '#10b981', icon: HeartPulse }
};

const interpretStat = (key, value) => {
    const high = value >= 7, mid = value >= 4 && value < 7;
    if (key === 'empatia') return high ? 'Te acordás del nombre y el pueblo de cada compañero del pozo.' : mid ? 'Aprendiste a apretar manos en silencio.' : 'Volviste cerrado, cuesta hablar de lo de allá.';
    if (key === 'conviccion') return high ? 'Cada 2 de abril te ponés la escarapela y caminás a la plaza.' : mid ? 'Sostenés la causa pero ya sin grito.' : 'La palabra "patria" te sigue pesando.';
    if (key === 'miedo') return high ? 'Hay sonidos comunes que disparan recuerdos sin permiso.' : mid ? 'A veces te despertás de noche escuchando algo que no está.' : 'Manejaste el miedo. No siempre. Pero lo manejaste.';
    if (key === 'info') return high ? 'Mirás los noticieros sabiendo que la verdad puede esconderse.' : mid ? 'Aprendiste que ningún relato oficial es completo.' : 'Te cuesta confiar y eso es honesto.';
    if (key === 'frio') return high ? 'Tus dedos quedaron marcados. Te duelen al cambio de tiempo.' : mid ? 'En invierno usás dos pares de medias por costumbre.' : 'Tu cuerpo aguantó. Eso ya es una victoria.';
    if (key === 'hambre') return high ? 'Sabés exactamente cuánto pesa una galleta soldada.' : mid ? 'No tirás comida. Nunca.' : 'Te gusta cocinar para los demás.';
    if (key === 'salud') return high ? 'Tenés reservas. Caminás derecho. Volviste razonablemente entero.' : mid ? 'Tenés cicatrices visibles, pero te bancás el día.' : 'El cuerpo te pasa factura todavía.';
    return '';
};

const generateReflection = (stats) => {
    const { empatia, miedo, info, conviccion, frio, hambre, salud } = stats;
    if (empatia >= 9) return { title: 'Caminaste con el corazón abierto', text: 'Tus decisiones priorizaron al compañero del pozo: a Ramón, al Subteniente Mendoza, al chico herido del paramédico. Esa empatía es lo que sostiene la memoria de Malvinas. La guerra no fue solo un choque bélico: afectó a pibes que en otra vida habrían sido tus amigos. Honrarlos es seguir cuidándolos en tu cabeza.' };
    if (info >= 8 && conviccion >= 4) return { title: 'Peleaste con conciencia social', text: 'Dudaste de los relatos oficiales y descubriste la dura verdad logística y mediática, pero sostuviste tu puesto hasta el final. Hoy defender Malvinas es exactamente eso: usar el pensamiento crítico y el conocimiento histórico, no la nostalgia bélica.' };
    if (frio >= 7 || hambre >= 5) return { title: 'El cuerpo recordará para siempre', text: 'Sentiste en tu cuerpo virtual lo peor de Tumbledown. La inmensa mayoría del daño a los soldados argentinos no fue por fuego inglés, sino por el abandono logístico y climático. Tu historia es un reclamo permanente contra la idea de que la guerra "se gana o se pierde" — la guerra siempre cobra precios que no aparecen en los partes oficiales.' };
    if (miedo >= 8) return { title: 'El miedo: la verdad humana de la guerra', text: 'Nadie va a una guerra valiente. Nadie. Tu recorrido fue profundamente sincero. Reconocer el miedo, el frío extremo, la ansiedad bajo el fuego naval, la incertidumbre de cada amanecer es la única manera realista de hablar de la trágica guerra de 1982. Esa honestidad es la que hace a un buen narrador de la historia.' };
    if (salud <= -2) return { title: 'Volviste roto, pero volviste', text: 'Te marcó duro. Te marcó el cuerpo y la cabeza. Pero estás. Y eso ya es una historia que hay que contar. Más de 500 veteranos no la contaron porque el Estado los abandonó. Que vos puedas sentarte y leer estas palabras es, también, un acto político.' };
    return { title: '74 días en la inmensidad', text: 'Sobreviviste a las islas. Tu paso por Tumbledown resume el caos táctico, el frío, el hambre, la espera y las decisiones imposibles. Detrás de cada estadística existían personas con biografías complejas. Esta reflexión es un pequeño homenaje a quienes no volvieron y a quienes volvieron pero perdieron parte de sí mismos en el camino.' };
};

// ─── INSIGNIAS según camino dominante ────────────────────────────────
// Cada badge tiene una condición sobre stats/path y desbloquea un texto.
const BADGES = [
    {
        id: 'corazon_abierto',
        title: 'Corazón abierto',
        desc: 'Priorizaste a tus compañeros. Volviste con el alma cargada de nombres.',
        emoji: '🫂',
        check: (stats) => stats.empatia >= 9
    },
    {
        id: 'critico_mediatico',
        title: 'Crítico mediático',
        desc: 'Dudaste de los relatos oficiales y entendiste cómo se construye una verdad.',
        emoji: '📰',
        check: (stats) => stats.info >= 8
    },
    {
        id: 'sobreviviente_frio',
        title: 'Sobreviviente del frío',
        desc: 'Tu cuerpo recordará Tumbledown cada invierno.',
        emoji: '❄️',
        check: (stats) => stats.frio >= 7
    },
    {
        id: 'bandera_alta',
        title: 'Bandera alta',
        desc: 'Sostuviste tu puesto incluso cuando la guerra ya estaba perdida.',
        emoji: '🇦🇷',
        check: (stats) => stats.conviccion >= 8
    },
    {
        id: 'carta_a_mama',
        title: 'Carta a mamá',
        desc: 'Escribiste antes de partir. Esa carta cruzó océanos en una caja de zapatos.',
        emoji: '✉️',
        check: (stats, path) => path.some(p => p.label.includes('carta breve') || p.label.includes('No te preocupes mami'))
    },
    {
        id: 'cuidador_ramon',
        title: 'Hermano de pozo',
        desc: 'Cuidaste a Ramón cuando temblaba. Ese vínculo va a durarte la vida.',
        emoji: '🤝',
        check: (stats, path) => path.filter(p => /Ramón|cubro a Ramón|Acuno/i.test(p.label)).length >= 2
    },
    {
        id: 'mendoza_recuerda',
        title: 'Mensajero de Mendoza',
        desc: 'Le prometiste al subteniente que buscarías a su novia. Cumpliste.',
        emoji: '🎖️',
        check: (stats, path) => path.some(p => p.label.includes('voy a buscar a su novia'))
    },
    {
        id: 'pan_compartido',
        title: 'Pan compartido',
        desc: 'Diste tu última ración cuando Ramón estaba peor.',
        emoji: '🍞',
        check: (stats, path) => path.some(p => p.label.includes('Le doy lo último'))
    },
    {
        id: 'velita_sosa',
        title: 'Velita por Sosa',
        desc: 'Cubriste a Sosa cuando lo estaquearon. No te olvides nunca de él.',
        emoji: '🕯️',
        check: (stats, path) => path.some(p => p.label.includes('cubrir a Sosa') || p.label.includes('cubrir a mi compañero'))
    },
    {
        id: 'cecim',
        title: 'CECIM',
        desc: 'Te sumaste a la lucha colectiva de los veteranos. Ya no estás solo.',
        emoji: '⚓',
        check: (stats, path) => path.some(p => p.label.includes('CECIM'))
    },
    {
        id: 'estudioso',
        title: 'Tesis de Malvinas',
        desc: 'Estudiaste para entender. Convertiste el dolor en pensamiento.',
        emoji: '🎓',
        check: (stats, path) => path.some(p => p.label.includes('Estudio'))
    },
    {
        id: 'sobrevive',
        title: 'Volvió',
        desc: 'Llegaste al final. Eso, en Malvinas, ya es una historia.',
        emoji: '🌅',
        check: () => true // siempre desbloqueado al terminar
    }
];

// ─── EXPORT PNG: dibuja en Canvas el resumen final ────────────────────
const exportSummaryPNG = (stats, path, reflectionTitle, badges) => {
    const W = 1080, H = 1500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, COLORS.base);
    grad.addColorStop(1, COLORS.deep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grain (decorativo)
    ctx.fillStyle = 'rgba(240,236,229,0.04)';
    for (let i = 0; i < 800; i++) {
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }

    // Top decoration: línea accent
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(0, 0, W, 8);

    // Header
    ctx.fillStyle = COLORS.accent;
    ctx.font = '700 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MALVINAS · EN PRIMERA PERSONA', W / 2, 90);

    ctx.fillStyle = COLORS.paper;
    ctx.font = 'italic 700 64px Georgia, serif';
    // Título reflexión (puede ser largo, partir si hace falta)
    const titleWords = reflectionTitle.split(' ');
    let line = '', y = 170;
    for (const w of titleWords) {
        const test = (line + ' ' + w).trim();
        if (ctx.measureText(test).width > W - 100) {
            ctx.fillText(line, W / 2, y);
            line = w; y += 70;
        } else line = test;
    }
    if (line) ctx.fillText(line, W / 2, y);
    y += 80;

    // Subtítulo
    ctx.fillStyle = COLORS.sky;
    ctx.font = '400 20px Arial';
    ctx.fillText('Resumen de mis marcas de guerra', W / 2, y);
    y += 60;

    // STATS
    ctx.textAlign = 'left';
    const statRows = Object.entries(STAT_META);
    const statLeft = 80;
    const statRight = W - 80;
    const statW = statRight - statLeft;
    ctx.font = '700 22px Arial';
    for (const [k, m] of statRows) {
        const v = stats[k] || 0;
        const max = 15;
        const pct = Math.max(0, Math.min(1, v / max));
        // Label
        ctx.fillStyle = m.color;
        ctx.fillText(m.label.toUpperCase(), statLeft, y);
        // Valor
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.paper;
        ctx.font = '900 24px Arial';
        ctx.fillText(`${v}/${max}`, statRight, y);
        ctx.textAlign = 'left';
        ctx.font = '700 22px Arial';
        // Bar bg
        ctx.fillStyle = 'rgba(240,236,229,0.12)';
        ctx.fillRect(statLeft, y + 12, statW, 12);
        // Bar fg
        ctx.fillStyle = m.color;
        ctx.fillRect(statLeft, y + 12, statW * pct, 12);
        y += 60;
    }

    // BADGES
    y += 30;
    ctx.fillStyle = COLORS.accent;
    ctx.font = '700 22px Arial';
    ctx.fillText('INSIGNIAS DESBLOQUEADAS', statLeft, y);
    y += 40;
    const unlockedBadges = badges.filter(b => b.unlocked);
    const badgeCols = 3;
    const badgeW = statW / badgeCols;
    let bi = 0;
    for (const badge of unlockedBadges) {
        const col = bi % badgeCols, row = Math.floor(bi / badgeCols);
        const bx = statLeft + col * badgeW;
        const by = y + row * 90;
        // emoji
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(badge.emoji, bx + badgeW / 2, by + 42);
        // título
        ctx.fillStyle = COLORS.paper;
        ctx.font = '700 16px Arial';
        ctx.fillText(badge.title, bx + badgeW / 2, by + 70);
        bi++;
    }
    y += Math.ceil(unlockedBadges.length / badgeCols) * 90 + 40;

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'italic 22px Georgia';
    ctx.fillText('"Que las nuevas generaciones no aprendan Malvinas', W / 2, H - 90);
    ctx.fillText('como una fecha, sino como una experiencia."', W / 2, H - 60);
    ctx.fillStyle = COLORS.sky;
    ctx.font = '400 16px Arial';
    ctx.fillText('SimuTec · simuunpilar.com.ar', W / 2, H - 25);

    // Download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `malvinas-marcas-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
};

const JuegoSerio = () => {
    const [sceneId, setSceneId] = useState('intro');
    const [stats, setStats] = useState(initialStats);
    const [path, setPath] = useState([]);
    const [showInfo, setShowInfo] = useState(false);
    const [finished, setFinished] = useState(false);
    const [floatingDeltas, setFloatingDeltas] = useState([]);
    const [resumePromptVisible, setResumePromptVisible] = useState(false);
    const [typedChars, setTypedChars] = useState(0);
    const [typewriterDone, setTypewriterDone] = useState(false);
    const sceneRef = useRef(null);
    const audio = useGameAudio();

    const scene = SCENES[sceneId];

    // ── Auto-save ─────────────────────────────────────────────────────
    useEffect(() => {
        if (finished || sceneId === 'intro') return;
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({ sceneId, stats, path, ts: Date.now() }));
        } catch (e) { /* ignore */ }
    }, [sceneId, stats, path, finished]);

    // ── Restaurar partida al montar (si no es intro) ──────────────────
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved && saved.sceneId && saved.sceneId !== 'intro' && SCENES[saved.sceneId]) {
                    setResumePromptVisible(true);
                }
            }
        } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const restoreSave = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (saved && SCENES[saved.sceneId]) {
                setSceneId(saved.sceneId);
                setStats(saved.stats || initialStats);
                setPath(saved.path || []);
                setResumePromptVisible(false);
            }
        } catch (e) { /* ignore */ }
    };

    const discardSave = () => {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        setResumePromptVisible(false);
    };

    // ── Audio: cambiar mood al cambiar escena ─────────────────────────
    useEffect(() => {
        if (sceneRef.current) sceneRef.current.scrollTop = 0;
        if (scene && scene.mood) audio.setMood(scene.mood);
    }, [sceneId, scene, audio]);

    // ── Typewriter: tipear el texto carácter por carácter ─────────────
    useEffect(() => {
        if (!scene || !scene.text) return;
        setTypedChars(0);
        setTypewriterDone(false);
        const total = scene.text.length;
        // velocidad: ~3 chars cada 25ms (≈120 cps), +pausa al final de oración
        let i = 0;
        const id = setInterval(() => {
            i = Math.min(total, i + 3);
            setTypedChars(i);
            if (i >= total) {
                clearInterval(id);
                setTypewriterDone(true);
            }
        }, 22);
        return () => clearInterval(id);
    }, [sceneId, scene]);

    const skipTypewriter = useCallback(() => {
        if (scene && scene.text) {
            setTypedChars(scene.text.length);
            setTypewriterDone(true);
        }
    }, [scene]);

    // ── Detener audio al desmontar ────────────────────────────────────
    useEffect(() => () => audio.stopAll(), [audio]);

    const choose = useCallback((choice) => {
        // El primer click de elección sirve también como gesto para
        // activar el AudioContext (política de autoplay del navegador).
        if (!audio.started) audio.start();
        audio.playClick();
        const eff = choice.effects || {};
        // floating deltas
        const deltas = Object.entries(eff).filter(([, v]) => v !== 0).map(([k, v]) => ({
            id: Date.now() + Math.random(),
            stat: k,
            value: v,
            color: STAT_META[k]?.color || COLORS.accent,
            label: STAT_META[k]?.label || k
        }));
        if (deltas.length) {
            setFloatingDeltas(prev => [...prev, ...deltas]);
            setTimeout(() => {
                setFloatingDeltas(prev => prev.filter(d => !deltas.find(x => x.id === d.id)));
            }, 1800);
        }
        setStats((s) => {
            const next = { ...s };
            for (const k of Object.keys(eff)) next[k] = (next[k] || 0) + eff[k];
            return next;
        });
        setPath((p) => [...p, { sceneId, label: choice.label }]);
        setShowInfo(false);
        if (choice.next === 'final') {
            try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
            audio.setMood('reunion');
            setFinished(true);
        } else {
            setSceneId(choice.next);
        }
    }, [sceneId, audio]);

    const restart = useCallback(() => {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        setSceneId('intro');
        setStats(initialStats);
        setPath([]);
        setShowInfo(false);
        setFinished(false);
        audio.setMood('home');
    }, [audio]);

    // ── Atajos de teclado: 1/2/3 elegir, M mute, R reiniciar ──────────
    useEffect(() => {
        const handler = (e) => {
            if (finished) return;
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            const key = e.key.toLowerCase();
            if (key === 'm') { audio.toggle(); return; }
            if (key === 'r') { restart(); return; }
            // Espacio o Enter: skip del typewriter si está animando
            if ((e.key === ' ' || e.key === 'Enter') && !typewriterDone) {
                e.preventDefault();
                skipTypewriter();
                return;
            }
            const n = parseInt(key, 10);
            if (!Number.isNaN(n) && typewriterDone && scene && scene.choices && scene.choices[n - 1]) {
                choose(scene.choices[n - 1]);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [scene, choose, restart, audio, finished, typewriterDone, skipTypewriter]);

    // ─── PANTALLA FINAL ────────────────────────────────────────────────
    if (finished) {
        const reflection = generateReflection(stats);
        return (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem 4rem', fontFamily: '"Public Sans", sans-serif' }} className="malvinas-final">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
                    @media print {
                        @page { size: A4; margin: 1.5cm; }
                        nav, header, footer, .malvinas-actions, button { display: none !important; }
                        body, html { background: #fff !important; color: #000 !important; }
                        .malvinas-final * { box-shadow: none !important; }
                        .malvinas-final { color: #000 !important; padding: 0 !important; max-width: 100% !important; }
                        .malvinas-final h1, .malvinas-final h2, .malvinas-final h3 { color: #000 !important; }
                        .malvinas-final section, .malvinas-final div { background: #fff !important; border-color: #ddd !important; page-break-inside: avoid; }
                        .malvinas-badges { page-break-before: avoid; }
                    }
                `}</style>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    style={{ background: `linear-gradient(135deg, ${COLORS.base}, ${COLORS.deep})`, color: COLORS.paper, borderRadius: '22px', padding: '3rem 2rem', marginTop: '1rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.15, backgroundImage: 'url(/malvinas_marcas_guerra.png)', backgroundSize: 'cover', backgroundPosition: 'center', mixBlendMode: 'luminosity' }}></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <Heart size={42} color={COLORS.accent} />
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '4px', color: COLORS.accent, fontWeight: 800, marginTop: '1rem' }}>Despliegue Finalizado · 74 días</div>
                        <h1 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: '0.5rem 0 1rem', lineHeight: 1.1, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            {reflection.title}
                        </h1>
                        <p style={{ maxWidth: '750px', margin: '0 auto', opacity: 0.95, lineHeight: 1.8, fontSize: '1.1rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{reflection.text}</p>
                    </div>
                </motion.div>

                <section style={{ marginTop: '2rem', background: COLORS.paper, borderRadius: '22px', padding: '2.25rem', boxShadow: '0 12px 30px rgba(9,9,12,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: COLORS.accent, color: COLORS.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Heart size={26} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '3px', color: COLORS.accent, fontWeight: 800 }}>Resumen</div>
                            <h2 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, margin: '0.2rem 0 0', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>Tus marcas de guerra</h2>
                        </div>
                    </div>
                    <p style={{ color: COLORS.base, opacity: 0.75, marginBottom: '1.75rem', maxWidth: '700px', lineHeight: 1.6 }}>
                        Cada decisión tuya en los cerros dejó una huella distinta. Acá las leemos como las leerían 30 años después en una entrevista para un libro de historia oral.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {Object.entries(STAT_META).map(([k, m], idx) => {
                            const v = stats[k] || 0;
                            const max = 15;
                            const pct = Math.min(100, Math.max(0, (v / max) * 100));
                            const Icon = m.icon;
                            const intensity = v >= 7 ? 'Alta' : v >= 4 ? 'Media' : v > 0 ? 'Baja' : 'Sin marca';
                            return (
                                <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + idx * 0.06 }}
                                    style={{ background: '#fff', border: `1px solid ${m.color}33`, borderLeft: `4px solid ${m.color}`, borderRadius: '14px', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: m.color, fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <Icon size={16} /> {m.label}
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '1.4rem', color: COLORS.base }}>
                                            {v}<span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 500 }}>/{max}</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '6px', background: '#eef0f3', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: m.color, transition: 'width 0.6s' }} />
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: COLORS.base, fontStyle: 'italic', opacity: 0.85, lineHeight: 1.45 }}>
                                        <span style={{ color: m.color, fontWeight: 700, fontStyle: 'normal' }}>{intensity}.</span> {interpretStat(k, v)}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* INSIGNIAS DESBLOQUEADAS */}
                <section className="malvinas-badges" style={{ marginTop: '1.5rem', background: COLORS.paper, borderRadius: '22px', padding: '2rem', boxShadow: '0 12px 30px rgba(9,9,12,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: COLORS.deep, color: COLORS.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Award size={22} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '3px', color: COLORS.accent, fontWeight: 800 }}>Logros</div>
                            <h2 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, margin: '0.2rem 0 0', fontSize: '1.6rem' }}>Insignias desbloqueadas</h2>
                        </div>
                    </div>
                    <p style={{ color: COLORS.base, opacity: 0.7, marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        Reconocimientos según el camino que tomaste.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {BADGES.map((b) => {
                            const unlocked = b.check(stats, path);
                            return (
                                <motion.div
                                    key={b.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: BADGES.indexOf(b) * 0.04 }}
                                    style={{
                                        background: unlocked ? '#fff' : 'rgba(9,9,12,0.04)',
                                        border: `1px solid ${unlocked ? COLORS.accent + '55' : 'rgba(9,9,12,0.1)'}`,
                                        borderRadius: '14px',
                                        padding: '1rem',
                                        opacity: unlocked ? 1 : 0.4,
                                        textAlign: 'center',
                                        filter: unlocked ? 'none' : 'grayscale(100%)'
                                    }}
                                >
                                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{b.emoji}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.deep, marginBottom: '0.3rem' }}>{b.title}</div>
                                    <div style={{ fontSize: '0.78rem', color: COLORS.base, opacity: 0.75, lineHeight: 1.4 }}>{b.desc}</div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* Botones de export / impresión */}
                <section className="malvinas-actions" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => {
                            const badgesUnlocked = BADGES.map(b => ({ ...b, unlocked: b.check(stats, path) }));
                            exportSummaryPNG(stats, path, reflection.title, badgesUnlocked);
                        }}
                        style={{ background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '12px', padding: '0.85rem 1.5rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', boxShadow: '0 6px 18px rgba(180,83,84,0.3)' }}
                    >
                        <Download size={16} /> Descargar resumen (PNG)
                    </button>
                    <button
                        onClick={() => window.print()}
                        style={{ background: COLORS.deep, color: COLORS.paper, border: 'none', borderRadius: '12px', padding: '0.85rem 1.5rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
                    >
                        <Printer size={16} /> Imprimir / PDF
                    </button>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: `1px solid rgba(9,9,12,0.05)` }}>
                        <h3 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, marginTop: 0, fontSize: '1.4rem' }}>Hoja de ruta</h3>
                        <p style={{ fontSize: '0.85rem', color: COLORS.base, opacity: 0.7, marginTop: 0 }}>Tus decisiones, en orden.</p>
                        <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            <ol style={{ paddingLeft: '1rem', margin: 0, color: COLORS.base }}>
                                {path.map((p, i) => (
                                    <li key={i} style={{ marginBottom: '0.65rem', fontSize: '0.85rem', lineHeight: 1.5, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.6rem' }}>
                                        <div style={{ color: COLORS.accent, fontWeight: 800, letterSpacing: '0.5px' }}>{SCENES[p.sceneId]?.chapter || '·'} — {SCENES[p.sceneId]?.title || ''}</div>
                                        <div style={{ opacity: 0.9 }}>{p.label}</div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${COLORS.base} 0%, ${COLORS.deep} 100%)`, color: COLORS.paper, padding: '2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.18)' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '3px', color: COLORS.accent, fontWeight: 800, marginBottom: '0.4rem' }}>Memoria activa</div>
                            <h3 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontSize: '1.6rem', fontStyle: 'italic', margin: 0, lineHeight: 1.25 }}>
                                "Que las nuevas generaciones no aprendan Malvinas como una fecha, sino como una experiencia."
                            </h3>
                            <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.55 }}>
                                649 nombres en el Cementerio de Darwin. Más de 500 veteranos que se quitaron la vida en la posguerra. Cada decisión que vos acabás de tomar fue una decisión real para alguien.
                            </p>
                        </div>
                        <button onClick={restart} style={{ padding: '0.9rem 1rem', background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                            <RotateCcw size={18} /> Reintentar la experiencia
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    // ─── PANTALLA DE JUEGO ─────────────────────────────────────────────
    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem 4rem', fontFamily: '"Public Sans", sans-serif', position: 'relative' }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

            {/* Resume prompt — primera entrada con partida guardada */}
            <AnimatePresence>
                {resumePromptVisible && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,12,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    >
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                            style={{ background: COLORS.paper, color: COLORS.base, padding: '2rem', borderRadius: '18px', maxWidth: '420px', textAlign: 'center' }}
                        >
                            <Save size={32} color={COLORS.accent} style={{ marginBottom: '0.5rem' }} />
                            <h3 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, margin: '0 0 0.4rem', fontSize: '1.5rem' }}>Tenés una partida guardada</h3>
                            <p style={{ fontSize: '0.95rem', lineHeight: 1.55, opacity: 0.85 }}>¿Querés continuar desde donde la dejaste o empezar de nuevo?</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button onClick={restoreSave} style={{ background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '10px', padding: '0.65rem 1.1rem', fontWeight: 800, cursor: 'pointer' }}>Continuar</button>
                                <button onClick={discardSave} style={{ background: 'transparent', color: COLORS.deep, border: `1px solid ${COLORS.deep}`, borderRadius: '10px', padding: '0.65rem 1.1rem', fontWeight: 700, cursor: 'pointer' }}>Empezar de nuevo</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <header style={{
                background: `linear-gradient(135deg, ${COLORS.base}, ${COLORS.deep})`, color: COLORS.paper,
                borderRadius: '20px', padding: '1.5rem 2rem', marginTop: '1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '1rem', flexWrap: 'wrap', boxShadow: '0 10px 30px rgba(9,9,12,0.2)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '3px', color: COLORS.paper, background: 'rgba(180,83,84,0.6)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 800 }}>
                            <Activity size={12} /> Cap. {scene.chapter}
                        </span>
                        {scene.day !== null && scene.day !== undefined && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky, background: 'rgba(123,152,171,0.15)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 800, border: `1px solid ${COLORS.sky}40` }}>
                                <Calendar size={11} /> Día {scene.day}{scene.day <= 74 ? ' / 74' : ''}
                            </span>
                        )}
                    </div>
                    <h1 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', margin: '0.5rem 0 0', fontWeight: 700 }}>
                        {scene.title}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!audio.started ? (
                        <button
                            onClick={() => { audio.start(); audio.playClick(); }}
                            title="Iniciar música ambient (requiere un click por política del navegador)"
                            style={{
                                background: COLORS.accent,
                                border: `1px solid ${COLORS.accent}`,
                                color: COLORS.paper,
                                borderRadius: '999px',
                                padding: '0.55rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontWeight: 800,
                                boxShadow: '0 4px 14px rgba(180,83,84,0.4)',
                                animation: 'pulse 1.6s ease-in-out infinite'
                            }}
                        >
                            <Volume2 size={16} /> Activar música
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={audio.toggle}
                                title="Sonido (M)"
                                style={{
                                    background: audio.enabled ? 'rgba(67,160,71,0.2)' : 'rgba(240,236,229,0.05)',
                                    border: `1px solid rgba(240,236,229,0.2)`,
                                    color: COLORS.paper, borderRadius: '999px', padding: '0.5rem 0.75rem',
                                    cursor: 'pointer', fontSize: '0.8rem',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700
                                }}
                            >
                                {audio.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                {audio.enabled ? 'On' : 'Off'}
                            </button>
                            {audio.enabled && (
                                <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={audio.volume}
                                    onChange={(e) => audio.setVolume(Number(e.target.value))}
                                    title={`Volumen ${Math.round(audio.volume * 100)}%`}
                                    style={{ width: '90px', accentColor: COLORS.accent }}
                                />
                            )}
                        </>
                    )}
                    <button onClick={restart} title="Reiniciar (R)" style={{
                        background: 'rgba(240,236,229,0.05)', border: `1px solid rgba(240,236,229,0.2)`,
                        color: COLORS.paper, borderRadius: '999px', padding: '0.5rem 1rem',
                        cursor: 'pointer', fontSize: '0.85rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700
                    }}>
                        <RotateCcw size={16} /> Reiniciar
                    </button>
                </div>
                <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }`}</style>
            </header>

            {/* Stats activas */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Object.entries(STAT_META).map(([k, m]) => {
                    const v = stats[k] || 0;
                    if (v <= 0) return null;
                    const Icon = m.icon;
                    return (
                        <motion.div key={k} layout
                            style={{ background: '#fff', border: `1px solid ${m.color}33`, color: m.color, borderRadius: '999px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <Icon size={14} /> {m.label}: {v}
                        </motion.div>
                    );
                })}
            </div>

            {/* Scene Body */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={sceneId}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    ref={sceneRef}
                    style={{ background: '#fff', border: '1px solid rgba(9,9,12,0.08)', color: COLORS.base, borderRadius: '24px', padding: '2.5rem', marginTop: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', overflow: 'hidden', position: 'relative' }}
                >
                    {scene.img ? (
                        <div style={{ margin: '-2.5rem -2.5rem 2rem -2.5rem', height: '280px', overflow: 'hidden' }}>
                            <img src={scene.img} alt={`Ilustración del capítulo ${scene.chapter}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ) : scene.kind ? (
                        <div style={{ margin: '-2.5rem -2.5rem 2rem -2.5rem', height: '240px', overflow: 'hidden' }}>
                            <SceneIllustration kind={scene.kind} />
                        </div>
                    ) : null}

                    <div onClick={!typewriterDone ? skipTypewriter : undefined} style={{ cursor: !typewriterDone ? 'pointer' : 'default', position: 'relative' }}>
                        <p style={{ fontSize: '1.1rem', lineHeight: 1.85, color: COLORS.base, whiteSpace: 'pre-line', margin: 0, minHeight: '3em' }}>
                            {scene.text.slice(0, typedChars)}
                            {!typewriterDone && (
                                <span style={{ display: 'inline-block', width: '0.5em', height: '1em', background: COLORS.accent, marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 0.8s infinite' }} />
                            )}
                        </p>
                        {!typewriterDone && (
                            <button
                                onClick={(e) => { e.stopPropagation(); skipTypewriter(); }}
                                title="Saltar animación (Espacio o Enter)"
                                style={{ position: 'absolute', top: 0, right: 0, background: COLORS.deep, color: COLORS.paper, border: 'none', borderRadius: '999px', padding: '0.3rem 0.7rem', fontSize: '0.7rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, opacity: 0.8 }}
                            >
                                <FastForward size={11} /> Saltar
                            </button>
                        )}
                    </div>

                    {/* Recuerdos: referencias a elecciones previas (memoria narrativa) */}
                    {typewriterDone && scene.memories && scene.memories(path, stats).length > 0 && (
                        <div style={{ marginTop: '1.25rem', padding: '1rem 1.2rem', background: 'rgba(180,83,84,0.06)', borderLeft: `3px solid ${COLORS.accent}`, borderRadius: '0 12px 12px 0' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.accent, fontWeight: 800, marginBottom: '0.4rem' }}>Te acordás...</div>
                            {scene.memories(path, stats).map((m, i) => (
                                <p key={i} style={{ margin: '0.4rem 0', fontSize: '0.95rem', lineHeight: 1.6, color: COLORS.base, fontStyle: 'italic' }}>{m}</p>
                            ))}
                        </div>
                    )}

                    {typewriterDone && scene.info && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <button onClick={() => setShowInfo(s => !s)} style={{ background: 'transparent', border: `1px solid ${COLORS.deep}40`, color: COLORS.deep, borderRadius: '999px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                <BookOpen size={16} /> {showInfo ? 'Ocultar bitácora histórica' : 'Abrir contexto histórico'}
                            </button>
                            <AnimatePresence>
                                {showInfo && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                        <div style={{ marginTop: '0.8rem', padding: '1.25rem', background: '#f5fbff', borderLeft: `4px solid ${COLORS.deep}`, borderRadius: '0 12px 12px 0', fontSize: '0.95rem', color: COLORS.deep, lineHeight: 1.6, fontWeight: 500 }}>
                                            {scene.info}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {typewriterDone && (
                        <>
                            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: COLORS.base, opacity: 0.6, letterSpacing: '1px', marginBottom: '1rem', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span>¿Qué hacés?</span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.5px', fontWeight: 600 }}>Atajos: 1/2/3 elegir · M sonido · R reiniciar</span>
                            </h3>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {scene.choices.map((c, i) => (
                                    <motion.button
                                        key={i}
                                        whileHover={{ x: 6, background: COLORS.deep, color: COLORS.paper, borderColor: COLORS.deep }}
                                        onClick={() => choose(c)}
                                        style={{
                                            background: COLORS.paper, color: COLORS.base, border: `1px solid rgba(9,9,12,0.15)`,
                                            borderRadius: '16px', padding: '1.2rem', cursor: 'pointer', fontWeight: 600,
                                            fontSize: '1rem', textAlign: 'left', fontFamily: 'inherit',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            gap: '1rem', transition: 'all 0.2s ease-out', position: 'relative'
                                        }}
                                    >
                                        <span style={{ position: 'absolute', top: '0.4rem', left: '0.6rem', fontSize: '0.65rem', color: COLORS.accent, fontWeight: 900, letterSpacing: '1px' }}>{i + 1}</span>
                                        <span style={{ flex: 1, lineHeight: 1.4, paddingLeft: '0.5rem' }}>{c.label}</span>
                                        <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'rgba(9,9,12,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronRight size={18} />
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Floating stat deltas */}
            <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                <AnimatePresence>
                    {floatingDeltas.map(d => (
                        <motion.div
                            key={d.id}
                            initial={{ y: 20, opacity: 0, scale: 0.8 }}
                            animate={{ y: -60, opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -120 }}
                            transition={{ duration: 1.6, ease: 'easeOut' }}
                            style={{
                                background: '#fff',
                                color: d.color,
                                border: `2px solid ${d.color}`,
                                borderRadius: '999px',
                                padding: '0.4rem 0.95rem',
                                fontWeight: 900,
                                fontSize: '0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: `0 6px 20px ${d.color}33`
                            }}
                        >
                            {d.value > 0 ? '+' : ''}{d.value} {d.label}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Atribución de música — pequeña, en el footer */}
            <div style={{ textAlign: 'center', marginTop: '2rem', padding: '0.75rem', fontSize: '0.7rem', color: COLORS.base, opacity: 0.45, lineHeight: 1.5 }}>
                Música ambient: Pachelbel · Albinoni · Beethoven · Tchaikovsky — desde Wikimedia Commons (PD / CC).
                <br />Beethoven Moonlight 1er mov.: <a href="https://commons.wikimedia.org/wiki/File:Beethoven_Moonlight_1st_movement.ogg" target="_blank" rel="noreferrer" style={{ color: COLORS.deep }}>CC-BY-SA</a> Bernd Krueger.
            </div>
        </div>
    );
};

export default JuegoSerio;
