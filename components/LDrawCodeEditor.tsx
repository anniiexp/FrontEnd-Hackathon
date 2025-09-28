import React, { useState, useRef, useEffect } from 'react';

interface LDrawCodeEditorProps {
  onModelGenerated: (ldrawContent: string, filename?: string) => void;
}

const LDrawCodeEditor: React.FC<LDrawCodeEditorProps> = ({ onModelGenerated }) => {
  const [filename, setFilename] = useState<string>('my_model');
  const [code, setCode] = useState<string>(`// Create a simple car using LDraw Builder
// Available colors: BLACK, BLUE, GREEN, RED, YELLOW, WHITE, etc.

// Create a new builder
const builder = new LDrawBuilder('My Custom Model');
builder.setAuthor('Code Generator');

// Car base - use a 4x8 plate
builder.addPlate('3035', Colors.RED, 0, 0, 0);

// Add wheels - 2x2 wheel holders with wheels
// Front left wheel
builder.addPart('4600', Colors.BLACK, -20, 8, -30);
builder.addWheel('3641', -20, 8, -30);

// Front right wheel
builder.addPart('4600', Colors.BLACK, 20, 8, -30);
builder.addWheel('3641', 20, 8, -30);

// Back left wheel
builder.addPart('4600', Colors.BLACK, -20, 8, 30);
builder.addWheel('3641', -20, 8, 30);

// Back right wheel
builder.addPart('4600', Colors.BLACK, 20, 8, 30);
builder.addWheel('3641', 20, 8, 30);

// Car body - use 2x4 bricks
builder.addBrick('3001', Colors.RED, 0, -8, -20);
builder.addBrick('3001', Colors.RED, 0, -8, 20);

// Windshield - use a transparent slope
builder.addPart('3039', Colors.TRANS_CLEAR, 0, -16, -20);

// Roof
builder.addPlate('3020', Colors.RED, 0, -24, 0);

// Generate the LDraw content
return builder.getContent();`);

  const [error, setError] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);

      // Set cursor position after the tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Execute the code
  const executeCode = async () => {
    setError('');
    setIsExecuting(true);

    try {
      // Create a sandboxed function that returns the LDraw content
      const func = new Function('LDrawBuilder', 'Colors', code);

      // Import the actual LDrawBuilder class and Colors
      // For now, we'll define them inline
      const LDrawBuilder = createLDrawBuilderClass();
      const Colors = {
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

      const result = func(LDrawBuilder, Colors);

      if (typeof result === 'string') {
        // Pass both the content and the filename
        const sanitizedFilename = filename.trim() || 'generated_model';
        onModelGenerated(result, sanitizedFilename);
        console.log('Generated LDraw model successfully');
      } else {
        throw new Error('Code must return a string containing LDraw content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Code execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Create the LDrawBuilder class in the browser
  const createLDrawBuilderClass = () => {
    return class LDrawBuilder {
      private parts: any[] = [];
      private currentColor: number = 16;
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

      addBrick(partNum: string, color: number, x: number, y: number, z: number): this {
        return this.addPart(partNum, color, x, y, z);
      }

      addPlate(partNum: string, color: number, x: number, y: number, z: number): this {
        return this.addPart(partNum, color, x, y, z);
      }

      addWheel(partNum: string, x: number, y: number, z: number): this {
        return this.addPart(partNum, 0, x, y, z);
      }

      addPartRotatedY90(partNum: string, color: number, x: number, y: number, z: number): this {
        return this.addPart(partNum, color, x, y, z,
          0, 0, -1,
          0, 1, 0,
          1, 0, 0
        );
      }

      addPartRotatedX90(partNum: string, color: number, x: number, y: number, z: number): this {
        return this.addPart(partNum, color, x, y, z,
          1, 0, 0,
          0, 0, -1,
          0, 1, 0
        );
      }

      generateLDraw(): string {
        const lines: string[] = [];

        lines.push(`0 ${this.modelName}`);
        lines.push(`0 Name: generated.ldr`);
        lines.push(`0 Author: ${this.author}`);
        lines.push(`0 !LICENSE Licensed under CC BY 4.0`);
        lines.push('');
        lines.push('0 BFC CERTIFY CCW');
        lines.push('');

        for (const part of this.parts) {
          const line = `1 ${part.color} ${part.x} ${part.y} ${part.z} ${part.a} ${part.b} ${part.c} ${part.d} ${part.e} ${part.f} ${part.g} ${part.h} ${part.i} ${part.partName}`;
          lines.push(line);
        }

        lines.push('0 STEP');
        lines.push('');

        return lines.join('\n');
      }

      clear(): this {
        this.parts = [];
        return this;
      }

      getPartCount(): number {
        return this.parts.length;
      }

      getContent(): string {
        return this.generateLDraw();
      }
    };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1e1e1e',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '10px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #3e3e3e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px'
      }}>
        <h3 style={{ margin: 0, color: '#e0e0e0', fontSize: '14px', flexShrink: 0 }}>
          LDraw Code Editor
        </h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          maxWidth: '400px'
        }}>
          <label style={{
            color: '#a0a0a0',
            fontSize: '13px',
            flexShrink: 0
          }}>
            Filename:
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="my_model"
            style={{
              flex: 1,
              padding: '4px 8px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              border: '1px solid #3e3e3e',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#0e7490'}
            onBlur={(e) => e.target.style.borderColor = '#3e3e3e'}
          />
          <span style={{
            color: '#707070',
            fontSize: '13px'
          }}>
            .ldr
          </span>
        </div>

        <button
          onClick={executeCode}
          disabled={isExecuting}
          style={{
            padding: '6px 12px',
            backgroundColor: isExecuting ? '#4a4a4a' : '#0e7490',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isExecuting) {
              e.currentTarget.style.backgroundColor = '#0891b2';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExecuting) {
              e.currentTarget.style.backgroundColor = '#0e7490';
            }
          }}
        >
          {isExecuting ? 'Generating...' : '▶ Generate Model'}
        </button>
      </div>

      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'auto'
      }}>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            width: '100%',
            height: '100%',
            padding: '12px',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            border: 'none',
            outline: 'none',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.5',
            resize: 'none',
            tabSize: 2
          }}
          placeholder="Write your LDraw generation code here..."
        />
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#3e1e1e',
          borderTop: '1px solid #5e2e2e',
          color: '#f87171',
          fontSize: '12px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace'
        }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default LDrawCodeEditor;