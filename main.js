import * as THREE from 'three';

// --- CUSTOM CURSOR ---
const cursor = document.getElementById('custom-cursor');
const hoverElements = document.querySelectorAll('[data-hover]');

let mouse = new THREE.Vector2(0, 0);
let targetMouse = new THREE.Vector2(0, 0);
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        targetMouse.x = (e.clientX - windowHalfX) * 0.002;
        targetMouse.y = (e.clientY - windowHalfY) * 0.002;
    });

    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });
}

// --- AUDIO CONTROL ---
const soundToggle = document.getElementById('sound-toggle');
const audio = document.getElementById('bg-audio');
let isPlaying = false;

soundToggle.addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
        soundToggle.classList.add('muted');
    } else {
        audio.play();
        soundToggle.classList.remove('muted');
    }
    isPlaying = !isPlaying;
});

// --- THREE.JS SCENE SETUP ---
const container = document.getElementById('webgl-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6f0fa); // Light airy blue
scene.fog = new THREE.FogExp2(0xe6f0fa, 0.0015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
camera.position.set(0, 200, 600);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(200, 500, 300);
scene.add(dirLight);

const rimLight = new THREE.PointLight(0xaaccff, 2, 1000);
rimLight.position.set(-200, 200, -200);
scene.add(rimLight);

// --- LIGHT MOUNTAINOUS TERRAIN ---
const terrainGeo = new THREE.PlaneGeometry(3500, 3500, 150, 150);
terrainGeo.rotateX(-Math.PI / 2);

const pos = terrainGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Smooth rolling hills algorithm
    const y = Math.sin(x * 0.002) * Math.cos(z * 0.002) * 150 + Math.sin(x * 0.008) * Math.cos(z * 0.008) * 30;
    pos.setY(i, y);
}
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.1,
    wireframe: true, 
    transparent: true,
    opacity: 0.2
});
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.position.y = -100;
scene.add(terrain);

// --- TRANSLUCENT WATER ---
const waterGeo = new THREE.PlaneGeometry(3500, 3500, 64, 64);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff, // Light cyan/blue water
    transmission: 0.6,
    opacity: 0.9,
    metalness: 0.2,
    roughness: 0.1,
    ior: 1.33,
    thickness: 1.0
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = -40;
scene.add(water);

// --- LIQUID GLASS GLOBE ---
const globeGeo = new THREE.SphereGeometry(140, 64, 64);
const globeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1.0,
    opacity: 1,
    metalness: 0.1,
    roughness: 0.05,
    ior: 1.5,
    thickness: 2.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
});
const globe = new THREE.Mesh(globeGeo, globeMat);
globe.position.set(300, 150, -300);
scene.add(globe);

// --- CLOUDS / PARTICLES ---
const cloudGeo = new THREE.BufferGeometry();
const cloudCount = 800;
const cloudPos = new Float32Array(cloudCount * 3);
for(let i=0; i < cloudCount * 3; i+=3) {
    cloudPos[i] = (Math.random() - 0.5) * 2500;
    cloudPos[i+1] = Math.random() * 300 + 100;
    cloudPos[i+2] = (Math.random() - 0.5) * 2500;
}
cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));

// Generate circular texture programmatically to avoid external image loading issues
const canvas = document.createElement('canvas');
canvas.width = 32;
canvas.height = 32;
const context = canvas.getContext('2d');
context.beginPath();
context.arc(16, 16, 14, 0, Math.PI * 2, false);
context.fillStyle = 'white';
context.fill();
const circleTexture = new THREE.CanvasTexture(canvas);

const cloudMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 8,
    map: circleTexture,
    transparent: true,
    opacity: 0.7,
    blending: THREE.NormalBlending,
    depthWrite: false
});
const clouds = new THREE.Points(cloudGeo, cloudMat);
scene.add(clouds);

// --- RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Parallax Camera (smooth cursor tracking)
    mouse.lerp(targetMouse, 0.05);
    camera.position.x += (mouse.x * 200 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 100 + 200 - camera.position.y) * 0.05;
    camera.lookAt(0, 100, 0);

    // Rotate & Float Globe
    globe.rotation.y = time * 0.1;
    globe.rotation.z = time * 0.05;
    globe.position.y = 150 + Math.sin(time * 0.5) * 20; 

    // Animate Water Ripples
    const waterVerts = water.geometry.attributes.position;
    for (let i = 0; i < waterVerts.count; i++) {
        const u = waterVerts.getX(i);
        const v = waterVerts.getZ(i);
        const waveHeight = Math.sin(u * 0.005 + time * 0.8) * Math.cos(v * 0.005 + time * 0.8) * 15;
        waterVerts.setY(i, waveHeight);
    }
    water.geometry.attributes.position.needsUpdate = true;

    // Slowly rotate clouds
    clouds.rotation.y = time * 0.015;

    renderer.render(scene, camera);
}
animate();

// --- RESPONSIVENESS ---
window.addEventListener('resize', () => {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
