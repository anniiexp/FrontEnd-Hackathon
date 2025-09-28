import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const outputDir = path.join(process.cwd(), 'public', 'output');
      const allFiles: any[] = [];

      // Read files from public/output directory
      if (fs.existsSync(outputDir)) {
        const modelFiles = fs.readdirSync(outputDir);
        const ldrFiles = modelFiles.filter(file =>
          file.endsWith('.ldr') || file.endsWith('.mpd') || file.endsWith('.dat')
        );

        ldrFiles.forEach(file => {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          allFiles.push({
            name: file,
            path: `/output/${file}`,
            size: stats.size,
            modified: stats.mtime
          });
        });
      }

      res.status(200).json({ files: allFiles });
    } catch (error) {
      console.error('Error reading LDR files:', error);
      res.status(500).json({ error: 'Failed to read LDR files' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}