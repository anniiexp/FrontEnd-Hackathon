import * as fs from 'fs';
import * as path from 'path';

interface PartPlacement {
  lineType: 1;
  color: number;
  x: number;
  y: number;
  z: number;
  a: number; b: number; c: number;
  d: number; e: number; f: number;
  g: number; h: number; i: number;
  partName: string;
}

export class LDrawBuilder {
  private parts: PartPlacement[] = [];
  private currentColor: number = 16; // Default color (main color)
  private modelName: string = 'Untitled Model';
  private author: string = 'AI Builder';

  constructor(modelName?: string) {
    if (modelName) {
      this.modelName = modelName;
    }
  }

  setModelName(name: string): this {
    this.modelName = name;
    return this;
  }

  setAuthor(author: string): this {
    this.author = author;
    return this;
  }

  setColor(colorCode: number): this {
    this.currentColor = colorCode;
    return this;
  }

  // Add a part with full transformation matrix control
  addPart(
    partNum: string,
    color: number,
    x: number, y: number, z: number,
    a: number = 1, b: number = 0, c: number = 0,
    d: number = 0, e: number = 1, f: number = 0,
    g: number = 0, h: number = 0, i: number = 1
  ): this {
    this.parts.push({
      lineType: 1,
      color,
      x, y, z,
      a, b, c,
      d, e, f,
      g, h, i,
      partName: `${partNum}.dat`
    });
    return this;
  }

  // Simplified method for adding a brick
  addBrick(partNum: string, color: number, x: number, y: number, z: number): this {
    return this.addPart(partNum, color, x, y, z);
  }

  // Simplified method for adding a plate
  addPlate(partNum: string, color: number, x: number, y: number, z: number): this {
    return this.addPart(partNum, color, x, y, z);
  }

  // Add a wheel (typically doesn't need color)
  addWheel(partNum: string, x: number, y: number, z: number): this {
    return this.addPart(partNum, 0, x, y, z); // Color 0 = black
  }

  // Add part with 90-degree rotation around Y axis
  addPartRotatedY90(partNum: string, color: number, x: number, y: number, z: number): this {
    // Rotation matrix for 90 degrees around Y axis
    return this.addPart(partNum, color, x, y, z,
      0, 0, -1,  // First row
      0, 1, 0,   // Second row
      1, 0, 0    // Third row
    );
  }

  // Add part with 90-degree rotation around X axis
  addPartRotatedX90(partNum: string, color: number, x: number, y: number, z: number): this {
    // Rotation matrix for 90 degrees around X axis
    return this.addPart(partNum, color, x, y, z,
      1, 0, 0,   // First row
      0, 0, -1,  // Second row
      0, 1, 0    // Third row
    );
  }

  // Generate the LDraw file content
  generateLDraw(): string {
    const lines: string[] = [];

    // Header
    lines.push(`0 ${this.modelName}`);
    lines.push(`0 Name: model.ldr`);
    lines.push(`0 Author: ${this.author}`);
    lines.push(`0 !LICENSE Licensed under CC BY 4.0`);
    lines.push('');
    lines.push('0 BFC CERTIFY CCW');
    lines.push('');

    // Add all parts
    for (const part of this.parts) {
      const line = `1 ${part.color} ${part.x} ${part.y} ${part.z} ${part.a} ${part.b} ${part.c} ${part.d} ${part.e} ${part.f} ${part.g} ${part.h} ${part.i} ${part.partName}`;
      lines.push(line);
    }

    // Add step command at the end
    lines.push('0 STEP');
    lines.push('');

    return lines.join('\n');
  }

  // Save to file
  save(filename: string): void {
    const content = this.generateLDraw();
    const outputPath = filename.endsWith('.ldr') ? filename : `${filename}.ldr`;
    fs.writeFileSync(outputPath, content);
    console.log(`Model saved to ${outputPath}`);
  }

  // Clear all parts
  clear(): this {
    this.parts = [];
    return this;
  }

  // Get part count
  getPartCount(): number {
    return this.parts.length;
  }
}

// Color codes reference
export const Colors = {
  BLACK: 0,
  BLUE: 1,
  GREEN: 2,
  DARK_TURQUOISE: 3,
  RED: 4,
  DARK_PINK: 5,
  BROWN: 6,
  LIGHT_GRAY: 7,
  DARK_GRAY: 8,
  LIGHT_BLUE: 9,
  BRIGHT_GREEN: 10,
  LIGHT_TURQUOISE: 11,
  SALMON: 12,
  PINK: 13,
  YELLOW: 14,
  WHITE: 15,
  MAIN_COLOR: 16,
  LIGHT_GREEN: 17,
  LIGHT_YELLOW: 18,
  TAN: 19,
  LIGHT_VIOLET: 20,
  TRANS_CLEAR: 47,
  TRANS_RED: 36,
  TRANS_LIGHT_BLUE: 43
};