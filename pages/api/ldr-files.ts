import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const allFiles: any[] = [];

      // Look in website/output directory
      const outputDir = path.join(process.cwd(), 'website', 'output');

      if (fs.existsSync(outputDir)) {
        const modelFiles = fs.readdirSync(outputDir);
        const ldrFiles = modelFiles.filter(file =>
          (file.endsWith('.ldr') || file.endsWith('.mpd') || file.endsWith('.dat')) &&
          !file.startsWith('preview_temp') // Exclude preview temp files
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

      // Sort by modified date, newest first
      allFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

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