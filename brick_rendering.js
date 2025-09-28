import * as THREE from 'three';
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('brick-container');

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  1,
  5000
);
camera.position.set(300, 400, 700);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0x888888));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(500, 1000, 500);
scene.add(dirLight);

// Load an LDraw model (.ldr or .mpd file)
const loader = new LDrawLoader();

// Explicitly set the official online parts library
var partsLibraryPath = "/library/ldraw/";
loader.setPartsLibraryPath(partsLibraryPath);

loader.load('./library/ldraw/models/car.ldr', (group) => {
  group.position.set(0, 0, 0);
  group.rotation.x = Math.PI; // Rotate 180 degrees to correct upside-down orientation
  scene.add(group);
});
loader.preloadMaterials('/library/ldraw/LDConfig.ldr');

// Render loop
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Handle resize
window.addEventListener('resize', () => {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
