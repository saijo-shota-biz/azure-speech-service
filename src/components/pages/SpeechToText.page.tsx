import { Box, Button, Checkbox, FormControlLabel, MenuItem, Select, Typography } from '@mui/material';
import axios from 'axios';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import Link from 'next/link';
import { useEffect, useState, VFC } from 'react';

type SpeechToken = { token: string; region: string };

const SpeechToTextPage: VFC = () => {
  const [speechToken, setSpeechToken] = useState<SpeechToken | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechRecognizer | TranslationRecognizer | null>(null);

  const [texts, setTexts] = useState<string[]>([]);

  const [mode, setMode] = useState<string>('1');

  const [doRecoding, setDoRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>();
  const [stream, setStream] = useState<MediaStream>();
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [audioDataUrl, setAudioDataUrl] = useState<string>();

  useEffect(() => {
    axios.get<{ token: string; region: string }>('/api/get-speech-token').then((res) => {
      setSpeechToken(res.data);
    });
  }, []);

  useEffect(() => {
    if (doRecoding) {
      initializeRecoding();
    } else {
      finalizeRecording();
    }
  }, [doRecoding]);

  const initializeRecoding = () => {
    const constraints = { audio: true };
    navigator.mediaDevices.getUserMedia(constraints).then(
      (stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = function (e) {
          chunks.push(e.data);
        };
        mediaRecorder.onstop = (ev) => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          setChunks([]);
          const audioURL = window.URL.createObjectURL(blob);
          setAudioDataUrl(audioURL);
        };
        setStream(stream);
        setMediaRecorder(mediaRecorder);
      },
      (err) => {
        console.log('The following error occured: ' + err);
      }
    );
  };

  const finalizeRecording = () => {
    if (stream) {
      stream.getTracks().forEach((e) => e.stop());
    }
    setMediaRecorder(null);
    setAudioDataUrl('');
    setChunks([]);
  };

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
    if (mode === '2' || mode === '3') {
      let speechLang = '';
      let targetLang = '';
      if (mode === '2') {
        speechLang = 'en-US';
        targetLang = 'ja';
      }
      if (mode === '3') {
        speechLang = 'ja-JP';
        targetLang = 'en';
      }
      const speechConfig = SpeechTranslationConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
      speechConfig.speechRecognitionLanguage = speechLang;
      speechConfig.addTargetLanguage(targetLang);

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new TranslationRecognizer(speechConfig, audioConfig);
      recognizer.recognizing = (sender, event) => {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          return [...newTexts, event.result.text];
        });
      };
      recognizer.recognized = (sender, event) => {
        console.log(event.result);
        if (event.result.reason === ResultReason.TranslatedSpeech && event.result.translations.get(targetLang)) {
          setTexts((prevState) => {
            const newTexts = [...prevState];
            newTexts.pop();
            // prettier-ignore
            const text = `${
              event.result.text
            }\n----------------------------------------------------------------------------------------\n${
              event.result.translations.get(targetLang)
            }`.replaceAll('. ', '. \n').replaceAll('。', '。\n');
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
      if (mediaRecorder) {
        mediaRecorder.start();
      }
      setTexts(['']);
    });
  };

  const stopFromMic = async () => {
    if (!recognizer) {
      return;
    }
    recognizer.stopContinuousRecognitionAsync(() => {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      console.log('recognition stop');
    });
  };

  const download = () => {
    if (audioDataUrl) {
      let link = document.createElement('a');
      const fileName = window.prompt('ダウンロードするファイル名を入力してください。', 'sample');
      link.download = `${fileName}.wav`;
      link.href = audioDataUrl;
      link.click();
      URL.revokeObjectURL(link.href);
      setAudioDataUrl('');
    }
  };

  if (!speechToken) {
    return <div>Speech Token Loading...</div>;
  }

  return (
    <>
      <Link href={'/player'}>音声ファイルを再生する</Link>
      <Box sx={{ marginTop: 3, display: 'flex', gap: 3 }}>
        <Select value={mode} onChange={(e) => onChangeMode(e.target.value)}>
          <MenuItem value={'1'}>音声文字起こしモード</MenuItem>
          <MenuItem value={'2'}>英語から日本語に翻訳モード</MenuItem>
          <MenuItem value={'3'}>日本語から英語に翻訳モード</MenuItem>
        </Select>
        <FormControlLabel
          label="録音する"
          control={<Checkbox checked={doRecoding} onChange={(event) => setDoRecording(event.target.checked)} />}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
        <Button variant={'contained'} onClick={() => startFromMic()}>
          話す
        </Button>
        <Button variant={'contained'} onClick={() => stopFromMic()}>
          止める
        </Button>
        <Button
          variant={'contained'}
          onClick={() => {
            setTexts(['']);
            finalizeRecording();
          }}
        >
          クリアする
        </Button>
        {audioDataUrl && <audio src={audioDataUrl} controls={true} />}
        {audioDataUrl && (
          <Button variant={'contained'} onClick={() => download()}>
            ダウンロード
          </Button>
        )}
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

export default SpeechToTextPage;
