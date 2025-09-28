import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Image from 'next/image';
import modelsData from '../models.json';
import promptsData from '../lego_prompts.json';
import styles from '../styles/v2.module.css';

const LDRViewer = dynamic(() => import('../components/LDRViewer'), {
  ssr: false,
  loading: () => <div>Loading 3D viewer...</div>
});

// API configuration - matching the example
const API_URL = 'https://brickyard-worker.rileyseefeldt.workers.dev/api/design';
const API_KEY = '8da1cab1da4d37b77a008b8162bbdd650f03cde8ecd5a429ba443ece86a44b8c';

interface VoteOption {
  value: 'A' | 'TIE' | 'BOTH_BAD' | 'B' | null;
  label: string;
}

export default function V2() {
  const [ldrawContent1, setLdrawContent1] = useState<string>('');
  const [ldrawContent2, setLdrawContent2] = useState<string>('');
  const [model1Path, setModel1Path] = useState<string>('');
  const [model2Path, setModel2Path] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedModel1, setSelectedModel1] = useState<string>('');
  const [selectedModel2, setSelectedModel2] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [vote, setVote] = useState<VoteOption['value']>(null);
  const [voteSaved, setVoteSaved] = useState<boolean>(false);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [viewerKey1, setViewerKey1] = useState<number>(0);
  const [viewerKey2, setViewerKey2] = useState<number>(0);

  // Get random element from array
  const getRandomElement = <T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // Get two different random models
  const getTwoRandomModels = (): [string, string] => {
    const models = [...modelsData.models];
    const model1 = getRandomElement(models);
    const remainingModels = models.filter(m => m !== model1);
    const model2 = getRandomElement(remainingModels);
    return [model1, model2];
  };

  // Call API directly to generate LDR content (matching the example)
  const fetchLDRFromAPI = async (prompt: string, model: string): Promise<any | null> => {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100000); // 100 second timeout

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Key': API_KEY
        },
        body: JSON.stringify({
          prompt: prompt,
          model: model
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`API request failed for ${model}: ${response.status} ${response.statusText}`);
        // Try to get error details if available
        try {
          const errorText = await response.text();
          console.error(`Error details for ${model}:`, errorText);
        } catch (e) {
          // Ignore if we can't read the error
        }
        return null; // Return null instead of throwing
      }

      // First get the response as text to see what we're getting
      const responseText = await response.text();
      console.log(`Raw response for ${model} (first 500 chars):`, responseText.substring(0, 500));

      // Check if the response starts with "0 " which indicates it's raw LDR content
      if (responseText.startsWith('0 ') || responseText.includes('.dat')) {
        // It's raw LDR content, not JSON
        console.log(`Response for ${model} is raw LDR content`);
        return {
          ldrContent: responseText,
          model: model,
          prompt: prompt
        };
      } else {
        // Try to parse it as JSON
        try {
          const data = JSON.parse(responseText);
          // Return the full data object
          return data;
        } catch (parseError) {
          console.error(`Failed to parse JSON response for ${model}:`, parseError);
          console.log('Response that failed to parse:', responseText);
          return null;
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`API request timeout for ${model} (100s exceeded)`);
      } else {
        console.error(`API request error for ${model}:`, error);
      }
      return null; // Return null for any error
    }
  };

  // Generate models automatically on mount
  useEffect(() => {
    generateNewRound();
  }, []);

  const generateNewRound = async () => {
    // Reset vote and content
    setVote(null);
    setVoteSaved(false);
    setLdrawContent1('');
    setLdrawContent2('');
    setModel1Path('');
    setModel2Path('');

    // Pick random models and prompt
    const [model1, model2] = getTwoRandomModels();
    const prompt = getRandomElement(promptsData.prompts);

    setSelectedModel1(model1);
    setSelectedModel2(model2);
    setCurrentPrompt(prompt);

    // Generate both models
    await generateModels(model1, model2, prompt);
  };

  const generateModels = async (model1: string, model2: string, prompt: string) => {
    setGenerating(true);
    setGenerationStatus('');
    setError('');

    try {
      // Generate first model
      setGenerationStatus(`Generating with ${model1}...`);
      console.log(`Fetching Model A: ${model1}`);
      const responseData1 = await fetchLDRFromAPI(prompt, model1);

      if (responseData1 && responseData1.ldrContent) {
        console.log('Model A response data:', responseData1);
        console.log('Model A LDraw content preview:', responseData1.ldrContent.substring(0, 500));
        // Save model A to a file
        const saveResponse1 = await fetch('/api/save-generated-ldr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: responseData1.ldrContent,
            filename: `v2_model_a_${Date.now()}.ldr`
          })
        });
        const saveData1 = await saveResponse1.json();
        setModel1Path(saveData1.path);
        setViewerKey1(prev => prev + 1);
      } else {
        console.log('Model A failed to generate');
        setLdrawContent1('FAILED');
        setModel1Path('');
      }

      // Wait 0.5 seconds before generating the second model
      setGenerationStatus('Waiting 0.5s...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate second model
      setGenerationStatus(`Generating with ${model2}...`);
      console.log(`Fetching Model B: ${model2}`);
      const responseData2 = await fetchLDRFromAPI(prompt, model2);

      if (responseData2 && responseData2.ldrContent) {
        console.log('Model B response data:', responseData2);
        console.log('Model B LDraw content preview:', responseData2.ldrContent.substring(0, 500));
        // Save model B to a file
        const saveResponse2 = await fetch('/api/save-generated-ldr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: responseData2.ldrContent,
            filename: `v2_model_b_${Date.now()}.ldr`
          })
        });
        const saveData2 = await saveResponse2.json();
        setModel2Path(saveData2.path);
        setViewerKey2(prev => prev + 1);
      } else {
        console.log('Model B failed to generate');
        setLdrawContent2('FAILED');
        setModel2Path('');
      }

      setGenerationStatus('');
      console.log('Models loaded successfully!');

      // Store model information for voting
      (window as any).currentComparison = {
        prompt: prompt,
        modelA: model1,
        modelB: model2,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate models');
      console.error('Error generating models:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleVote = async (voteOption: VoteOption['value']) => {
    if (!voteOption || voteSaved) return;

    setVote(voteOption);
    setVoteSaved(true);

    // Submit votes to the API based on the selection immediately
    const voteEndpoint = 'https://brickyard-worker.rileyseefeldt.workers.dev/api/vote';
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Key': '8da1cab1da4d37b77a008b8162bbdd650f03cde8ecd5a429ba443ece86a44b8c'
    };

    try {
      // Determine which models to vote for based on selection
      const votesToSubmit = [];

      if (voteOption === 'A') {
        // Vote for Model A only
        votesToSubmit.push({
          agent_type: selectedModel1,
          prompt: currentPrompt
        });
      } else if (voteOption === 'B') {
        // Vote for Model B only
        votesToSubmit.push({
          agent_type: selectedModel2,
          prompt: currentPrompt
        });
      } else if (voteOption === 'TIE') {
        // Vote for both models (they're both good)
        votesToSubmit.push({
          agent_type: selectedModel1,
          prompt: currentPrompt
        });
        votesToSubmit.push({
          agent_type: selectedModel2,
          prompt: currentPrompt
        });
      }
      // If voteOption === 'BOTH_BAD', don't vote for either (votesToSubmit remains empty)

      // Submit each vote
      for (const voteData of votesToSubmit) {
        try {
          const response = await fetch(voteEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(voteData)
          });

          if (response.ok) {
            console.log(`Vote submitted for ${voteData.agent_type}`);
          } else {
            console.error(`Failed to submit vote for ${voteData.agent_type}:`, response.status);
          }
        } catch (error) {
          console.error(`Error submitting vote for ${voteData.agent_type}:`, error);
        }
      }

      // Log the vote decision for debugging
      console.log('Vote decision:', {
        round: roundNumber,
        prompt: currentPrompt,
        model1: selectedModel1,
        model2: selectedModel2,
        vote: voteOption,
        votesSubmitted: votesToSubmit.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in vote submission:', error);
    }
  };

  const handleNextRound = () => {
    setRoundNumber(prev => prev + 1);
    generateNewRound();
  };

  const voteOptions: VoteOption[] = [
    { value: 'A', label: 'A is Better' },
    { value: 'TIE', label: 'Tie' },
    { value: 'BOTH_BAD', label: 'Both Bad' },
    { value: 'B', label: 'B is Better' }
  ];

  return (
    <>
      <Head>
        <title>The Brickyard</title>
        <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.topbar}>
            <a
              href="/v2/leaderboard"
              className={`${styles.chip} ${styles.pixel}`}
              aria-label="Leaderboard"
            >
              Leaderboard
            </a>
            <div className={styles.brand}>
              <h1 className={`${styles.title} ${styles.pixel}`}>The Brickyard</h1>
              <p className={`${styles.subtitle} ${styles.pixel}`}>Which AI generated this brick better?</p>
            </div>
          </header>

          <div className={styles.roundIndicator}>
            Round #{roundNumber}
          </div>

          {/* Current Prompt Display */}
          <section className={styles.promptSection}>
            <div className={styles.promptBox}>
              {currentPrompt || 'Loading prompt...'}
            </div>
            {error && (
              <div className={styles.errorBox}>
                Error: {error}
              </div>
            )}
          </section>

        {/* Dual Model Display */}
        {(model1Path || model2Path || ldrawContent1 === 'FAILED' || ldrawContent2 === 'FAILED') && !generating && (
          <>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3 style={{
                    marginBottom: '10px',
                    color: '#333',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    borderRadius: '4px'
                  }}>
                    Model A
                  </h3>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '10px',
                    color: '#666',
                    fontSize: '0.9rem',
                    minHeight: '20px'
                  }}>
                    {vote ? `(${selectedModel1})` : '\u00A0'}
                  </div>
                  <div style={{
                    border: '6px solid #CBCBCB',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backgroundColor: '#e7eaff',
                    minHeight: '600px',
                    position: 'relative'
                  }}>
                    {model1Path ? (
                      <LDRViewer
                        key={viewerKey1}
                        modelPath={model1Path}
                        preserveCamera={false}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                      }}>
                        ❌ Failed to render
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 style={{
                    marginBottom: '10px',
                    color: '#333',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    borderRadius: '4px'
                  }}>
                    Model B
                  </h3>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '10px',
                    color: '#666',
                    fontSize: '0.9rem',
                    minHeight: '20px'
                  }}>
                    {vote ? `(${selectedModel2})` : '\u00A0'}
                  </div>
                  <div style={{
                    border: '6px solid #CBCBCB',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backgroundColor: '#e7eaff',
                    minHeight: '600px',
                    position: 'relative'
                  }}>
                    {model2Path ? (
                      <LDRViewer
                        key={viewerKey2}
                        modelPath={model2Path}
                        preserveCamera={false}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                      }}>
                        ❌ Failed to render
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Voting Section */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '20px',
                color: '#333',
                textAlign: 'center'
              }}>
                Which model is better?
              </h2>

              {!voteSaved ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  {voteOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleVote(option.value)}
                      style={{
                        padding: '15px 30px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#333',
                        backgroundColor: 'white',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4CAF50';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.borderColor = '#4CAF50';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#333';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    marginBottom: '20px',
                    padding: '10px',
                    backgroundColor: '#e8f5e9',
                    border: '1px solid #a5d6a7',
                    borderRadius: '4px',
                    color: '#2e7d32',
                    fontWeight: '600'
                  }}>
                    ✓ Vote submitted! You chose: {vote === 'A' ? 'Model A' : vote === 'B' ? 'Model B' : vote === 'TIE' ? 'Tie' : 'Both Bad'}
                  </div>
                  <button
                    onClick={handleNextRound}
                    style={{
                      padding: '15px 40px',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      color: 'white',
                      backgroundColor: '#4CAF50',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#45a049';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#4CAF50';
                    }}
                  >
                    Next Round →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Cat Mascot - Always visible */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '20px 0',
          position: 'relative',
          zIndex: 10
        }}>
          <img
            src="/assets/Cats.png"
            alt="pixel cats"
            width={100}
            height={60}
            style={{
              imageRendering: 'pixelated',
              display: 'block'
            }}
          />
        </div>

        {/* Loading State */}
        {generating && (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div className={styles.pixel} style={{ fontSize: '1.5rem', color: '#666', marginBottom: '20px' }}>
              Generating models...
            </div>
            <div className={styles.generatingLoader} style={{
              width: '60px',
              height: '60px',
              margin: '0 auto',
              border: '4px solid #C7BDF8',
              borderTopColor: '#A9A4E8',
              borderRadius: '50%'
            }}></div>
          </div>
        )}

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
            <li>Vote for your preferred model and proceed to the next round</li>
          </ul>
        </div>
      </div>
    </div>
    </>
  );
}