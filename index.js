import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 55;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

const COUNT = 20000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);

const targetPositions = new Float32Array(COUNT * 3);
const targetColors = new Float32Array(COUNT * 3);
const targetSizes = new Float32Array(COUNT);

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.3, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
scene.add(particles);

const AUDIO_SOURCES = {
    red:    './audio/red.mp3',
    void:   './audio/infinite.mp3',
    purple: './audio/hollow.mp3',
    shrine: './audio/malevolent.mp3',
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioTracks = {};
let currentAudio = null;
let currentGainNode = null;
let fadeOutInterval = null;

Object.entries(AUDIO_SOURCES).forEach(([tech, url]) => {
    const audio = new Audio();
    audio.src = url;
    audio.loop = true;
    audio.preload = 'auto';

    const source = audioContext.createMediaElementSource(audio);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    audioTracks[tech] = { audio, gainNode };
});

document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log('AudioContext resumed'));
    }
}, { once: true });

document.addEventListener('keydown', () => {
    if (audioContext.state === 'suspended') audioContext.resume();
});

function fadeIn(tech, duration = 1.5) {
    if (!audioTracks[tech]) return;
    const { audio, gainNode } = audioTracks[tech];

    //debugging stateements
    console.log('Attempting to play:', tech);
    console.log('AudioContext state:', audioContext.state);
    console.log('Audio src:', audio.src);

    if (audioContext.state === 'suspended') audioContext.resume();

    if (fadeOutInterval) { clearInterval(fadeOutInterval); fadeOutInterval = null; }

    if (currentAudio && currentAudio !== audio) {
        const prev = currentAudio;
        const prevGain = currentGainNode;
        let vol = prevGain.gain.value;
        const step = vol / (duration * 60);
        const interval = setInterval(() => {
            vol -= step;
            if (vol <= 0) { prevGain.gain.value = 0; prev.pause(); clearInterval(interval); }
            else prevGain.gain.value = vol;
        }, 1000 / 60);
    }

    audio.currentTime = 0;
    audio.play();
    gainNode.gain.value = 0;
    let vol = 0;
    const target = 0.8;
    const step = target / (duration * 60);
    const interval = setInterval(() => {
        vol += step;
        if (vol >= target) { gainNode.gain.value = target; clearInterval(interval); }
        else gainNode.gain.value = vol;
    }, 1000 / 60);

    currentAudio = audio;
    currentGainNode = gainNode;
}

function fadeOut(duration = 2.0) {
    if (!currentAudio) return;
    const audio = currentAudio;
    const gainNode = currentGainNode;
    let vol = gainNode.gain.value;
    const step = vol / (duration * 60);
    fadeOutInterval = setInterval(() => {
        vol -= step;
        if (vol <= 0) {
            gainNode.gain.value = 0;
            audio.pause();
            clearInterval(fadeOutInterval);
            fadeOutInterval = null;
        } else gainNode.gain.value = vol;
    }, 1000 / 60);
    currentAudio = null;
    currentGainNode = null;
}

function getRed(i) {
    if (i < COUNT * 0.1) {
        const r = Math.random() * 9;
        const theta = Math.random() * 6.28; const phi = Math.acos(2 * Math.random() - 1);
        return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.sin(phi) * Math.sin(theta), z: r * Math.cos(phi), r: 3, g: 0.1, b: 0.1, s: 2.5 };
    } else {
        const armCount = 3; const t = (i / COUNT);
        const angle = t * 15 + ((i % armCount) * (Math.PI * 2 / armCount));
        const radius = 2 + (t * 40);
        return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: (Math.random() - 0.5) * (10 * t), r: 0.8, g: 0, b: 0, s: 1.0 };
    }
}

function getVoid(i) {
    if (i < COUNT * 0.15) {
        const angle = Math.random() * Math.PI * 2;
        return { x: 26 * Math.cos(angle), y: 26 * Math.sin(angle), z: (Math.random() - 0.5) * 1, r: 1, g: 1, b: 1, s: 2.5 };
    } else {
        const radius = 30 + Math.random() * 90;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return { x: radius * Math.sin(phi) * Math.cos(theta), y: radius * Math.sin(phi) * Math.sin(theta), z: radius * Math.cos(phi), r: 0.1, g: 0.6, b: 1.0, s: 0.7 };
    }
}

