#!/usr/bin/env python3
"""
generate_bgm.py — Procedural BGM generator for Aeterna Chronicle

Generates unique music loops for all 42 BGM entries in soundManifest.ts
Uses numpy synthesis + ffmpeg encoding (libopus → .ogg)
"""

import subprocess
import os
import re
import sys
import hashlib
import random
import math
import tempfile
from pathlib import Path

import numpy as np

# ─── Constants ────────────────────────────────────────────────────
SAMPLE_RATE = 48000
TWO_PI = 2 * np.pi
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
MANIFEST_PATH = PROJECT_ROOT / "src" / "sound" / "soundManifest.ts"

# Semitone ratio
SEMI = 2 ** (1 / 12)

# Interval patterns (semitones from root)
MINOR = [0, 3, 7]
MAJOR = [0, 4, 7]
MINOR7 = [0, 3, 7, 10]
MAJOR7 = [0, 4, 7, 11]
POWER = [0, 7, 12]
DIM = [0, 3, 6]
SUS4 = [0, 5, 7]

# Root frequency pool (A1 to A3)
ROOTS = [
    55.00, 61.74, 65.41, 73.42, 82.41, 87.31, 98.00,   # A1-G2
    110.0, 123.47, 130.81, 146.83, 164.81, 174.61, 196.0,  # A2-G3
    220.0,  # A3
]


def freq_st(base, semitones):
    """Shift frequency by semitones."""
    return base * (SEMI ** semitones)


def seed_from_key(key):
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**31)


# ─── Manifest parser ─────────────────────────────────────────────
def parse_manifest():
    content = MANIFEST_PATH.read_text(encoding="utf-8")
    pat = re.compile(
        r"\{\s*key:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'\s*,\s*type:\s*'bgm'\s*,"
        r"\s*volume:\s*([\d.]+)\s*,\s*loop:\s*(true|false)\s*,\s*category:\s*'([^']+)'\s*\}"
    )
    return [
        {"key": m[1], "path": m[2], "volume": float(m[3]),
         "loop": m[4] == "true", "category": m[5]}
        for m in pat.finditer(content)
    ]


def get_subfolder(path):
    parts = path.split("/")
    return parts[2] if len(parts) >= 3 else "unknown"


