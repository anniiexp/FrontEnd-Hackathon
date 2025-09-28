#!/usr/bin/env node

import * as readline from 'readline';
import { PartsDatabase } from './partsDatabase';
import { PartSelector } from './partSelector';
import { AIService } from './aiService';
import { CodeExecutor } from './codeExecutor';
import { LDrawBuilder, Colors } from './ldrawBuilder';

class BrickyardApp {
  private database: PartsDatabase;
  private partSelector: PartSelector;
  private aiService: AIService;
  private codeExecutor: CodeExecutor;
  private rl: readline.Interface;

  constructor() {
    this.database = new PartsDatabase();
    this.partSelector = new PartSelector(this.database);
    this.aiService = new AIService();
    this.codeExecutor = new CodeExecutor('./website/output');

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize(): Promise<void> {
    console.log('🧱 Welcome to Brickyard - AI-Powered LEGO Builder');
    console.log('Loading parts database...');
    await this.database.loadParts('./parts.csv');
    console.log('Ready to build!\n');
  }

  async buildFromPrompt(prompt: string): Promise<void> {
    try {
      console.log(`\n🔨 Building: ${prompt}`);
      console.log('Analyzing request...');

      // Get relevant parts for the prompt
      const relevantParts = this.partSelector.getRelevantParts(prompt);
      const builderAPI = this.partSelector.getBuilderAPIDocumentation();

      console.log('Generating building instructions...');

      // Generate code from AI
      const generatedCode = await this.aiService.generateBuildingCode(
        prompt,
        relevantParts,
        builderAPI
      );

      console.log('\n📝 Generated Code:');
      console.log('─'.repeat(50));
      console.log(generatedCode);
      console.log('─'.repeat(50));

      // Validate the code
      if (!this.codeExecutor.validateCode(generatedCode)) {
        throw new Error('Generated code failed validation');
      }

      // Execute the code
      const modelName = prompt.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
      const outputPath = await this.codeExecutor.executeGeneratedCode(generatedCode, modelName);

      console.log(`\n✅ Success! Model saved to: ${outputPath}`);
      console.log('You can open this file in any LDraw-compatible viewer');

    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      console.error('Please try a different prompt or check your API credentials');
    }
  }

  async runInteractive(): Promise<void> {
    await this.initialize();

    const askForPrompt = () => {
      this.rl.question('\n📝 What would you like to build? (or "exit" to quit): ', async (answer) => {
        if (answer.toLowerCase() === 'exit') {
          console.log('Thanks for building with Brickyard! 👋');
          this.rl.close();
          process.exit(0);
        }

        if (answer.trim()) {
          await this.buildFromPrompt(answer.trim());
        }

        askForPrompt();
      });
    };

    console.log('Examples:');
    console.log('  • "a small red car"');
    console.log('  • "a simple house with a door"');
    console.log('  • "a yellow truck"');
    console.log('  • "a spaceship"');

    askForPrompt();
  }

  async buildSingleModel(prompt: string): Promise<void> {
    await this.initialize();
    await this.buildFromPrompt(prompt);
  }
}

// Main execution
async function main() {
  const app = new BrickyardApp();

  // Check if a prompt was provided as command line argument
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const prompt = args.join(' ');
    await app.buildSingleModel(prompt);
  } else {
    // Run interactive mode
    await app.runInteractive();
  }
}

// Run the application
main().catch(console.error);