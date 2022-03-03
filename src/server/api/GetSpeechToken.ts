import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

type ResponseData =
  | {
      token: string;
      region: string;
    }
  | {
      message: string;
    };

export const getSpeechToken = async (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
  res.setHeader('Content-Type', 'application/json');
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  console.log({ speechKey, speechRegion });

  if (!speechKey || !speechRegion) {
    res.status(500).json({ message: 'environment variables not found SPEECH_KEY or SPEECH_REGION' });
    return;
  }

  const headers = {
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const tokenResponse = await axios.post(
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      null,
      headers
    );
    res.send({ token: tokenResponse.data, region: speechRegion });
  } catch (err) {
    res.status(401).json({ message: 'There was an error authorizing your speech key.' });
  }
};
