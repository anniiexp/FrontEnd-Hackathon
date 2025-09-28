import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return the client key from environment variable
  const clientKey = process.env.CLIENT_KEY;

  if (!clientKey) {
    return res.status(500).json({ error: 'LCLIENT_KEY not configured' });
  }

  res.status(200).json({ CLIENT_KEY: clientKey });
}