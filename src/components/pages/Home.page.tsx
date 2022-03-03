import { Box, Button, Typography } from '@mui/material';
import axios from 'axios';
import { AudioConfig, ResultReason, SpeechConfig, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';
import { useEffect, useState, VFC } from 'react';

type SpeechToken = { token: string; region: string };

export const HomePage: VFC = () => {
  const [speechToken, setSpeechToken] = useState<SpeechToken | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechRecognizer | null>(null);

  const [texts, setTexts] = useState<string[]>([]);

  useEffect(() => {
    axios.get<{ token: string; region: string }>('/api/get-speech-token').then((res) => {
      setSpeechToken(res.data);
    });
  }, []);

  useEffect(() => {
    if (!speechToken) {
      return;
    }

    const speechConfig = SpeechConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
    speechConfig.speechRecognitionLanguage = 'ja-JP';

    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    recognizer.recognizing = (sender, event) => {
      setTexts((prevState) => {
        const newTexts = [...prevState];
        newTexts.pop();
        return [...newTexts, event.result.text];
      });
    };
    recognizer.recognized = (sender, event) => {
      if (event.result.reason === ResultReason.RecognizedSpeech && event.result.text) {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          return [...newTexts, event.result.text, ''];
        });
      }
    };
    setRecognizer(recognizer);
  }, [speechToken]);

  const startFromMic = async () => {
    if (!recognizer) {
      return;
    }
    recognizer.startContinuousRecognitionAsync(() => {
      console.log('recognition start');
      setTexts(['']);
    });
  };

  const stopFromMic = async () => {
    if (!recognizer) {
      return;
    }
    recognizer.stopContinuousRecognitionAsync(() => {
      console.log('recognition stop');
    });
  };

  if (!speechToken) {
    return <div>Speech Token Loading...</div>;
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant={'contained'} onClick={() => startFromMic()}>
          話す
        </Button>
        <Button variant={'contained'} onClick={() => stopFromMic()}>
          止める
        </Button>
        <Button variant={'contained'} onClick={() => setTexts([])}>
          クリアする
        </Button>
      </Box>

      <Box sx={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {texts.map((text, i) => (
          <Typography key={i}>{text}</Typography>
        ))}
      </Box>
    </>
  );
};
