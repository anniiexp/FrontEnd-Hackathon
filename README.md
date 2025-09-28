# Brickyard - AI-Powered LEGO LDraw Generator with 3D Viewer

An AI-powered system that generates LEGO models from natural language prompts using the Snowflake Cortex API and creates LDraw (.ldr) files with a built-in 3D viewer.

## Features

- 🤖 AI-powered model generation from text prompts
- 🧱 Access to 59,000+ LEGO parts database
- 📐 Generates standard LDraw format files
- 🔒 Sandboxed code execution for safety
- 🎨 Support for all standard LEGO colors
- 📦 Simple TypeScript API for building models
- 🌐 **3D Web Viewer with Three.js** - View your creations in the browser!

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with your Snowflake credentials:

```env
SNOWFLAKE_PAT=your_personal_access_token
ACCOUNT_IDENTIFIER=your_account_identifier
```

## Usage

### Command Line Mode

Build models from the command line:

```bash
npm start "your prompt here"
```

Example:
```bash
npm start "a small red car"
npm start "a simple house with a door"
npm start "a spaceship"
```

### Interactive Mode

Run interactive prompt mode:

```bash
npm start
```

### 3D Web Viewer with LDrawLoader

Launch the development server with Three.js LDrawLoader:

```bash
npm run dev:site
```

Then open http://localhost:3001 in your browser.

This uses the official Three.js LDrawLoader for accurate LEGO rendering.

**Viewer Features:**
- 🎮 Interactive 3D controls (rotate, zoom, pan)
- 📦 View all generated models
- 🔨 Build new models directly from the browser
- ⚡ Real-time rendering with Three.js
- 🎨 Accurate LEGO colors and transparency

**Controls:**
- Left click + drag: Rotate view
- Right click + drag: Pan view
- Scroll: Zoom in/out
- Buttons: Reset view, toggle grid, auto-rotate

## Output

Generated models are saved in the `output/` directory as `.ldr` files that can be opened in:
- The built-in 3D web viewer
- LDView
- LeoCAD
- Bricksmith
- Stud.io
- Any LDraw-compatible viewer

## How It Works

1. **Prompt Analysis**: The system analyzes your prompt to understand what you want to build
2. **Part Selection**: Relevant LEGO parts are selected from the database based on the prompt
3. **AI Code Generation**: Snowflake's Claude model generates TypeScript code using the builder API
4. **Sandboxed Execution**: The generated code is safely executed in a sandboxed environment
5. **LDraw Generation**: The code creates a properly formatted LDraw file
6. **3D Visualization**: The model can be instantly viewed in the web-based 3D viewer

## Example Generated Models

The system has successfully generated and rendered:
- ✅ Small red car with wheels and windshield
- ✅ Simple house with door, window, and roof
- ✅ Spaceship with wings and thrusters

## Project Structure

```
brickyard/
├── src/
│   ├── index.ts           # Main CLI application
│   ├── server.ts          # Express server for 3D viewer
│   ├── partsDatabase.ts   # Parts CSV loader
│   ├── ldrawBuilder.ts    # LDraw file builder API
│   ├── ldrawToThree.ts    # LDraw to Three.js converter
│   ├── aiService.ts       # Snowflake Cortex integration
│   ├── partSelector.ts    # Part selection logic
│   └── codeExecutor.ts    # Safe code execution
├── public/
│   ├── index.html         # 3D viewer interface
│   └── viewer.js          # Three.js viewer logic
├── parts/                 # LDraw part files (23,000+)
├── output/                # Generated models
└── parts.csv              # LEGO parts database (59,000+)
```

## Development

Build the TypeScript files:
```bash
npm run build
```

Watch mode for development:
```bash
npm run dev
```

Run 3D viewer in dev mode:
```bash
npm run viewer:dev
```

## API Endpoints

The 3D viewer server provides:
- `GET /api/models` - List all generated models
- `GET /api/model/:filename` - Get model data for rendering
- `POST /api/build` - Build new model from prompt

## Technologies Used

- **TypeScript** - Type-safe development
- **Three.js** - 3D graphics rendering
- **Express** - Web server
- **Snowflake Cortex** - AI model for code generation
- **LDraw** - LEGO CAD file format
- **Node.js VM** - Sandboxed code execution

## License

Licensed under CC BY 4.0