import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, filename, isPreview } = req.body;

    if (!content || !filename) {
      return res.status(400).json({ error: 'Content and filename are required' });
    }

    // Ensure filename ends with .ldr
    const sanitizedFilename = filename.endsWith('.ldr') ? filename : `${filename}.ldr`;

    // Save to the output directory
    const outputDir = path.join(process.cwd(), 'website', 'output');

    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    const filePath = path.join(outputDir, sanitizedFilename);

    // Write the content to the file (overwrite if exists)
    await fs.writeFile(filePath, content, 'utf-8');

    // Log for debugging
    console.log(`[API] Saved file: ${filePath}, isPreview: ${isPreview}, size: ${content.length} bytes`);

    // Return the path relative to the public directory
    const relativePath = `/output/${sanitizedFilename}`;

    res.status(200).json({
      success: true,
      path: relativePath,
      filename: sanitizedFilename
    });
  } catch (error) {
    console.error('Error saving generated LDR file:', error);
    res.status(500).json({
      error: 'Failed to save generated model'
    });
  }
}