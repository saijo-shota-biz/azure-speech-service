import { Box, Button, MenuItem, Select, Typography } from '@mui/material';
import axios from 'axios';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { useEffect, useRef, useState, VFC } from 'react';

type SpeechToken = { token: string; region: string };

export const SpeechToTextPage: VFC = () => {
  const [speechToken, setSpeechToken] = useState<SpeechToken | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechRecognizer | TranslationRecognizer | null>(null);

  const [texts, setTexts] = useState<string[]>([]);

  const [mode, setMode] = useState<string>('1');

  useEffect(() => {
    axios.get<{ token: string; region: string }>('/api/get-speech-token').then((res) => {
      setSpeechToken(res.data);
    });
  }, []);

  useEffect(() => {
    if (!speechToken) {
      return;
    }

    if (mode === '1') {
      const speechConfig = SpeechConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
      speechConfig.speechRecognitionLanguage = 'ja-JP';

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
      recognizer.recognizing = (sender, event) => {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          return [...newTexts, event.result.text.replaceAll('。', '。\n')];
        });
      };
      recognizer.recognized = (sender, event) => {
        if (event.result.reason === ResultReason.RecognizedSpeech && event.result.text) {
          setTexts((prevState) => {
            const newTexts = [...prevState];
            newTexts.pop();
            return [...newTexts, event.result.text.replaceAll('。', '。\n'), ''];
          });
        }
      };
      setRecognizer(recognizer);
      return;
    }
    if (mode === '2') {
      const speechConfig = SpeechTranslationConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
      speechConfig.speechRecognitionLanguage = 'en-US';
      speechConfig.addTargetLanguage('ja');

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new TranslationRecognizer(speechConfig, audioConfig);
      recognizer.recognizing = (sender, event) => {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          return [...newTexts, event.result.text.replaceAll('. ', '. \n')];
        });
      };
      recognizer.recognized = (sender, event) => {
        console.log(event.result);
        if (event.result.reason === ResultReason.TranslatedSpeech && event.result.translations.get('ja')) {
          setTexts((prevState) => {
            const newTexts = [...prevState];
            newTexts.pop();
            // prettier-ignore
            const text = `${
              event.result.text
            }\n----------------------------------------------------------------------------------------\n${
              event.result.translations.get('ja')
            }`.replaceAll('s', '');
            return [...newTexts, text, ''];
          });
        }
      };
      setRecognizer(recognizer);
      return;
    }
  }, [speechToken, mode]);

  useEffect(() => {
    if (window) {
      window.scrollTo({ top: window.innerHeight });
    }
  }, [texts]);

  const onChangeMode = async (value: string) => {
    if (recognizer) {
      await stopFromMic();
    }
    setTexts(['']);
    setMode(value);
  };

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
      <Box sx={{ marginTop: 3 }}>
        <Select value={mode} onChange={(e) => onChangeMode(e.target.value)}>
          <MenuItem value={'1'}>音声文字起こしモード</MenuItem>
          <MenuItem value={'2'}>英語から日本語に翻訳モード</MenuItem>
        </Select>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
        <Button variant={'contained'} onClick={() => startFromMic()}>
          話す
        </Button>
        <Button variant={'contained'} onClick={() => stopFromMic()}>
          止める
        </Button>
        <Button variant={'contained'} onClick={() => setTexts([''])}>
          クリアする
        </Button>
      </Box>

      <Box sx={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {texts
          .filter((e) => e)
          .map((text, i) => (
            <Box key={i} sx={{ padding: 2, border: 'solid 1px', borderColor: 'grey.300', whiteSpace: 'pre-wrap' }}>
              <Typography>{text}</Typography>
            </Box>
          ))}
      </Box>
    </>
  );
};
