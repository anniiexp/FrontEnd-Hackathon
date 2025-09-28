import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';

// LDraw color to RGB mapping (common colors)
const LDRAW_COLORS: { [key: number]: number } = {
  0: 0x05131D,    // Black
  1: 0x0055BF,    // Blue
  2: 0x257A3E,    // Green
  3: 0x00AAA4,    // Dark Turquoise
  4: 0xC91A09,    // Red
  5: 0xC870A0,    // Dark Pink
  6: 0x583927,    // Brown
  7: 0x9BA19D,    // Light Gray
  8: 0x6D6E5C,    // Dark Gray
  9: 0x6C96BF,    // Light Blue
  10: 0x73DCA1,   // Bright Green
  11: 0x3CB371,   // Light Turquoise
  12: 0xF2705E,   // Salmon
  13: 0xFC97AC,   // Pink
  14: 0xF2CD37,   // Yellow
  15: 0xFFFFFF,   // White
  16: 0x808080,   // Main Color (gray)
  17: 0xC2DAB8,   // Light Green
  18: 0xFBE696,   // Light Yellow
  19: 0xE4CD9E,   // Tan
  20: 0xC9C3DA,   // Light Violet
  47: 0xFCFCFC,   // Trans-Clear
  36: 0xC91A09,   // Trans-Red
  43: 0xAEDCF0    // Trans-Light Blue
};

interface LDrawPart {
  color: number;
  position: THREE.Vector3;
  matrix: THREE.Matrix3;
  partName: string;
}

export class LDrawToThree {
  private scene: THREE.Scene;
  private parts: LDrawPart[] = [];

  constructor() {
    this.scene = new THREE.Scene();
  }

  // Parse LDraw file content
  parseLDrawFile(content: string): LDrawPart[] {
    const lines = content.split('\n');
    const parts: LDrawPart[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('1 ')) {
        // Line type 1: Part reference
        const tokens = trimmed.split(/\s+/);
        if (tokens.length >= 15) {
          const part: LDrawPart = {
            color: parseInt(tokens[1]),
            position: new THREE.Vector3(
              parseFloat(tokens[2]),
              -parseFloat(tokens[3]), // Invert Y for Three.js
              parseFloat(tokens[4])
            ),
            matrix: new THREE.Matrix3().set(
              parseFloat(tokens[5]), parseFloat(tokens[6]), parseFloat(tokens[7]),
              parseFloat(tokens[8]), parseFloat(tokens[9]), parseFloat(tokens[10]),
              parseFloat(tokens[11]), parseFloat(tokens[12]), parseFloat(tokens[13])
            ),
            partName: tokens[14]
          };
          parts.push(part);
        }
      }
    }

    this.parts = parts;
    return parts;
  }

  // Create Three.js scene from parsed parts
  createThreeScene(): THREE.Scene {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Create geometry for each part
    for (const part of this.parts) {
      const mesh = this.createPartMesh(part);
      this.scene.add(mesh);
    }

    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);

    return this.scene;
  }

  // Create a mesh for a single part (simplified as a box for now)
  private createPartMesh(part: LDrawPart): THREE.Mesh {
    // Determine part size based on part name (simplified)
    let width = 20, height = 24, depth = 20; // Default brick size in LDU

    if (part.partName.includes('3001')) {
      // 2x4 brick
      width = 40;
      depth = 80;
      height = 24;
    } else if (part.partName.includes('3020')) {
      // 2x4 plate
      width = 40;
      depth = 80;
      height = 8;
    } else if (part.partName.includes('0901') || part.partName.includes('0904')) {
      // Base plates
      width = 80;
      depth = 80;
      height = 8;
    } else if (part.partName.includes('wheel') || part.partName.includes('100729')) {
      // Wheel - use cylinder
      const geometry = new THREE.CylinderGeometry(12, 12, 6, 16);
      const material = new THREE.MeshPhongMaterial({
        color: LDRAW_COLORS[part.color] || 0x808080
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(part.position);
      mesh.rotation.z = Math.PI / 2; // Rotate wheel to be horizontal
      return mesh;
    } else if (part.partName.includes('10312') || part.partName.includes('3823')) {
      // Windscreen/glass - thin transparent piece
      width = 40;
      depth = 4;
      height = 32;
    } else if (part.partName.includes('10314')) {
      // 1x1 brick
      width = 20;
      depth = 20;
      height = 24;
    } else if (part.partName.includes('10247')) {
      // Slope/wing piece
      width = 40;
      depth = 60;
      height = 16;
    } else if (part.partName.includes('3039')) {
      // Slope 2x2
      width = 40;
      depth = 40;
      height = 24;
    } else if (part.partName.includes('3821')) {
      // Door
      width = 8;
      depth = 40;
      height = 72;
    } else if (part.partName.includes('3004')) {
      // Window brick
      width = 20;
      depth = 40;
      height = 24;
    }

    // Create box geometry
    const geometry = new THREE.BoxGeometry(width, height, depth);

    // Determine material properties
    const color = LDRAW_COLORS[part.color] || 0x808080;
    const isTransparent = part.color === 47 || part.color === 36 || part.color === 43;

    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: isTransparent,
      opacity: isTransparent ? 0.7 : 1.0,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Apply position
    mesh.position.copy(part.position);

    // Apply rotation from matrix (simplified)
    const matrix4 = new THREE.Matrix4();
    matrix4.set(
      part.matrix.elements[0], part.matrix.elements[1], part.matrix.elements[2], 0,
      part.matrix.elements[3], part.matrix.elements[4], part.matrix.elements[5], 0,
      part.matrix.elements[6], part.matrix.elements[7], part.matrix.elements[8], 0,
      0, 0, 0, 1
    );
    mesh.rotation.setFromRotationMatrix(matrix4);

    // Add edge lines for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
    const edgeLines = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(edgeLines);

    return mesh;
  }

  // Get bounding box of all parts
  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        box.expandByObject(child);
      }
    });

    return box;
  }

  // Load and parse LDraw file from disk
  async loadFromFile(filepath: string): Promise<THREE.Scene> {
    const content = fs.readFileSync(filepath, 'utf-8');
    this.parseLDrawFile(content);
    return this.createThreeScene();
  }
}