function getPurple(i) {
    if (Math.random() > 0.8) return { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100, z: (Math.random() - 0.5) * 100, r: 0.5, g: 0.5, b: 0.7, s: 0.8 };
    const r = 20; const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1);
    return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.sin(phi) * Math.sin(theta), z: r * Math.cos(phi), r: 0.6, g: 0.5, b: 1.0, s: 2.5 };
}

function getShrine(i) {
    const total = COUNT;
    const seg = i / total;

    if (seg < 0.12) {
        return {
            x: (Math.random() - 0.5) * 100,
            y: -18 + (Math.random() - 0.5) * 2,
            z: (Math.random() - 0.5) * 60,
            r: 0.35, g: 0.0, b: 0.0, s: 0.7
        };
    }

    if (seg < 0.22) {
        const pillarX = [-14, -5, 5, 14];
        const col = Math.floor((seg - 0.12) / 0.025); // 0–3
        const px = pillarX[Math.min(col, 3)];
        return {
            x: px + (Math.random() - 0.5) * 1.2,
            y: -18 + Math.random() * 28,
            z: (Math.random() - 0.5) * 1.2,
            r: col % 2 === 0 ? 0.9 : 0.15,
            g: 0.0,
            b: 0.0,
            s: col % 2 === 0 ? 1.8 : 0.9
        };
    }

    if (seg < 0.44) {
        const t = Math.random() * Math.PI;
        const roofWidth = 28;
        const px = (Math.random() - 0.5) * roofWidth * 2;
        const normalizedX = px / roofWidth;
        const roofY = 10 + Math.pow(Math.abs(normalizedX), 1.6) * 12; 
        const scatter = (Math.random() - 0.5) * 1.5;
        const brightness = 0.5 + Math.random() * 0.5;
        return {
            x: px,
            y: roofY + scatter,
            z: (Math.random() - 0.5) * 8,
            r: brightness,
            g: 0.0,
            b: 0.0,
            s: 1.2
        };
    }

    if (seg < 0.50) {
        const px = (Math.random() - 0.5) * 20;
        return {
            x: px,
            y: 10.5 + (Math.random() - 0.5) * 0.8,
            z: (Math.random() - 0.5) * 2,
            r: 1.0, g: 0.15, b: 0.0, s: 2.0
        };
    }

    if (seg < 0.56) {
        const r = Math.random() * 3.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: 11 + r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi),
            r: 1.0, g: 0.2, b: 0.1, s: 2.8
        };
    }
    if (seg < 0.68) {
        const toothCount = 14;
        const toothIdx = Math.floor(Math.random() * toothCount);
        const tx = -26 + toothIdx * 4 + (Math.random() - 0.5) * 1.5;
        const toothHeight = 4 + Math.random() * 10;
        return {
            x: tx,
            y: -18 + Math.random() * toothHeight,
            z: (Math.random() - 0.5) * 3,
            r: 0.7 + Math.random() * 0.3,
            g: 0.0,
            b: 0.0,
            s: 1.3
        };
    }

    if (seg < 0.84) {
        const spineCount = 18;
        const spineIdx = Math.floor(Math.random() * spineCount);
        const angle = (spineIdx / spineCount) * Math.PI * 2;
        const dist = 20 + Math.random() * 25;
        const wobble = (Math.random() - 0.5) * 4;
        return {
            x: Math.cos(angle) * dist + wobble,
            y: -5 + Math.sin(angle * 0.5) * 10 + wobble,
            z: (Math.random() - 0.5) * 5,
            r: 0.5 + Math.random() * 0.4,
            g: 0.0,
            b: 0.0,
            s: 0.8
        };
    }

    return {
        x: (Math.random() - 0.5) * 120,
        y: (Math.random() - 0.5) * 60,
        z: (Math.random() - 0.5) * 40,
        r: 0.2 + Math.random() * 0.2,
        g: 0.0,
        b: 0.0,
        s: 0.5
    };
}

