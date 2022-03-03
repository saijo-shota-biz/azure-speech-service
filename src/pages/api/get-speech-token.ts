// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import { getSpeechToken } from '../../server/api/GetSpeechToken';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await getSpeechToken(req, res);
  }
};
