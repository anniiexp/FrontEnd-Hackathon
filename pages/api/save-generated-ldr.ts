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

    // In production (Vercel), we can't write to filesystem
    // Instead, we'll just return the content as a data URL for download
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      // Create a base64 data URL for the LDR content
      const base64Content = Buffer.from(content).toString('base64');
      const dataUrl = `data:application/octet-stream;base64,${base64Content}`;

      console.log(`[API] Generated data URL for: ${sanitizedFilename}, size: ${content.length} bytes`);

      return res.status(200).json({
        success: true,
        dataUrl: dataUrl,
        filename: sanitizedFilename,
        content: content // Send content back for client-side handling
      });
    }

    // Local development: save to file system
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