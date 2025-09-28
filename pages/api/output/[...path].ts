import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: filePath } = req.query;

  if (!filePath || !Array.isArray(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const fileName = filePath.join('/');
  const fullPath = path.join(process.cwd(), 'output', fileName);

  // Security check: ensure the path doesn't escape the output directory
  const normalizedPath = path.normalize(fullPath);
  const outputDir = path.join(process.cwd(), 'output');

  if (!normalizedPath.startsWith(outputDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Read and send the file
  try {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(fileContent);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
}