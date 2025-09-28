import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { LDrawBuilder, Colors } from './ldrawBuilder';

export class CodeExecutor {
  private outputDir: string;

  constructor(outputDir: string = './website/output') {
    this.outputDir = outputDir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  async executeGeneratedCode(code: string, modelName: string = 'generated_model'): Promise<string> {
    try {
      console.log('Executing generated code...');

      // Create a sandboxed context with our builder API
      const sandbox = {
        LDrawBuilder: LDrawBuilder,
        Colors: Colors,
        console: {
          log: (...args: any[]) => console.log('[AI]:', ...args)
        },
        require: (module: string) => {
          // Only allow specific modules
          if (module === './ldrawBuilder') {
            return { LDrawBuilder, Colors };
          }
          throw new Error(`Module ${module} is not allowed`);
        }
      };

      // Create the context
      const context = vm.createContext(sandbox);

      // Wrap the code to capture the builder instance
      const wrappedCode = `
        ${code}
        // Return the filename that was saved
        if (typeof builder !== 'undefined' && builder.save) {
          const filename = '${modelName}.ldr';
          builder.save('${path.join(this.outputDir, modelName)}.ldr');
          filename;
        } else {
          throw new Error('No builder instance found or save method not called');
        }
      `;

      // Execute the code with a timeout
      const options = {
        filename: 'generated.js',
        timeout: 5000, // 5 second timeout
        displayErrors: true
      };

      const script = new vm.Script(wrappedCode, options);
      const result = script.runInContext(context, options);

      const outputPath = path.join(this.outputDir, `${modelName}.ldr`);

      if (fs.existsSync(outputPath)) {
        console.log(`Model successfully created at: ${outputPath}`);
        return outputPath;
      } else {
        throw new Error('Model file was not created');
      }
    } catch (error: any) {
      console.error('Code execution error:', error.message);
      throw new Error(`Failed to execute generated code: ${error.message}`);
    }
  }

  // Validate that the generated code is safe
  validateCode(code: string): boolean {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /process\./g,
      /require\s*\(\s*['"`][^'"`]*['"`]\s*\)/g, // Except our allowed modules
      /import\s+/g,
      /eval\s*\(/g,
      /Function\s*\(/g,
      /exec\s*\(/g,
      /spawn\s*\(/g,
      /__dirname/g,
      /__filename/g,
      /fs\./g,
      /path\./g
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        // Allow specific safe patterns
        if (pattern.toString().includes('require') &&
            (code.includes("require('./ldrawBuilder')") ||
             code.includes('require("./ldrawBuilder")'))) {
          continue;
        }
        console.warn(`Potentially dangerous pattern found: ${pattern}`);
        return false;
      }
    }

    // Check that code uses the builder API
    if (!code.includes('new LDrawBuilder') && !code.includes('builder')) {
      console.warn('Code does not appear to use the LDrawBuilder API');
      return false;
    }

    return true;
  }

  // Clean up old generated files
  cleanupOldFiles(keepLast: number = 5): void {
    const files = fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.ldr'))
      .map(file => ({
        name: file,
        path: path.join(this.outputDir, file),
        time: fs.statSync(path.join(this.outputDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remove old files, keeping the most recent ones
    files.slice(keepLast).forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`Cleaned up old file: ${file.name}`);
    });
  }
}