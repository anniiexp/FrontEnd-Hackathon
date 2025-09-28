import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js';

interface LDRViewerProps {
  modelPath: string;
}

const LDRViewerComponent: React.FC<LDRViewerProps> = ({ modelPath }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const loadingManagerRef = useRef<THREE.LoadingManager | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  const currentModelPathRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);

  // Create loading manager only once
  useEffect(() => {
    if (loadingManagerRef.current) return;

    const manager = new THREE.LoadingManager();

    // Implement path resolution strategy similar to Three.js packLDrawModel
    manager.setURLModifier((url) => {
      // console.log('Original URL:', url);

      // Normalize path separators
      let normalized = url.replace(/\\/g, '/');

      // Handle s\ prefix for subparts (convert s\file.dat to s/file.dat)
      if (normalized.includes('s/') || normalized.match(/s[\\\/]/)) {
        const parts = normalized.split(/[\\\/]/);
        const lastTwo = parts.slice(-2);
        if (lastTwo[0] === 's') {
          // This is a subpart reference
          normalized = `/ldraw/parts/s/${lastTwo[1]}`;
          // console.log('Subpart detected, normalized to:', normalized);
          return normalized;
        }
      }

      // Extract the filename and check for subdirectory (like s/)
      const urlParts = normalized.split('/');
      const filename = urlParts[urlParts.length - 1].toLowerCase();
      const hasSubdir = urlParts.length >= 2 && urlParts[urlParts.length - 2] === 's';

      // Define possible path prefixes to try
      const pathPrefixes = [
        '/output/',          // Output directory for generated models
        '/ldraw/',           // Direct path
        '/ldraw/p/',         // Primitives
        '/ldraw/parts/',     // Parts
      ];

      // If the URL already has a valid prefix, clean it up
      for (const prefix of pathPrefixes) {
        if (normalized.includes(prefix)) {
          // Clean up any duplicate path segments
          normalized = normalized.replace(/\/ldraw\/parts\/parts\//g, '/ldraw/parts/');
          normalized = normalized.replace(/\/ldraw\/p\/p\//g, '/ldraw/p/');
          normalized = normalized.replace(/\/output\/output\//g, '/output/');

          // Remove any redundant path combinations but preserve s/ subdirectory
          if (!normalized.includes('/s/')) {
            normalized = normalized.replace(/\/ldraw\/parts\/p\//g, '/ldraw/p/');
            normalized = normalized.replace(/\/output\/p\//g, '/ldraw/p/');
            normalized = normalized.replace(/\/ldraw\/p\/parts\//g, '/ldraw/parts/');
            normalized = normalized.replace(/\/output\/parts\//g, '/ldraw/parts/');
          } else {
            // Handle subparts in s/ directory
            normalized = normalized.replace(/\/ldraw\/parts\/parts\/s\//g, '/ldraw/parts/s/');
            normalized = normalized.replace(/\/ldraw\/p\/parts\/s\//g, '/ldraw/parts/s/');
            normalized = normalized.replace(/\/output\/parts\/s\//g, '/ldraw/parts/s/');
          }

          // console.log('Normalized URL:', normalized);
          return normalized;
        }
      }

      // If no valid prefix found, try to construct the path
      // This handles cases where the URL is just a filename or relative path
      if (!normalized.startsWith('/ldraw/')) {
        // Handle subparts (files in s/ directory)
        if (hasSubdir) {
          normalized = `/ldraw/parts/s/${filename}`;
        }
        // Check if it's a primitive (usually start with numbers or specific patterns)
        else if (filename.match(/^\d/) || filename.startsWith('stud') || filename.startsWith('edge')) {
          normalized = `/ldraw/p/${filename}`;
        }
        // Default to parts directory for other .dat files
        else if (filename.endsWith('.dat')) {
          normalized = `/ldraw/parts/${filename}`;
        }
        // For LDR files, use output directory
        else if (filename.endsWith('.ldr') || filename.endsWith('.mpd')) {
          normalized = `/output/${filename}`;
        }
        // console.log('Constructed URL:', normalized);
      }

      return normalized;
    });

    loadingManagerRef.current = manager;

    return () => {
      manager.setURLModifier(undefined);
      loadingManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    isInitializedRef.current = true;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    camera.position.set(300, 400, 700);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 2000;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Enhanced lighting for better visibility
    scene.add(new THREE.AmbientLight(0xffffff, 0.9)); // Brighter ambient light

    // Main directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = false;
    scene.add(dirLight);

    // Additional fill lights from different angles
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight1.position.set(-500, 500, -500);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight2.position.set(500, 500, -500);
    scene.add(fillLight2);

    // Add a hemisphere light for more natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.4);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    // Grid helper removed
    // const gridHelper = new THREE.GridHelper(1000, 20);
    // scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(500);
    scene.add(axesHelper);

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // Animation loop is now handled in the cube effect
    console.log('Scene initialized');

    return () => {
      window.removeEventListener('resize', handleResize);
      // Keep renderer intact but clean up event listener
      // if (rendererRef.current && containerRef.current) {
      //   containerRef.current.removeChild(rendererRef.current.domElement);
      //   rendererRef.current.dispose();
      // }
      // isInitializedRef.current = false;
    };
  }, []);

  // Animation loop - using useRef to ensure single instance
  const animationIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !controlsRef.current) return;

    // Prevent multiple animation loops
    if (isAnimatingRef.current) {
      console.log('Animation already running, skipping...');
      return;
    }

    // Commented out cancellation
    // if (animationIdRef.current !== null) {
    //   cancelAnimationFrame(animationIdRef.current);
    // }

    isAnimatingRef.current = true;

    const animate = () => {
      if (!isAnimatingRef.current) return;
      animationIdRef.current = requestAnimationFrame(animate);
      if (!controlsRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Update controls and render
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    // Start the animation loop
    animate();
    console.log('Animation loop started');

    return () => {
      // Commented out animation cleanup to keep it running
      // isAnimatingRef.current = false;
      // if (animationIdRef.current !== null) {
      //   cancelAnimationFrame(animationIdRef.current);
      //   animationIdRef.current = null;
      // }
    };
  }, []);

  // Test cube commented out - LEGO model should load instead
  /*
  const cubeRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Prevent adding cube multiple times
    if (cubeRef.current) return;

    // Add a simple red cube that we know works
    const geometry = new THREE.BoxGeometry(30, 30, 30);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 300, 0);

    sceneRef.current.add(cube);

    cubeRef.current = cube;
    console.log('Simple test cube added at:', cube.position);
    console.log('Scene now has', sceneRef.current.children.length, 'children');

    return () => {
      // Commented out cleanup to keep the cube visible
      // if (sceneRef.current && cube) {
      //   sceneRef.current.remove(cube);  // Also need to prevent removal from scene
      //   geometry.dispose();
      //   material.dispose();
      // }
      // cubeRef.current = null;
    };
  }, []);
  */

  // Cube animation commented out since cube is removed
  /*
  useEffect(() => {
    const animate = () => {
      if (cubeRef.current) {
        cubeRef.current.rotation.x += 0.01;
        cubeRef.current.rotation.y += 0.01;
      }
    };

    const id = setInterval(animate, 16); // ~60fps

    // Commented out interval cleanup
    // return () => clearInterval(id);
    return () => {};
  }, []);
  */

  // LEGO LOADING CODE
  useEffect(() => {
    if (!modelPath || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    // Skip if we're already loading this exact model
    if (currentModelPathRef.current === modelPath && isLoadingRef.current) {
      console.log('Same model already loading, skipping...');
      return;
    }

    // Skip if this model is already loaded
    if (currentModelPathRef.current === modelPath && modelGroupRef.current) {
      console.log('Model already loaded, skipping...');
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('Another model is loading, skipping...');
      return;
    }

    // Clean up previous model
    if (modelGroupRef.current) {
      sceneRef.current.remove(modelGroupRef.current);
      modelGroupRef.current = null;
    }

    // Prevent multiple loads of the same model
    let cancelled = false;
    isLoadingRef.current = true;
    currentModelPathRef.current = modelPath;

    const loader = new LDrawLoader(loadingManagerRef.current ?? undefined);

    // Set the parts library path to the ldraw directory
    loader.setPartsLibraryPath('/ldraw/');

    // Set the file map for better part resolution
    loader.setFileMap({});

    // Set the conditional line material class (not an instance)
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);

    console.log('Loading LDR file:', modelPath);

    // Try to preload materials first, but don't fail if it doesn't work
    const materialsPromise = loader.preloadMaterials('/ldraw/LDConfig.ldr')
      .then(() => {
        console.log('Materials preloaded successfully');
      })
      .catch((err) => {
        console.warn('Could not preload materials, using defaults:', err.message);
      });

    // Load the model (wait for materials if possible, but don't block)
    Promise.all([materialsPromise])
      .then(() => {
        if (cancelled) return;
        return loader.loadAsync(modelPath);
      })
      .then((group) => {
        if (!group || cancelled) return;
        console.log('Model loaded successfully:', group);
        isLoadingRef.current = false;

        // Fix null materials issue
        group.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            if (!mesh.material) {
              // Create a default material if missing
              mesh.material = new THREE.MeshPhongMaterial({
                color: 0x808080,
                side: THREE.DoubleSide
              });
              console.log('Added default material to mesh:', mesh.name);
            } else if (Array.isArray(mesh.material)) {
              // Check array of materials
              mesh.material = mesh.material.map((mat) => {
                if (!mat) {
                  console.log('Replacing null material in array');
                  return new THREE.MeshPhongMaterial({
                    color: 0x808080,
                    side: THREE.DoubleSide
                  });
                }
                return mat;
              });
            }
          }
        });

        // Position model at origin and rotate 180 degrees
        group.position.set(0, 0, 0);
        // group.rotation.x = Math.PI; // Rotate 180 degrees around X axis
        modelGroupRef.current = group;

        if (sceneRef.current) {
          sceneRef.current.add(group);
          console.log('Model added to scene');
          console.log('Group children:', group.children.length);
          console.log('Group visible:', group.visible);
          console.log('Group in scene:', sceneRef.current.children.includes(group));

          // Make sure the group is visible
          group.visible = true;
          group.traverse((child) => {
            child.visible = true;
          });

          // Count visible meshes and check materials
          let meshCount = 0;
          let visibleCount = 0;
          group.traverse((child) => {
            if ((child as any).isMesh) {
              meshCount++;
              const mesh = child as THREE.Mesh;
              if (mesh.visible) visibleCount++;

              if (!mesh.geometry.boundingBox) {
                mesh.geometry.computeBoundingBox();
              }

              // Log mesh details
              console.log('Mesh details:', {
                name: mesh.name,
                visible: mesh.visible,
                material: mesh.material,
                geometryVertices: mesh.geometry.attributes.position?.count || 0,
                position: mesh.position,
                scale: mesh.scale
              });

              // Make sure mesh has a material
              if (!mesh.material) {
                console.warn('Mesh has no material, adding default');
                mesh.material = new THREE.MeshPhongMaterial({
                  color: 0xff0000,
                  side: THREE.DoubleSide
                });
              }
            }
          });
          console.log(`Found ${meshCount} meshes, ${visibleCount} visible`);

          // Test cube removed - rendering verified to be working
          // const testGeometry = new THREE.BoxGeometry(50, 50, 50);
          // const testMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
          // const testCube = new THREE.Mesh(testGeometry, testMaterial);
          // testCube.position.set(100, 25, 0);
          // sceneRef.current.add(testCube);
          // console.log('Test cube added at:', testCube.position);
        }

        // Force update matrices before calculating bounding box
        group.updateMatrixWorld(true);

        // Calculate bounding box and center camera
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Log model information
        if (!box.isEmpty() && size.x > 0 && size.y > 0 && size.z > 0) {
          console.log('Model center:', center.x, center.y, center.z);
          console.log('Model size:', size.x, size.y, size.z);
        } else {
          console.warn('Model has empty/invalid bounding box');
        }

        if (controlsRef.current) {
          // Just update controls to look at origin
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }

        // The animation loop will handle rendering
        console.log('Scene children:', sceneRef.current?.children.length || 0);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error loading model:', error);
        console.error('Model path:', modelPath);
        console.error('Stack trace:', error.stack);
        isLoadingRef.current = false;
      });

    // Cleanup function - only remove model if path changes or component unmounts
    return () => {
      cancelled = true;
      // Don't clear the model here - it will be cleared when a new model loads
      // or when the component unmounts
    };
  }, [modelPath]);

  // Clean up model when component unmounts
  useEffect(() => {
    return () => {
      if (modelGroupRef.current && sceneRef.current) {
        sceneRef.current.remove(modelGroupRef.current);
        modelGroupRef.current = null;
      }
      isLoadingRef.current = false;
      currentModelPathRef.current = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '600px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
};

const LDRViewer = memo(LDRViewerComponent);
export default LDRViewer;
