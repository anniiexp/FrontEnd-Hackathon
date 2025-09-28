import React, { useState, useRef, useEffect } from 'react';

interface LDrawCodeEditorProps {
  onModelGenerated: (ldrawContent: string, filename?: string, isPreview?: boolean) => void;
}

const LDrawCodeEditor: React.FC<LDrawCodeEditorProps> = ({ onModelGenerated }) => {
  const [filename, setFilename] = useState<string>('my_model');
  const [livePreview, setLivePreview] = useState<boolean>(true);
  const [code, setCode] = useState<string>(`// Create a simple car with step-by-step building instructions
// Available colors: BLACK, BLUE, GREEN, RED, YELLOW, WHITE, etc.

// Create a new builder
const builder = new LDrawBuilder('Step-by-Step Car');
builder.setAuthor('Code Generator');

// Step 1: Car base
builder.addPlate('3035', Colors.RED, 0, 0, 0);
builder.addStep(); // Mark the end of step 1

// Step 2: Add front wheels
builder.addPart('4600', Colors.BLACK, -20, 8, -30);
builder.addWheel('3641', -20, 8, -30);
builder.addPart('4600', Colors.BLACK, 20, 8, -30);
builder.addWheel('3641', 20, 8, -30);
builder.addStep(); // Mark the end of step 2

// Step 3: Add back wheels
builder.addPart('4600', Colors.BLACK, -20, 8, 30);
builder.addWheel('3641', -20, 8, 30);
builder.addPart('4600', Colors.BLACK, 20, 8, 30);
builder.addWheel('3641', 20, 8, 30);
builder.addStep(); // Mark the end of step 3

// Step 4: Car body
builder.addBrick('3001', Colors.RED, 0, -8, -20);
builder.addBrick('3001', Colors.RED, 0, -8, 20);
builder.addStep(); // Mark the end of step 4

// Step 5: Windshield and roof
builder.addPart('3039', Colors.TRANS_CLEAR, 0, -16, -20);
builder.addPlate('3020', Colors.RED, 0, -24, 0);
// No need to call addStep() at the end - it's added automatically

// Save the model (uses filename from input field above)
// Or you can specify a custom name: builder.save('my_car');
builder.save();

// For live preview compatibility, also return the content
return builder.getContent();`);

  const [error, setError] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const executeCode = async (isLivePreview = false) => {
    console.log(`[LDrawCodeEditor] Executing code - Live Preview: ${isLivePreview}`);
    setError('');
    if (!isLivePreview) {
      setIsExecuting(true);
    }

    try {
      // Create a sandboxed function that can optionally return content
      const func = new Function('LDrawBuilder', 'Colors', code);
      console.log('[LDrawCodeEditor] Code compiled successfully');

      // Create a special version of LDrawBuilder with save method
      const LDrawBuilder = createLDrawBuilderClass(isLivePreview);
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
      console.log('[LDrawCodeEditor] Code execution result type:', typeof result);

      // Only process explicit returns for live preview
      if (isLivePreview && typeof result === 'string') {
        console.log('[LDrawCodeEditor] Live preview - generating model, content length:', result.length);
        // For live preview, always use a temp file name and mark as preview
        onModelGenerated(result, 'preview_temp', true);
      } else if (!isLivePreview && typeof result === 'string') {
        // Manual generation with return statement
        const sanitizedFilename = filename.trim() || 'generated_model';
        console.log(`[LDrawCodeEditor] Manual generation - saving as ${sanitizedFilename}`);
        onModelGenerated(result, sanitizedFilename, false);
        console.log('Generated LDraw model successfully');
      } else if (isLivePreview && typeof result !== 'string') {
        console.log('[LDrawCodeEditor] Live preview - no return value, save() method may have been called');
      }
      // If no return value, the save() method handles it (see createLDrawBuilderClass)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      if (!isLivePreview) {
        console.error('Code execution error:', err);
      }
    } finally {
      if (!isLivePreview) {
        setIsExecuting(false);
      }
    }
  };

  // Effect for live preview with debouncing
  useEffect(() => {
    if (!livePreview) {
      console.log('[LDrawCodeEditor] Live preview is disabled, skipping auto-execution');
      return;
    }

    console.log('[LDrawCodeEditor] Code changed, setting up debounce timer');

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced execution
    debounceTimerRef.current = setTimeout(() => {
      console.log('[LDrawCodeEditor] Debounce timer fired, executing code');
      executeCode(true);
    }, 5000); // 1 second delay after user stops typing

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [code, livePreview]);

  // Initial execution when component mounts
  useEffect(() => {
    console.log('[LDrawCodeEditor] Component mounted, live preview:', livePreview);
    if (livePreview) {
      console.log('[LDrawCodeEditor] Executing initial code');
      executeCode(true);
    }
  }, []);

  // Create the LDrawBuilder class in the browser
  const createLDrawBuilderClass = (isLivePreview: boolean) => {
    return class LDrawBuilder {
      private elements: any[] = [];
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

      addStep(): this {
        // Only add step if there are parts since the last step
        if (this.elements.length > 0) {
          const lastElement = this.elements[this.elements.length - 1];
          // Don't add duplicate steps
          if (!('command' in lastElement) || lastElement.command !== 'STEP') {
            this.elements.push({
              lineType: 0,
              command: 'STEP'
            });
          }
        }
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
        this.elements.push({
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

        for (const element of this.elements) {
          if ('command' in element && element.command === 'STEP') {
            // Add step marker
            lines.push('0 STEP');
            lines.push(''); // Add blank line after step for readability
          } else if ('partName' in element) {
            // Add part
            const line = `1 ${element.color} ${element.x} ${element.y} ${element.z} ${element.a} ${element.b} ${element.c} ${element.d} ${element.e} ${element.f} ${element.g} ${element.h} ${element.i} ${element.partName}`;
            lines.push(line);
          }
        }

        // Add final step command if not already present
        const lastElement = this.elements[this.elements.length - 1];
        if (!lastElement || !('command' in lastElement) || lastElement.command !== 'STEP') {
          lines.push('0 STEP');
        }
        lines.push('');

        return lines.join('\n');
      }

      clear(): this {
        this.elements = [];
        return this;
      }

      getPartCount(): number {
        return this.elements.filter((el: any) => 'partName' in el).length;
      }

      getContent(): string {
        return this.generateLDraw();
      }

      save(saveFilename?: string): void {
        // In browser context, save triggers the model generation
        const content = this.generateLDraw();
        const finalFilename = saveFilename || filename || 'generated_model';
        console.log(`[LDrawBuilder.save] Called with filename: ${saveFilename}, isLivePreview: ${isLivePreview}`);
        console.log(`[LDrawBuilder.save] Generated content length: ${content.length}`);

        if (!isLivePreview) {
          // Only actually save when not in live preview mode
          console.log(`[LDrawBuilder.save] Saving model as ${finalFilename}.ldr`);
          onModelGenerated(content, finalFilename, false);
          console.log(`Model saved as ${finalFilename}.ldr`);
        } else {
          // In live preview, use temp file
          console.log('[LDrawBuilder.save] Live preview mode - saving to preview_temp');
          onModelGenerated(content, 'preview_temp', true);
        }
      }
    };
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
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
          gap: '10px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#a0a0a0',
            fontSize: '13px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={livePreview}
              onChange={(e) => setLivePreview(e.target.checked)}
              style={{
                cursor: 'pointer'
              }}
            />
            Live Preview
          </label>
        </div>

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
          onClick={() => executeCode(false)}
          disabled={isExecuting || livePreview}
          style={{
            padding: '6px 12px',
            backgroundColor: (isExecuting || livePreview) ? '#4a4a4a' : '#0e7490',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isExecuting || livePreview) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s',
            opacity: livePreview ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isExecuting && !livePreview) {
              e.currentTarget.style.backgroundColor = '#0891b2';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExecuting && !livePreview) {
              e.currentTarget.style.backgroundColor = '#0e7490';
            }
          }}
          title={livePreview ? 'Disable live preview to manually generate' : ''}
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

      {livePreview && !error && (
        <div style={{
          padding: '8px',
          backgroundColor: '#1e3e1e',
          borderTop: '1px solid #2e5e2e',
          color: '#71f871',
          fontSize: '11px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            backgroundColor: '#71f871',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }}></span>
          Live preview enabled - Model updates as you type
        </div>
      )}
      </div>
    </>
  );
};

export default LDrawCodeEditor;