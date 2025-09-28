import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LDRViewer = dynamic(() => import('../components/LDRViewer'), {
  ssr: false,
  loading: () => <div>Loading 3D viewer...</div>
});

const LDrawCodeEditor = dynamic(() => import('../components/LDrawCodeEditor'), {
  ssr: false,
  loading: () => <div>Loading code editor...</div>
});

interface LDRFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export default function Home() {
  const [files, setFiles] = useState<LDRFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-5-sonnet');
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>('');
  const [generatedLDrawContent, setGeneratedLDrawContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ai' | 'code'>('ai');
  const [previewKey, setPreviewKey] = useState<number>(0);

  useEffect(() => {
    fetchLDRFiles();
  }, []);

  const fetchLDRFiles = async () => {
    try {
      const response = await fetch('/api/ldr-files');
      if (!response.ok) {
        throw new Error('Failed to fetch LDR files');
      }
      const data = await response.json();
      setFiles(data.files);
      if (data.files.length > 0) {
        setSelectedFile(data.files[0].path);
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFile(event.target.value);
    setGeneratedLDrawContent(''); // Clear generated content when selecting a file
  };

  const handleModelGenerated = async (ldrawContent: string, filename?: string, isPreview?: boolean) => {
    console.log(`[handleModelGenerated] Called with filename: ${filename}, isPreview: ${isPreview}, content length: ${ldrawContent.length}`);

    try {
      // Use provided filename or generate one
      const modelFilename = isPreview
        ? 'preview_temp.ldr'
        : (filename ? `${filename}.ldr` : `generated_${Date.now()}.ldr`);

      console.log(`[handleModelGenerated] Saving to file: ${modelFilename}`);

      // Save the generated content to a file
      const response = await fetch('/api/save-generated-ldr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: ldrawContent,
          filename: modelFilename,
          isPreview: isPreview
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save generated model');
      }

      const data = await response.json();
      console.log(`[handleModelGenerated] File saved successfully:`, data);

      if (isPreview) {
        // For preview, add timestamp to path to force reload
        const pathWithTimestamp = `${data.path}?t=${Date.now()}`;
        console.log(`[handleModelGenerated] Preview mode - updating viewer with path: ${pathWithTimestamp}`);
        setSelectedFile(pathWithTimestamp);
        setGeneratedLDrawContent(''); // Clear direct content since we're using file
        // Force viewer to reload by changing key
        setPreviewKey(prev => prev + 1);
      } else {
        // For actual save, refresh file list and select the new file
        console.log(`[handleModelGenerated] Save mode - refreshing file list`);
        await fetchLDRFiles();
        setSelectedFile(data.path);
        setGeneratedLDrawContent('');
      }
    } catch (err) {
      console.error('Error saving generated model:', err);
      // Fall back to direct content preview if saving failed
      setGeneratedLDrawContent(ldrawContent);
      setSelectedFile('');
    }
  };

  const handleGenerateLego = async () => {
    if (!prompt.trim()) {
      setGenerationError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setGenerationError('');

    try {
      const response = await fetch('/api/generate-lego', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate model');
      }

      const data = await response.json();

      // Refresh the file list
      await fetchLDRFiles();

      // Select the newly generated file
      setSelectedFile(data.path);

      // Clear the prompt
      setPrompt('');

    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate model');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#333'
        }}>
          LDR Brick Renderer
        </h1>

        {/* Generation Section with Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          overflow: 'hidden'
        }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                flex: 1,
                padding: '15px',
                backgroundColor: activeTab === 'ai' ? 'white' : '#f9fafb',
                border: 'none',
                borderBottom: activeTab === 'ai' ? '2px solid #4CAF50' : 'none',
                marginBottom: activeTab === 'ai' ? '-2px' : '0',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: activeTab === 'ai' ? '600' : '500',
                color: activeTab === 'ai' ? '#4CAF50' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              🤖 AI Generation
            </button>
            <button
              onClick={() => setActiveTab('code')}
              style={{
                flex: 1,
                padding: '15px',
                backgroundColor: activeTab === 'code' ? 'white' : '#f9fafb',
                border: 'none',
                borderBottom: activeTab === 'code' ? '2px solid #4CAF50' : 'none',
                marginBottom: activeTab === 'code' ? '-2px' : '0',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: activeTab === 'code' ? '600' : '500',
                color: activeTab === 'code' ? '#4CAF50' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              &lt;/&gt; Code Editor
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'ai' ? (
            <div style={{ padding: '20px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '15px',
                color: '#333'
              }}>Generate with AI</h2>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="prompt-input" style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              color: '#555'
            }}>
              Enter your prompt:
            </label>
            <input
              id="prompt-input"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., a blue spaceship, a red car, a small house"
              disabled={generating}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGenerateLego();
                }
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="model-select" style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              color: '#555'
            }}>
              Select model:
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={generating}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            >
              <option value="claude">Claude</option>
              <option value="claude-4">Claude 4</option>
              <option value="grok">Grok</option>
              <option value="grok-4">Grok 4</option>
              <option value="sonnet">Sonnet</option>
              <option value="gemini">Gemini</option>
              <option value="llama">LLaMA</option>
              <option value="mistral">Mistral</option>
              <option value="deepseek">DeepSeek</option>
              <option value="qwen3">Qwen 3</option>
              <option value="llama3.1-405b">LLaMA 3.1 405B</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="kimi-k2">Kimi K2</option>
              <option value="gpt4o-mini">GPT-4o Mini</option>
              <option value="gpt5">GPT-5</option>
              <option value="gpt-5-codex">GPT-5 Codex</option>
            </select>
          </div>

          <button
            onClick={handleGenerateLego}
            disabled={generating || !prompt.trim()}
            style={{
              padding: '12px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'white',
              backgroundColor: generating ? '#9CA3AF' : '#4CAF50',
              border: 'none',
              borderRadius: '6px',
              cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!generating && prompt.trim()) {
                e.currentTarget.style.backgroundColor = '#45a049';
              }
            }}
            onMouseLeave={(e) => {
              if (!generating && prompt.trim()) {
                e.currentTarget.style.backgroundColor = '#4CAF50';
              }
            }}
          >
            {generating ? 'Generating...' : 'Generate LEGO Model'}
          </button>

          {generationError && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              color: '#c62828'
            }}>
              Error: {generationError}
            </div>
          )}

          {generating && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: '4px',
              color: '#1565c0'
            }}>
              Generating your LEGO model... This may take a moment.
            </div>
          )}
            </div>
          ) : (
            <div style={{ height: '500px' }}>
              <LDrawCodeEditor onModelGenerated={handleModelGenerated} />
            </div>
          )}
        </div>

        {/* File Selection Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="file-select" style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '1.1rem',
              fontWeight: '500',
              color: '#555'
            }}>
              Select an LDR file:
            </label>
            <select
              id="file-select"
              value={selectedFile}
              onChange={handleFileChange}
              disabled={loading || files.length === 0}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            >
              {loading && <option>Loading files...</option>}
              {!loading && files.length === 0 && <option>No LDR files found</option>}
              {files.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{
              padding: '10px',
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              color: '#c62828',
              marginBottom: '20px'
            }}>
              Error: {error}
            </div>
          )}

          {(selectedFile || generatedLDrawContent) && !loading && !error && (
            <div style={{ marginTop: '20px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                marginBottom: '15px',
                color: '#333'
              }}>
                3D Model Preview
              </h2>
              <LDRViewer
                key={previewKey}
                modelPath={selectedFile || undefined}
                ldrawContent={generatedLDrawContent || undefined}
                preserveCamera={activeTab === 'code'}
              />
            </div>
          )}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#555', marginBottom: '10px' }}>Controls</h3>
          <ul style={{ color: '#666', lineHeight: '1.8' }}>
            <li>Left click and drag to rotate the model</li>
            <li>Right click and drag to pan</li>
            <li>Scroll to zoom in/out</li>
          </ul>
        </div>
      </div>
    </div>
  );
}