import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';

class LegoViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.models = [];
        this.currentModel = null;
        this.autoRotate = false;
        this.grid = null;

        this.init();
        this.loadModelList();
        this.setupEventListeners();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Create camera
        const container = document.getElementById('canvas-container');
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(100, 100, 100);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Add grid
        this.grid = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
        this.scene.add(this.grid);

        // Add controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Handle window resize
        window.addEventListener('resize', () => {
            const container = document.getElementById('canvas-container');
            const aspect = container.clientWidth / container.clientHeight;
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });

        // Start animation loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.autoRotate && this.currentModel) {
            this.currentModel.rotation.y += 0.01;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    async loadModelList() {
        try {
            const response = await fetch('/api/models');
            this.models = await response.json();
            this.displayModelList();
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }

    displayModelList() {
        const list = document.getElementById('model-list');
        list.innerHTML = '';

        this.models.forEach(model => {
            const item = document.createElement('li');
            item.className = 'model-item';
            item.innerHTML = `
                <div class="model-name">${model.name}</div>
                <div class="model-info">${model.parts} parts • ${model.size}</div>
            `;
            item.addEventListener('click', () => this.loadModel(model.filename));
            list.appendChild(item);
        });
    }

    async loadModel(filename) {
        document.getElementById('loading').style.display = 'block';

        // Remove current model
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        try {
            const response = await fetch(`/api/model/${filename}`);
            const modelData = await response.json();

            // Create group for the model
            this.currentModel = new THREE.Group();

            // Add parts to the model
            modelData.parts.forEach(part => {
                const mesh = this.createPartMesh(part);
                this.currentModel.add(mesh);
            });

            this.scene.add(this.currentModel);

            // Center the model
            const box = new THREE.Box3().setFromObject(this.currentModel);
            const center = box.getCenter(new THREE.Vector3());
            this.currentModel.position.sub(center);

            // Update camera to view the model
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            const cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
            this.camera.position.set(cameraZ * 0.5, cameraZ * 0.5, cameraZ);
            this.camera.lookAt(0, 0, 0);

            // Update UI
            document.getElementById('part-count').textContent = modelData.parts.length;
            document.getElementById('current-model').textContent = filename;

            // Update active state in list
            document.querySelectorAll('.model-item').forEach(item => {
                item.classList.remove('active');
                if (item.querySelector('.model-name').textContent === filename.replace('.ldr', '').replace(/_/g, ' ')) {
                    item.classList.add('active');
                }
            });

        } catch (error) {
            console.error('Failed to load model:', error);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    createPartMesh(part) {
        // Determine geometry based on part type
        let geometry;
        const size = part.size || { width: 20, height: 24, depth: 20 };

        if (part.type === 'wheel') {
            geometry = new THREE.CylinderGeometry(12, 12, 6, 16);
        } else {
            geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        }

        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: part.color,
            transparent: part.transparent || false,
            opacity: part.transparent ? 0.7 : 1.0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(part.position.x, part.position.y, part.position.z);

        if (part.rotation) {
            mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Add edges
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const edgeLines = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(edgeLines);

        return mesh;
    }

    setupEventListeners() {
        // Reset view button
        document.getElementById('reset-view').addEventListener('click', () => {
            this.camera.position.set(100, 100, 100);
            this.camera.lookAt(0, 0, 0);
            this.controls.reset();
        });

        // Toggle grid
        document.getElementById('toggle-grid').addEventListener('click', () => {
            this.grid.visible = !this.grid.visible;
        });

        // Toggle auto rotation
        document.getElementById('toggle-rotation').addEventListener('click', () => {
            this.autoRotate = !this.autoRotate;
            event.target.textContent = this.autoRotate ? 'Stop Rotation' : 'Auto Rotate';
        });

        // Build button
        document.getElementById('build-btn').addEventListener('click', async () => {
            const prompt = document.getElementById('prompt-input').value.trim();
            if (!prompt) return;

            const btn = document.getElementById('build-btn');
            btn.disabled = true;
            btn.textContent = 'Building...';

            try {
                const response = await fetch('/api/build', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                const result = await response.json();

                if (result.success) {
                    // Reload model list and load the new model
                    await this.loadModelList();
                    await this.loadModel(result.filename);
                    document.getElementById('prompt-input').value = '';
                } else {
                    alert('Failed to build model: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Build New Model';
            }
        });
    }
}

// Initialize viewer when page loads
window.addEventListener('DOMContentLoaded', () => {
    new LegoViewer();
});