import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

export interface Part {
  partNum: string;
  name: string;
  categoryId: string;
  material: string;
}

export class PartsDatabase {
  private parts: Part[] = [];
  private partsMap: Map<string, Part> = new Map();
  private loaded: boolean = false;

  async loadParts(csvPath: string = './parts.csv'): Promise<void> {
    return new Promise((resolve, reject) => {
      const parts: Part[] = [];

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          const part: Part = {
            partNum: row.part_num,
            name: row.name,
            categoryId: row.part_cat_id,
            material: row.part_material
          };
          parts.push(part);
        })
        .on('end', () => {
          this.parts = parts;
          this.parts.forEach(part => {
            this.partsMap.set(part.partNum, part);
          });
          this.loaded = true;
          console.log(`Loaded ${this.parts.length} parts`);
          resolve();
        })
        .on('error', reject);
    });
  }

  searchParts(keywords: string[]): Part[] {
    if (!this.loaded) {
      throw new Error('Parts database not loaded. Call loadParts() first.');
    }

    const keywordsLower = keywords.map(k => k.toLowerCase());

    return this.parts.filter(part => {
      const nameLower = part.name.toLowerCase();
      return keywordsLower.some(keyword => nameLower.includes(keyword));
    });
  }

  getPartByNumber(partNum: string): Part | undefined {
    return this.partsMap.get(partNum);
  }

  searchByCategory(categoryId: string): Part[] {
    return this.parts.filter(part => part.categoryId === categoryId);
  }

  // Get common building parts
  getCommonParts(): { bricks: Part[], plates: Part[], wheels: Part[], windows: Part[] } {
    return {
      bricks: this.searchParts(['brick']).slice(0, 20),
      plates: this.searchParts(['plate']).slice(0, 20),
      wheels: this.searchParts(['wheel']).slice(0, 10),
      windows: this.searchParts(['window', 'windscreen', 'glass']).slice(0, 10)
    };
  }

  // Check if part file exists in parts directory
  partFileExists(partNum: string): boolean {
    const partPath = path.join('./parts', `${partNum}.dat`);
    return fs.existsSync(partPath);
  }
}