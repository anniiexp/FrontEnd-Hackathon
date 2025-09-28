import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { prompt, model = 'claude-3-5-sonnet' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Call the LEGO AI service
    const response = await fetch('https://lego-ai-service-fj3qy5ba8-gnome101s-projects.vercel.app/api/build', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'a0c8250b52b1834a71d7b9022c5020725d22f29bba19700bd1d5558807ea18d4'
      },
      body: JSON.stringify({ prompt, model })
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    // Parse the JSON response to extract the LDR content
    const responseData = await response.json();

    // Extract the actual LDR content from the response
    const ldrContent = responseData.ldrContent || responseData.content || responseData;

    // If ldrContent is still an object, stringify it (fallback)
    const finalLdrContent = typeof ldrContent === 'string' ? ldrContent : JSON.stringify(ldrContent);

    // Generate a filename based on the prompt
    const sanitizedPrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
    const timestamp = Date.now();
    const filename = `${sanitizedPrompt}_${timestamp}.ldr`;

    // Save to public/output directory
    const outputDir = path.join(process.cwd(), 'public', 'output');
    const filePath = path.join(outputDir, filename);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the LDR content to file
    fs.writeFileSync(filePath, finalLdrContent);

    // Return success with the filename
    res.status(200).json({
      success: true,
      filename,
      path: `/output/${filename}`
    });

  } catch (error) {
    console.error('Error generating LEGO model:', error);
    res.status(500).json({
      error: 'Failed to generate LEGO model',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}