# ─── Audio Buffer (numpy-based) ──────────────────────────────────
class Buf:
    def __init__(self, duration, sr=SAMPLE_RATE):
        self.sr = sr
        self.n = int(sr * duration)
        self.dur = duration
        self.data = np.zeros(self.n, dtype=np.float64)

    def _t(self, start, dur):
        """Return (start_idx, time_array) for a segment."""
        s = int(start * self.sr)
        e = min(s + int(dur * self.sr), self.n)
        return s, e, np.arange(e - s) / self.sr

    def _env(self, t, dur, attack, release):
        env = np.ones_like(t)
        a_n = int(attack * self.sr)
        r_n = int(release * self.sr)
        if a_n > 0 and a_n <= len(env):
            env[:a_n] = np.linspace(0, 1, a_n)
        if r_n > 0 and r_n <= len(env):
            env[-r_n:] = np.linspace(1, 0, r_n)
        return env

    def sine(self, freq, start, dur, amp=0.3, phase=0,
             attack=0.01, release=0.01, harmonics=None):
        """Add sine wave with optional harmonics."""
        s, e, t = self._t(start, dur)
        if len(t) == 0:
            return
        env = self._env(t, dur, attack, release)
        sig = np.zeros_like(t)
        harms = harmonics or [(1, 1.0)]
        for h, ha in harms:
            sig += ha * np.sin(TWO_PI * freq * h * t + phase * h)
        self.data[s:e] += amp * env * sig

    def pad(self, freq, start, dur, amp=0.25, attack=1.0, release=1.0,
            detune=1.003, warmth=0.5):
        """Rich pad: fundamental + harmonics, 3 detuned voices."""
        h = [(1, 1.0), (2, 0.4 * warmth), (3, 0.2 * warmth), (4, 0.1 * warmth)]
        self.sine(freq, start, dur, amp * 0.55, 0, attack, release, h)
        self.sine(freq * detune, start, dur, amp * 0.25, 0.5, attack, release, h)
        self.sine(freq / detune, start, dur, amp * 0.25, 1.0, attack, release, h)

    def kick(self, start, amp=0.5, dur=0.15):
        """Bass drum: pitch-swept sine with exponential decay."""
        s, e, t = self._t(start, dur)
        if len(t) == 0:
            return
        freq = 55 + 120 * np.exp(-25 * t)
        env = amp * np.exp(-10 * t)
        # Integrate freq for correct phase
        phase = TWO_PI * np.cumsum(freq) / self.sr
        self.data[s:e] += env * np.sin(phase)

    def snare(self, start, amp=0.3, dur=0.08):
        """Snare-like: noise burst + sine body."""
        s, e, t = self._t(start, dur)
        if len(t) == 0:
            return
        env = amp * np.exp(-30 * t)
        noise = np.random.RandomState(int(start * 1000) & 0x7FFFFFFF).randn(len(t))
        body = np.sin(TWO_PI * 180 * t) * np.exp(-20 * t)
        self.data[s:e] += env * (noise * 0.6 + body * 0.4)

    def hihat(self, start, amp=0.12, dur=0.04, seed=0):
        """Hi-hat: short filtered noise burst."""
        s, e, t = self._t(start, dur)
        if len(t) == 0:
            return
        env = amp * np.exp(-50 * t)
        noise = np.random.RandomState(seed & 0x7FFFFFFF).randn(len(t))
        self.data[s:e] += env * noise

    def drone(self, freq, start, dur, amp=0.25, wobble_rate=0.2, wobble_depth=0.3):
        """Low drone with slow modulation."""
        s, e, t = self._t(start, dur)
        if len(t) == 0:
            return
        env = self._env(t, dur, 1.5, 1.5)
        mod = 1.0 + wobble_depth * np.sin(TWO_PI * wobble_rate * t)
        sig = (np.sin(TWO_PI * freq * t)
               + 0.7 * np.sin(TWO_PI * freq * 0.5 * t)
               + 0.3 * np.sin(TWO_PI * freq * 1.5 * t + 0.3))
        self.data[s:e] += amp * env * mod * sig

    def pluck(self, freq, start, dur=0.5, amp=0.25):
        """Plucked string: harmonics with fast attack, exp decay."""
        s, e, t = self._t(start, dur)
        if len(t) == 0:
            return
        sig = np.zeros_like(t)
        for h in range(1, 7):
            h_env = np.exp(-3 * h * t)
            sig += (1.0 / h) * h_env * np.sin(TWO_PI * freq * h * t)
        env = np.exp(-3 * t)
        self.data[s:e] += amp * env * sig

    def arpeggio(self, freqs, start, total_dur, note_dur=0.3, amp=0.15, gap=0.0):
        """Arpeggio: sequence of plucked notes."""
        t = start
        idx = 0
        while t < start + total_dur and t < self.dur:
            f = freqs[idx % len(freqs)]
            d = min(note_dur * 1.5, start + total_dur - t, self.dur - t)
            if d <= 0:
                break
            self.pluck(f, t, d, amp)
            t += note_dur + gap
            idx += 1

    def tremolo(self, rate=1.0, depth=0.2):
        t = np.arange(self.n) / self.sr
        mod = 1.0 - depth * (0.5 + 0.5 * np.sin(TWO_PI * rate * t))
        self.data *= mod

    def fade(self, fi=1.5, fo=1.5):
        fi_n = min(int(fi * self.sr), self.n)
        fo_n = min(int(fo * self.sr), self.n)
        if fi_n > 0:
            self.data[:fi_n] *= np.linspace(0, 1, fi_n)
        if fo_n > 0:
            self.data[-fo_n:] *= np.linspace(1, 0, fo_n)

    def lowpass(self, cutoff=2000):
        """Single-pole IIR lowpass."""
        rc = 1.0 / (TWO_PI * cutoff)
        dt = 1.0 / self.sr
        alpha = dt / (rc + dt)
        # Use scipy-style or manual loop
        out = np.zeros_like(self.data)
        out[0] = self.data[0] * alpha
        for i in range(1, self.n):
            out[i] = out[i - 1] + alpha * (self.data[i] - out[i - 1])
        self.data = out

    def normalize(self, peak=0.85):
        mx = np.max(np.abs(self.data))
        if mx > 0:
            self.data *= peak / mx

    def encode(self, path):
        """Encode to OGG/Opus via ffmpeg."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        samples = self.data.astype(np.float32)

        with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as f:
            f.write(samples.tobytes())
            tmp_raw = f.name

        try:
            cmd = [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "f32le", "-ar", str(self.sr), "-ac", "1",
                "-i", tmp_raw,
                "-c:a", "libopus", "-b:a", "64k", "-vbr", "on",
                str(path),
            ]
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0:
                raise RuntimeError(f"ffmpeg: {r.stderr.strip()}")
        finally:
            os.unlink(tmp_raw)


# ─── Generation functions ─────────────────────────────────────────

def gen_exploration(key, rng):
    """Exploration: layered minor pads, slow melody, atmospheric."""
    dur = rng.uniform(20, 28)
    buf = Buf(dur)

    root = ROOTS[rng.randint(5, 12)]
    chord = rng.choice([MINOR, MINOR7, SUS4])
    warmth = rng.uniform(0.3, 0.7)
    det = rng.uniform(1.002, 1.006)

    # Pad layers for chord tones
    for st in chord:
        f = freq_st(root, st)
        a = rng.uniform(0.12, 0.22)
        buf.pad(f, 0, dur, a, rng.uniform(1.5, 3.0), rng.uniform(1.5, 3.0), det, warmth)

    # Octave-up root pad
    buf.pad(root * 2, 0, dur, rng.uniform(0.06, 0.12), 2.0, 2.0, det, warmth * 0.7)

    # Slow melody: minor pentatonic two octaves up
    scale = [0, 3, 5, 7, 10, 12, 15]
    mel_root = root * 4
    nd = rng.uniform(2.0, 4.0)
    t = rng.uniform(1.0, 3.0)
    while t < dur - 2:
        f = freq_st(mel_root, rng.choice(scale))
        buf.sine(f, t, nd, rng.uniform(0.04, 0.10), rng.random() * TWO_PI,
                 0.8, 0.8, [(1, 1.0), (2, 0.25)])
        t += nd + rng.uniform(0.5, 2.0)

    buf.tremolo(rng.uniform(0.3, 1.0), rng.uniform(0.08, 0.20))
    buf.lowpass(rng.uniform(1500, 3000))
    buf.fade(2.0, 2.0)
    buf.normalize(0.80)
    return buf


def gen_combat(key, rng, is_boss=False):
    """Combat: rhythmic kicks, chord stabs, hi-hats. Boss = heavier."""
    if is_boss:
        dur = rng.uniform(16, 22)
        bpm = rng.uniform(110, 140)
        root = ROOTS[rng.randint(0, 5)]
    else:
        dur = rng.uniform(12, 16)
        bpm = rng.uniform(140, 170)
        root = ROOTS[rng.randint(4, 9)]

    buf = Buf(dur)
    beat = 60.0 / bpm
    chord = rng.choice([POWER, MINOR, DIM])
    chord_freqs = [freq_st(root * 2, s) for s in chord]

    # ── Kick pattern ──
    t = 0
    while t < dur:
        ka = rng.uniform(0.40, 0.60) if is_boss else rng.uniform(0.30, 0.50)
        buf.kick(t, ka, 0.20 if is_boss else 0.15)
        if rng.random() < (0.4 if is_boss else 0.2):
            buf.kick(t + beat * 0.5, ka * 0.65, 0.12)
        t += beat

    # ── Snare on beats 2 & 4 ──
    t = beat
    while t < dur:
        sa = rng.uniform(0.15, 0.30) if is_boss else rng.uniform(0.10, 0.22)
        buf.snare(t, sa, 0.10)
        t += beat * 2

    # ── Hi-hats ──
    t = beat * 0.5
    hseed = seed_from_key(key + "_hat")
    while t < dur:
        if rng.random() < 0.85:
            buf.hihat(t, rng.uniform(0.06, 0.14), rng.uniform(0.03, 0.06), hseed)
            hseed += 1
        t += beat

    # Boss: extra 16th-note hats
    if is_boss:
        t = 0
        while t < dur:
            if rng.random() < 0.3:
                buf.hihat(t, 0.04, 0.02, hseed)
                hseed += 1
            t += beat * 0.25

    # ── Chord stabs on beat 1 & 3 ──
    bar = beat * 4
    t = 0
    while t < dur:
        for f in chord_freqs:
            buf.sine(f, t, beat * 0.7, rng.uniform(0.08, 0.16),
                     rng.random() * TWO_PI, 0.01, 0.08,
                     [(1, 1.0), (2, 0.45), (3, 0.20)])
        t3 = t + beat * 2
        if t3 < dur:
            for f in chord_freqs:
                buf.sine(f, t3, beat * 0.5, rng.uniform(0.06, 0.12),
                         rng.random() * TWO_PI, 0.01, 0.08,
                         [(1, 1.0), (2, 0.35)])
        t += bar

    # ── Bass line ──
    t = 0
    while t < dur:
        bf = root if rng.random() > 0.3 else freq_st(root, rng.choice([5, 7, 3]))
        buf.sine(bf, t, beat * 0.65, 0.22, 0, 0.01, 0.04, [(1, 1.0), (2, 0.25)])
        t += beat

    # Boss: sub-bass drone
    if is_boss:
        buf.drone(root * 0.5, 0, dur, rng.uniform(0.12, 0.22),
                  rng.uniform(0.3, 0.7), rng.uniform(0.2, 0.4))

    buf.fade(0.3, 0.5)
    buf.normalize(0.85)
    return buf


def gen_system(key, rng):
    """System/UI: calm major arpeggios, gentle pads."""
    dur = rng.uniform(22, 26)
    buf = Buf(dur)

    root = ROOTS[rng.randint(9, 14)]  # C3-A3 range
    chord = rng.choice([MAJOR, MAJOR7])

    # Background pad (soft)
    for st in chord:
        f = freq_st(root * 2, st)
        buf.pad(f, 0, dur, rng.uniform(0.06, 0.12), 2.5, 2.5, 1.002, 0.3)

    # Arpeggio pattern (ascending + descending)
    arp = []
    for octave in [1, 2, 4]:
        for st in chord:
            arp.append(freq_st(root * octave, st))
    pattern = arp + arp[-2:0:-1]

    nd = rng.uniform(0.35, 0.65)
    gap = rng.uniform(0.0, 0.08)
    buf.arpeggio(pattern, rng.uniform(0.5, 1.5), dur - 2, nd, rng.uniform(0.10, 0.18), gap)

    buf.tremolo(rng.uniform(0.5, 1.2), rng.uniform(0.05, 0.12))
    buf.lowpass(rng.uniform(3000, 5000))
    buf.fade(1.5, 1.5)
    buf.normalize(0.75)
    return buf


def gen_dungeon(key, rng):
    """Dungeon: dark ambient drones, dissonance, sparse high notes."""
    dur = rng.uniform(24, 30)
    buf = Buf(dur)

    root = ROOTS[rng.randint(0, 4)]  # A1-E2

    # Main drone
    buf.drone(root, 0, dur, rng.uniform(0.20, 0.35),
              rng.uniform(0.10, 0.25), rng.uniform(0.20, 0.45))

    # Dissonant second drone
    dis = rng.choice([6, 1, 13])  # tritone, minor2, minor9
    buf.drone(freq_st(root, dis), rng.uniform(2, 5), dur - rng.uniform(3, 6),
              rng.uniform(0.08, 0.16), rng.uniform(0.05, 0.18), rng.uniform(0.25, 0.50))

    # Sparse crystalline high notes
    high = root * 16
    scale = [0, 1, 3, 6, 7, 10]
    t = rng.uniform(3, 6)
    while t < dur - 3:
        f = freq_st(high, rng.choice(scale))
        buf.sine(f, t, rng.uniform(1.0, 3.0), rng.uniform(0.02, 0.07),
                 rng.random() * TWO_PI, 0.01, 0.5, [(1, 1.0)])
        t += rng.uniform(2.5, 6.0)

    # Occasional deep sub-rumble
    t = rng.uniform(5, 10)
    while t < dur - 5:
        buf.sine(root * 0.5, t, rng.uniform(2, 5), rng.uniform(0.08, 0.18),
                 rng.random() * TWO_PI, 1.0, 1.0, [(1, 1.0), (2, 0.45)])
        t += rng.uniform(6, 12)

    buf.lowpass(rng.uniform(800, 1500))
    buf.fade(2.5, 2.5)
    buf.normalize(0.80)
    return buf


def gen_ending(key, rng):
    """Ending: emotional build, minor → major resolution."""
    dur = rng.uniform(25, 30)
    buf = Buf(dur)

    root = ROOTS[rng.randint(6, 12)]  # G2-E3
    mid = dur * 0.6

    # Minor section pads
    for st in MINOR:
        f = freq_st(root * 2, st)
        buf.pad(f, 0, mid + 2, rng.uniform(0.08, 0.16), 2.5, 2.0, 1.003, 0.45)

    # Major resolution pads
    for st in MAJOR:
        f = freq_st(root * 2, st)
        buf.pad(f, mid - 2, dur - mid + 2, rng.uniform(0.08, 0.16), 3.5, 2.0, 1.003, 0.45)

    # Rising melody
    scale = [0, 2, 3, 5, 7, 8, 10, 12]
    mr = root * 4
    nd = rng.uniform(0.8, 1.4)
    t, idx = 1.0, 0
    while t < dur - 2:
        progress = t / dur
        mx = int(2 + progress * 6)
        si = scale[idx % min(mx + 1, len(scale))]
        f = freq_st(mr, si)
        a = 0.04 + 0.10 * progress
        buf.pluck(f, t, nd * 1.5, a)
        idx += 1
        t += nd + rng.uniform(0.2, 0.7)

    # Root bass
    buf.drone(root, 0, dur, 0.12, 0.15, 0.18)

    buf.tremolo(rng.uniform(0.3, 0.7), rng.uniform(0.05, 0.12))
    buf.fade(2.0, 3.0)
    buf.normalize(0.80)
    return buf


def gen_event(key, rng, path):
    """Event: seasonal feel — spring/summer/autumn/winter."""
    dur = rng.uniform(20, 26)
    buf = Buf(dur)

    if "spring" in path:
        root = 261.63  # C4
        for st in MAJOR7:
            buf.pad(freq_st(root * 0.5, st), 0, dur, 0.08, 1.5, 1.5, 1.002, 0.3)
        arp_f = [freq_st(root, s) for s in [0, 4, 7, 12, 16, 19, 24]]
        buf.arpeggio(arp_f, 0.5, dur - 1, 0.22, 0.13, 0.0)
        # Bird trills
        t = rng.uniform(3, 5)
        while t < dur - 3:
            f1 = freq_st(root * 4, rng.choice([0, 4, 7]))
            f2 = freq_st(root * 4, rng.choice([2, 5, 9]))
            for j in range(rng.randint(4, 8)):
                f = f1 if j % 2 == 0 else f2
                buf.sine(f, t + j * 0.06, 0.05, 0.03, 0, 0.005, 0.02)
            t += rng.uniform(4, 8)
        buf.lowpass(5000)

    elif "summer" in path:
        root = 174.61  # F3
        for st in MAJOR:
            buf.pad(freq_st(root, st), 0, dur, 0.13, 2.0, 2.0, 1.004, 0.6)
        arp_f = [freq_st(root * 2, s) for s in [0, 4, 7, 12, 7, 4]]
        buf.arpeggio(arp_f, 1.0, dur - 2, 0.55, 0.10, 0.08)
        buf.tremolo(0.5, 0.12)
        buf.lowpass(3000)

    elif "autumn" in path:
        root = 146.83  # D3
        for st in MINOR7:
            buf.pad(freq_st(root, st), 0, dur, 0.10, 2.0, 2.0, 1.003, 0.5)
        desc = [12, 10, 8, 7, 5, 3, 2, 0, -1, -3]
        mr = root * 2
        t, idx = 1.5, 0
        while t < dur - 2:
            f = freq_st(mr, desc[idx % len(desc)])
            buf.pluck(f, t, 1.2, rng.uniform(0.09, 0.16))
            idx += 1
            t += 0.8 + rng.uniform(0.2, 0.5)
        buf.lowpass(2500)

    elif "winter" in path:
        root = 220.0  # A3
        # Cold, sparse — emphasize upper harmonics
        buf.sine(root * 0.5, 0, dur, 0.07, 0, 2.0, 2.0, [(1, 0.25), (3, 0.65), (5, 0.45)])
        buf.sine(freq_st(root * 0.5, 7), 0, dur, 0.05, 1, 2.0, 2.0, [(1, 0.25), (3, 0.45)])
        # Crystalline sparse notes
        cn = [0, 3, 7, 12, 15, 19]
        cr = root * 4
        t = rng.uniform(2, 4)
        while t < dur - 3:
            f = freq_st(cr, rng.choice(cn))
            buf.sine(f, t, rng.uniform(1.5, 3.0), rng.uniform(0.03, 0.06),
                     rng.random() * TWO_PI, 0.01, 0.5, [(1, 1.0), (3, 0.25)])
            t += rng.uniform(2.0, 5.0)
    else:
        # Fallback
        root = 196.0
        for st in MAJOR:
            buf.pad(freq_st(root, st), 0, dur, 0.10, 1.5, 1.5, 1.003, 0.4)
        arp_f = [freq_st(root * 2, s) for s in [0, 4, 7, 12]]
        buf.arpeggio(arp_f, 0.5, dur - 1, 0.35, 0.12, 0.05)

    buf.fade(1.5, 1.5)
    buf.normalize(0.75)
    return buf


# ─── Boss detection ───────────────────────────────────────────────
BOSS_WORDS = {"golem", "thousand_years", "3000_years", "grief", "oblivion",
              "remembered", "boss"}

def is_boss(path, volume):
    return any(w in path for w in BOSS_WORDS) or volume >= 0.8


# ─── Main ─────────────────────────────────────────────────────────
STAGING_DIR = Path("/tmp/aeterna_bgm")


def main():
    import shutil

    print("=" * 60)
    print("Aeterna Chronicle — Procedural BGM Generator")
    print("=" * 60)

    entries = parse_manifest()
    print(f"\nFound {len(entries)} BGM entries in manifest")
    if len(entries) != 42:
        print(f"WARNING: expected 42, found {len(entries)}")

    # Prepare staging dir in /tmp (local FS, no cloud-sync issues)
    if STAGING_DIR.exists():
        shutil.rmtree(STAGING_DIR)
    STAGING_DIR.mkdir(parents=True)

    ok = fail = 0
    for i, e in enumerate(entries, 1):
        key, path, vol, cat = e["key"], e["path"], e["volume"], e["category"]
        sub = get_subfolder(path)
        out = STAGING_DIR / path

        rng = random.Random(seed_from_key(key))
        tag = ""

        print(f"\n[{i:2d}/42] {key}")
        print(f"        {path}")

        try:
            if sub == "exploration":
                buf = gen_exploration(key, rng)
            elif sub == "combat":
                boss = is_boss(path, vol)
                buf = gen_combat(key, rng, is_boss=boss)
                if boss:
                    tag = " (boss)"
            elif sub == "system":
                buf = gen_system(key, rng)
            elif sub == "dungeon":
                buf = gen_dungeon(key, rng)
            elif sub == "ending":
                buf = gen_ending(key, rng)
            elif sub == "event":
                buf = gen_event(key, rng, path)
            else:
                buf = gen_exploration(key, rng)
                tag = " (fallback→exploration)"

            buf.encode(str(out))

            sz = os.path.getsize(str(out))
            kb = sz / 1024
            if sz < 2000:
                print(f"        WARN  {buf.dur:.1f}s  {kb:.1f} KB — too small!{tag}")
                fail += 1
            else:
                print(f"        OK  {buf.dur:.1f}s  {kb:.1f} KB{tag}")
                ok += 1

        except Exception as ex:
            print(f"        ERROR: {ex}")
            fail += 1

    print(f"\n{'=' * 60}")
    print(f"Generated: {ok} success, {fail} failed / {len(entries)} total")

    if ok > 0:
        # Copy from staging to final destination
        # Must use shell-level commands — Synology Drive FUSE intercepts
        # Python file ops within long-running processes.
        dest = str(PUBLIC_DIR)
        print(f"\nCopying {ok} files to {dest}/ ...")

        # Delete old BGM files first
        for e in entries:
            final = PUBLIC_DIR / e["path"]
            subprocess.run(["rm", "-f", str(final)], check=False)

        # rsync from staging to public
        r = subprocess.run(
            ["rsync", "-a", str(STAGING_DIR) + "/", str(PUBLIC_DIR) + "/"],
            capture_output=True, text=True,
        )
        if r.returncode == 0:
            print("rsync complete.")
        else:
            print(f"rsync failed: {r.stderr}")
            # Fallback: individual cp
            for e in entries:
                src = STAGING_DIR / e["path"]
                dst = PUBLIC_DIR / e["path"]
                if src.exists():
                    os.makedirs(os.path.dirname(str(dst)), exist_ok=True)
                    subprocess.run(["cp", "-f", str(src), str(dst)])

    # Keep staging for manual fallback
    print(f"\nStaging dir: {STAGING_DIR}")
    print("If files don't appear, run manually:")
    print(f"  rm -rf {PUBLIC_DIR}/audio/bgm/")
    print(f"  cp -R {STAGING_DIR}/audio/bgm/ {PUBLIC_DIR}/audio/bgm/")

    print(f"\n{'=' * 60}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
