import { PartsDatabase, Part } from './partsDatabase';

export class PartSelector {
  constructor(private database: PartsDatabase) {}

  // Get commonly used bricks
  getBasicBricks(): string {
    const bricks = this.database.searchParts(['brick']).slice(0, 15);
    return this.formatPartsForAI(bricks, 'Basic Bricks');
  }

  // Get commonly used plates
  getBasicPlates(): string {
    const plates = this.database.searchParts(['plate']).slice(0, 15);
    return this.formatPartsForAI(plates, 'Basic Plates');
  }

  // Get wheels and vehicle parts
  getVehicleParts(): string {
    const wheels = this.database.searchParts(['wheel']);
    const axles = this.database.searchParts(['axle']);
    const windscreens = this.database.searchParts(['windscreen', 'windshield']);

    return [
      this.formatPartsForAI(wheels.slice(0, 10), 'Wheels'),
      this.formatPartsForAI(axles.slice(0, 5), 'Axles'),
      this.formatPartsForAI(windscreens.slice(0, 5), 'Windscreens')
    ].join('\n');
  }

  // Get building structure parts
  getBuildingParts(): string {
    const windows = this.database.searchParts(['window']);
    const doors = this.database.searchParts(['door']);
    const roofs = this.database.searchParts(['roof', 'slope']);

    return [
      this.formatPartsForAI(windows.slice(0, 10), 'Windows'),
      this.formatPartsForAI(doors.slice(0, 10), 'Doors'),
      this.formatPartsForAI(roofs.slice(0, 10), 'Roof/Slopes')
    ].join('\n');
  }

  // Get all relevant parts for a given prompt
  getRelevantParts(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    let relevantParts: string[] = [];

    // Always include basic building blocks
    relevantParts.push(this.getBasicBricks());
    relevantParts.push(this.getBasicPlates());

    // Add context-specific parts
    if (promptLower.includes('car') || promptLower.includes('vehicle') ||
        promptLower.includes('truck') || promptLower.includes('race')) {
      relevantParts.push(this.getVehicleParts());
    }

    if (promptLower.includes('house') || promptLower.includes('building') ||
        promptLower.includes('home') || promptLower.includes('structure')) {
      relevantParts.push(this.getBuildingParts());
    }

    if (promptLower.includes('plane') || promptLower.includes('aircraft') ||
        promptLower.includes('helicopter')) {
      const wings = this.database.searchParts(['wing']);
      const propellers = this.database.searchParts(['propeller']);
      relevantParts.push(this.formatPartsForAI(wings.slice(0, 5), 'Wings'));
      relevantParts.push(this.formatPartsForAI(propellers.slice(0, 5), 'Propellers'));
    }

    return relevantParts.join('\n\n');
  }

  // Format parts list for AI consumption
  private formatPartsForAI(parts: Part[], category: string): string {
    if (parts.length === 0) return `${category}: No parts found`;

    const formatted = parts.map(part =>
      `  '${part.partNum}' // ${part.name}`
    ).join('\n');

    return `${category}:\n${formatted}`;
  }

  // Get builder API documentation for AI
  getBuilderAPIDocumentation(): string {
    return `
// LDrawBuilder API Reference
import { LDrawBuilder, Colors } from './ldrawBuilder';

const builder = new LDrawBuilder("Model Name");

// Basic part placement
builder.addBrick(partNum: string, color: number, x: number, y: number, z: number);
builder.addPlate(partNum: string, color: number, x: number, y: number, z: number);
builder.addWheel(partNum: string, x: number, y: number, z: number);

// Advanced part placement with rotation
builder.addPart(partNum: string, color: number, x: number, y: number, z: number,
                a: number, b: number, c: number,  // Rotation matrix row 1
                d: number, e: number, f: number,  // Rotation matrix row 2
                g: number, h: number, i: number); // Rotation matrix row 3

// Rotated parts (90 degrees)
builder.addPartRotatedY90(partNum: string, color: number, x: number, y: number, z: number);
builder.addPartRotatedX90(partNum: string, color: number, x: number, y: number, z: number);

// Colors object contains color codes:
Colors.RED = 4, Colors.BLUE = 1, Colors.GREEN = 2, Colors.YELLOW = 14,
Colors.WHITE = 15, Colors.BLACK = 0, Colors.LIGHT_GRAY = 7, Colors.BROWN = 6,
Colors.TRANS_CLEAR = 47

// LDraw units: 1 stud = 20 LDU, 1 plate height = 8 LDU, 1 brick height = 24 LDU

// Save the model
builder.save('filename.ldr');`;
  }
}