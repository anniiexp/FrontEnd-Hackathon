import * as THREE from 'three';
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('brick-container');

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7eaff);

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

// Border around the canvas
renderer.domElement.style.boxSizing = 'border-box';
renderer.domElement.style.border = '6px solid #CBCBCB';
renderer.domElement.style.borderRadius = '16px';

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
    // Enhanced lighting for better visibility
    scene.add(new THREE.AmbientLight(0xffffff, 0.9)); // Brighter ambient light

    // Main directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = false;
    scene.add(dirLight);

    // Additional fill lights from different angles
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight1.position.set(-500, 500, -500);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight2.position.set(500, 500, -500);
    scene.add(fillLight2);

    // Add a hemisphere light for more natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1.0);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

// Load an LDraw model (.ldr or .mpd file)
const loader = new LDrawLoader();

// Explicitly set the official online parts library
var partsLibraryPath = "/library/ldraw/";
loader.setPartsLibraryPath(partsLibraryPath);

loader.load('./library/ldraw/models/car.ldr', (group) => {
  group.position.set(0, 0, 0);
  group.rotation.x = Math.PI; // Rotate 180 degrees to correct upside-down orientation
  scene.add(group);

  group.traverse((child) => {
    // handle Line/LineSegments created by the loader
    if (child.isLine || child.type === 'LineSegments') {
      if (child.material) {
        child.material.transparent = true;
        child.material.opacity = 0.22;       // make lines faint
        child.material.color && child.material.color.set(0x111111); // subtle dark gray
        child.material.linewidth = 1;        // note: linewidth often ignored on many platforms
        // To remove lines completely instead of fading:
        // child.visible = false;
      }
    }
  });
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

// SECOND INSTANCE FOR brick-container-2
const container2 = document.getElementById('brick-container-2');
if (container2) {
  const scene2 = new THREE.Scene();
  scene2.background = new THREE.Color(0xe7eaff);

  const camera2 = new THREE.PerspectiveCamera(
    45,
    container2.clientWidth / container2.clientHeight,
    1,
    5000
  );
  camera2.position.set(300, 400, 700);

  const renderer2 = new THREE.WebGLRenderer({ antialias: true });
  renderer2.setSize(container2.clientWidth, container2.clientHeight);
  container2.appendChild(renderer2.domElement);
  renderer2.domElement.style.boxSizing = 'border-box';
  renderer2.domElement.style.border = '6px solid #CBCBCB';
  renderer2.domElement.style.borderRadius = '16px';

  const controls2 = new OrbitControls(camera2, renderer2.domElement);
  controls2.enableDamping = true;

  scene2.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight2.position.set(500, 1000, 500);
  dirLight2.castShadow = false;
  scene2.add(dirLight2);
  const fillLight1_2 = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight1_2.position.set(-500, 500, -500);
  scene2.add(fillLight1_2);
  const fillLight2_2 = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight2_2.position.set(500, 500, -500);
  scene2.add(fillLight2_2);
  const hemiLight2 = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1.0);
  hemiLight2.position.set(0, 500, 0);
  scene2.add(hemiLight2);

  const loader2 = new LDrawLoader();
  loader2.setPartsLibraryPath(partsLibraryPath);
  loader2.load('./library/ldraw/models/pyramid.ldr', (group) => {
    group.position.set(0, 0, 0);
    group.rotation.x = Math.PI;
    scene2.add(group);
    group.traverse((child) => {
      if (child.isLine || child.type === 'LineSegments') {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0.22;
          child.material.color && child.material.color.set(0x111111);
          child.material.linewidth = 1;
        }
      }
    });
  });
  loader2.preloadMaterials('/library/ldraw/LDConfig.ldr');

  function animate2() {
    controls2.update();
    renderer2.render(scene2, camera2);
    requestAnimationFrame(animate2);
  }
  animate2();

  window.addEventListener('resize', () => {
    const w2 = container2.clientWidth, h2 = container2.clientHeight;
    renderer2.setSize(w2, h2);
    camera2.aspect = w2 / h2;
    camera2.updateProjectionMatrix();
  });
}