let currentTech = 'neutral';
let shakeIntensity = 0;
const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
let glowColor = '#00ffff';

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    let detected = 'neutral';

    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((lm) => {
            drawConnectors(canvasCtx, lm, HAND_CONNECTIONS, { color: glowColor, lineWidth: 5 });
            drawLandmarks(canvasCtx, lm, { color: '#fff', lineWidth: 1, radius: 2 });

            const isUp = (t, p) => lm[t].y < lm[p].y;
            const pinch = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);

            if (pinch < 0.04) detected = 'purple';
            else if (isUp(8, 6) && isUp(12, 10) && isUp(16, 14) && isUp(20, 18)) detected = 'shrine';
            else if (isUp(8, 6) && isUp(12, 10) && !isUp(16, 14)) detected = 'void';
            else if (isUp(8, 6) && !isUp(12, 10)) detected = 'red';
        });
    }
    updateState(detected);
});

function updateState(tech) {
    if (currentTech === tech) return;
    currentTech = tech;
    const nameEl = document.getElementById('technique-name');
    shakeIntensity = tech !== 'neutral' ? 0.4 : 0;

    if (tech === 'shrine') { glowColor = '#ff0000'; nameEl.innerText = "Domain Expansion: Malevolent Shrine"; bloomPass.strength = 2.5; fadeIn('shrine'); }
    else if (tech === 'purple') { glowColor = '#bb00ff'; nameEl.innerText = "Cursed Technique: Hollow Purple"; bloomPass.strength = 4.0; fadeIn('purple'); }
    else if (tech === 'void') { glowColor = '#00ffff'; nameEl.innerText = "Domain Expansion: Infinite Void"; bloomPass.strength = 2.0; fadeIn('void'); }
    else if (tech === 'red') { glowColor = '#ff3333'; nameEl.innerText = "Cursed Technique: Red"; bloomPass.strength = 2.5; fadeIn('red'); }
    else { glowColor = '#00ffff'; nameEl.innerText = "Neutral State"; bloomPass.strength = 1.0; fadeOut(); }

    for (let i = 0; i < COUNT; i++) {
        let p;
        if (tech === 'neutral') {
            if (i < COUNT * 0.05) {
                const r = 15 + Math.random() * 20; const t = Math.random() * 6.28; const ph = Math.random() * 3.14;
                p = { x: r * Math.sin(ph) * Math.cos(t), y: r * Math.sin(ph) * Math.sin(t), z: r * Math.cos(ph), r: 0.1, g: 0.1, b: 0.2, s: 0.4 };
            } else p = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
        }
        else if (tech === 'red') p = getRed(i);
        else if (tech === 'void') p = getVoid(i);
        else if (tech === 'purple') p = getPurple(i);
        else if (tech === 'shrine') p = getShrine(i);

        targetPositions[i * 3] = p.x; targetPositions[i * 3 + 1] = p.y; targetPositions[i * 3 + 2] = p.z;
        targetColors[i * 3] = p.r; targetColors[i * 3 + 1] = p.g; targetColors[i * 3 + 2] = p.b;
        targetSizes[i] = p.s;
    }
}

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        await hands.send({ image: videoElement });
    }, width: 640, height: 480
});
cameraUtils.start();


function animate() {
    requestAnimationFrame(animate);

    if (shakeIntensity > 0) {
        renderer.domElement.style.transform = `translate(${(Math.random() - 0.5) * shakeIntensity * 40}px, ${(Math.random() - 0.5) * shakeIntensity * 40}px)`;
    } else {
        renderer.domElement.style.transform = 'translate(0,0)';
    }

    const pos = particles.geometry.attributes.position.array;
    const col = particles.geometry.attributes.color.array;
    const siz = particles.geometry.attributes.size.array;

    for (let i = 0; i < COUNT * 3; i++) {
        pos[i] += (targetPositions[i] - pos[i]) * 0.1;
        col[i] += (targetColors[i] - col[i]) * 0.1;
    }
    for (let i = 0; i < COUNT; i++) siz[i] += (targetSizes[i] - siz[i]) * 0.1;

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;

    if (currentTech === 'red') {
        particles.rotation.z -= 0.1;
    } else if (currentTech === 'purple') {
        particles.rotation.z += 0.2;
        particles.rotation.y += 0.05;
    } else if (currentTech === 'shrine') {
        particles.rotation.set(0, 0, 0);
    } else {
        particles.rotation.y += 0.005;
    }

    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});