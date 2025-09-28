import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { LDrawToThree } from './ldrawToThree';
import { PartsDatabase } from './partsDatabase';
import { PartSelector } from './partSelector';
import { AIService } from './aiService';
import { CodeExecutor } from './codeExecutor';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const database = new PartsDatabase();
const partSelector = new PartSelector(database);
const aiService = new AIService();
const codeExecutor = new CodeExecutor('./output');
const ldrawParser = new LDrawToThree();

// Load parts database on startup
let isReady = false;
database.loadParts('./parts.csv').then(() => {
    isReady = true;
    console.log('Parts database loaded');
});

// API: Get list of available models
app.get('/api/models', (req, res) => {
    const outputDir = './output';

    if (!fs.existsSync(outputDir)) {
        return res.json([]);
    }

    const files = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.ldr'))
        .map(file => {
            const filepath = path.join(outputDir, file);
            const content = fs.readFileSync(filepath, 'utf-8');
            const parts = ldrawParser.parseLDrawFile(content);

            return {
                filename: file,
                name: file.replace('.ldr', '').replace(/_/g, ' '),
                parts: parts.length,
                size: `${(fs.statSync(filepath).size / 1024).toFixed(1)} KB`
            };
        })
        .sort((a, b) => b.filename.localeCompare(a.filename));

    res.json(files);
});

// API: Get model data for 3D rendering
app.get('/api/model/:filename', (req, res) => {
    const { filename } = req.params;
    const filepath = path.join('./output', filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Model not found' });
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const parts = ldrawParser.parseLDrawFile(content);

    // Convert parts to viewer format
    const viewerParts = parts.map(part => {
        // Determine part type and size
        let type = 'brick';
        let size = { width: 20, height: 24, depth: 20 };
        let color = 0x808080;

        // Get color from mapping
        const colorMap: { [key: number]: number } = {
            0: 0x05131D, 1: 0x0055BF, 2: 0x257A3E, 3: 0x00AAA4,
            4: 0xC91A09, 5: 0xC870A0, 6: 0x583927, 7: 0x9BA19D,
            8: 0x6D6E5C, 9: 0x6C96BF, 10: 0x73DCA1, 11: 0x3CB371,
            12: 0xF2705E, 13: 0xFC97AC, 14: 0xF2CD37, 15: 0xFFFFFF,
            16: 0x808080, 47: 0xFCFCFC, 36: 0xC91A09, 43: 0xAEDCF0
        };

        color = colorMap[part.color] || 0x808080;

        // Determine size based on part name
        if (part.partName.includes('3001')) {
            size = { width: 40, height: 24, depth: 80 };
        } else if (part.partName.includes('3020')) {
            size = { width: 40, height: 8, depth: 80 };
        } else if (part.partName.includes('wheel') || part.partName.includes('100729')) {
            type = 'wheel';
        } else if (part.partName.includes('0901') || part.partName.includes('0904')) {
            size = { width: 80, height: 8, depth: 80 };
        } else if (part.partName.includes('10314')) {
            size = { width: 20, height: 24, depth: 20 };
        }

        return {
            type,
            size,
            color,
            transparent: part.color === 47 || part.color === 36 || part.color === 43,
            position: {
                x: part.position.x,
                y: part.position.y,
                z: part.position.z
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        };
    });

    res.json({ parts: viewerParts });
});

// API: Build new model from prompt
app.post('/api/build', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({
            success: false,
            error: 'Service is still initializing, please try again'
        });
    }

    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Prompt is required'
        });
    }

    try {
        console.log(`Building model from prompt: ${prompt}`);

        // Get relevant parts for the prompt
        const relevantParts = partSelector.getRelevantParts(prompt);
        const builderAPI = partSelector.getBuilderAPIDocumentation();

        // Generate code from AI
        const generatedCode = await aiService.generateBuildingCode(
            prompt,
            relevantParts,
            builderAPI
        );

        // Validate the code
        if (!codeExecutor.validateCode(generatedCode)) {
            throw new Error('Generated code failed validation');
        }

        // Execute the code
        const modelName = prompt.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 30);

        await codeExecutor.executeGeneratedCode(generatedCode, modelName);

        res.json({
            success: true,
            filename: `${modelName}.ldr`,
            code: generatedCode
        });

    } catch (error: any) {
        console.error('Build error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Brickyard 3D Viewer running at http://localhost:${PORT}`);
    console.log('Open this URL in your browser to view your LEGO models in 3D!\n');
});

// Handle server errors
server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close other instances or use a different port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Keep the process alive
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Prevent the process from exiting
process.stdin.resume();