import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import {
  AudioConfig,
  Conversation,
  ConversationTranscriber,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import Link from 'next/link';
import { ChangeEvent, useEffect, useState, VFC } from 'react';

import { exportWAV } from '../../utils/exportWav';

import { Lang, pattern } from './TranslationPattern';
import { ExpandMore } from '@mui/icons-material';

type SpeechToken = { token: string; region: string };

const bufferSize = 1024;
const Language = 'ja-JP';

type Result = {
  text: string;
  translations?: {
    lang: string;
    text: string;
  }[];
};

const SpeechToTextPage: VFC = () => {
  const [speechToken, setSpeechToken] = useState<SpeechToken | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechRecognizer | TranslationRecognizer | null>(null);

  const [texts, setTexts] = useState<Result[]>([]);

  const [mode, setMode] = useState<string>('0');

  const [doRecoding, setDoRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [sampleRate, setSampleRate] = useState<number>(16000);
  const [audioData, setAudioData] = useState<Float32Array[]>([]);
  const [audioDataUrl, setAudioDataUrl] = useState<string>();

  useEffect(() => {
    axios.get<{ token: string; region: string }>('/api/get-speech-token').then((res) => {
      setSpeechToken(res.data);
    });
  }, []);

  const initializeRecoding = async () => {
    const onAudioProcess = function (e: AudioProcessingEvent) {
      const input = e.inputBuffer.getChannelData(0);
      const bufferData = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        bufferData[i] = input[i];
      }
      audioData.push(bufferData);
    };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    setSampleRate(audioContext.sampleRate);
    const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    const mediastreamsource = audioContext.createMediaStreamSource(stream);
    mediastreamsource.connect(scriptProcessor);
    scriptProcessor.onaudioprocess = onAudioProcess;
    scriptProcessor.connect(audioContext.destination);
    setAudioContext(audioContext);
  };

  const finalizeRecording = () => {
    if (audioContext) {
      audioContext?.close();
    }
    setAudioContext(undefined);
    setAudioDataUrl('');
    setAudioData([]);
  };

  useEffect(() => {
    if (mode === '0') {
      speechToText();
      return;
    }
    const translation = pattern.find((e) => e.id === mode);
    if (translation) {
      speechToTextWithTranslate(translation.from, translation.to);
    }
  }, [speechToken, mode]);

  const speechToText = () => {
    if (!speechToken) {
      return;
    }
    const speechConfig = SpeechConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
    speechConfig.speechRecognitionLanguage = Language;

    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    recognizer.recognizing = (sender, event) => {
      setTexts((prevState) => {
        const newTexts = [...prevState];
        newTexts.pop();
        return [...newTexts, { text: event.result.text }];
      });
    };
    recognizer.recognized = (sender, event) => {
      if (event.result.reason === ResultReason.RecognizedSpeech && event.result.text) {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          return [...newTexts, { text: event.result.text }, { text: '' }];
        });
      }
    };
    setRecognizer(recognizer);
  };

  const speechToTextWithTranslate = (fromLang: string, toLang: Lang[]) => {
    if (!speechToken) {
      return;
    }
    const speechConfig = SpeechTranslationConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
    speechConfig.speechRecognitionLanguage = fromLang;
    toLang.forEach((l) => speechConfig.addTargetLanguage(l.code));

    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new TranslationRecognizer(speechConfig, audioConfig);
    recognizer.recognizing = (sender, event) => {
      setTexts((prevState) => {
        const newTexts = [...prevState];
        newTexts.pop();
        return [...newTexts, { text: event.result.text }];
      });
    };
    recognizer.recognized = (sender, event) => {
      if (event.result.reason === ResultReason.TranslatedSpeech && event.result.text) {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          return [
            ...newTexts,
            {
              text: event.result.text,
              translations: toLang.map((l) => ({ lang: l.label, text: event.result.translations.get(l.code) })),
            },
            { text: '' },
          ];
        });
      }
    };
    console.log('speechToTextWithTranslate', fromLang, toLang);
    setRecognizer(recognizer);
  };
  const transcribeConversation = (audioFile: File) => {
    if (!speechToken) {
      return;
    }
    console.log('transcribeConversation start');
    const speechTranslationConfig = SpeechTranslationConfig.fromAuthorizationToken(
      speechToken.token,
      speechToken.region
    );
    const audioConfig = AudioConfig.fromWavFileInput(audioFile);
    speechTranslationConfig.setProperty('ConversationTranscriptionInRoomAndOnline', 'true');
    speechTranslationConfig.setProperty('DifferentiateGuestSpeakers', 'true');
    speechTranslationConfig.speechRecognitionLanguage = Language;

    const randomId = Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
    const conversation = Conversation.createConversationAsync(speechTranslationConfig, `roomId:${randomId}`);
    console.log('conversation created, id: ' + randomId);
    const transcriber = new ConversationTranscriber(audioConfig);

    transcriber.joinConversationAsync(conversation, () => {
      console.log('transcriber.joinConversationAsync start');
      // const user1 = Participant.From('user1@example.com', 'ja-JP', '');
      // const user2 = Participant.From('user2@example.com', 'ja-JP', '');
      // conversation.addParticipantAsync(user1);
      // conversation.addParticipantAsync(user2);
      transcriber.sessionStarted = (sender, event) => {
        console.log(`sessionStarted`);
      };
      transcriber.sessionStopped = (sender, event) => {
        console.log(`sessionStopped`);
      };
      transcriber.transcribing = (sender, event) => {
        console.log(`${event.result.speakerId}: 「${event.result.text}」`);
      };
      transcriber.transcribed = (sender, event) => {
        if (!event.result.text) {
          return;
        }
        console.log(`${event.result.speakerId}: 「${event.result.text}」`);
        setTexts((prev) => [...prev, { text: `${event.result.speakerId}: 「${event.result.text}」` }]);
      };
      transcriber.startTranscribingAsync(() => {
        console.log(`mode=${mode}: started`);
        setTexts([{ text: '' }]);
      });
    });
  };

  useEffect(() => {
    if (window) {
      window.scrollTo({ top: window.innerHeight });
    }
  }, [texts]);

  const onChangeMode = async (value: string) => {
    if (recognizer) {
      await stopFromMic();
    }
    setTexts([{ text: '' }]);
    setMode(value);
  };

  const startFromMic = async () => {
    if (recognizer) {
      recognizer.startContinuousRecognitionAsync(() => {
        console.log(`mode=${mode}: started`);
        setTexts([{ text: '' }]);
        if (doRecoding) {
          initializeRecoding();
        }
      });
    }
  };

  const stopFromMic = async () => {
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(() => {
        console.log(`mode=${mode}: stopped`);
      });
      finalizeRecording();
      if (audioData.length > 0) {
        console.log('waveFile create start');

        const audioDataBlob = exportWAV(audioData, sampleRate);
        // const file = new File([audioDataBlob], 'test.wav');
        // const data = new FormData();
        // data.append('file', file);
        // const headers = { 'content-type': 'multipart/form-data' };
        // axios.post('/api/get-8ch-audio-file', data, { headers }).then((res) => {
        //   setAudioDataUrl(res.data.url);
        // });
        setAudioDataUrl(URL.createObjectURL(audioDataBlob));
      }
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      console.log(file);
      transcribeConversation(file);
    }
  };

  const download = () => {
    if (audioDataUrl) {
      let link = document.createElement('a');
      const fileName = window.prompt('ダウンロードするファイル名を入力してください。', 'transcribe_sample');
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
          <MenuItem value={'0'}>音声文字起こしモード</MenuItem>
          {pattern.map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {e.fromLabel}から翻訳
            </MenuItem>
          ))}
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
            setTexts([{ text: '' }]);
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
          .filter((e) => e.text)
          .map((result, i) => (
            <Accordion key={i}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant={'subtitle1'}>{result.text}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack gap={2}>
                  {result.translations?.map((e) => (
                    <Stack key={e.lang} gap={0.5}>
                      <Typography variant={'subtitle2'}>{e.lang}</Typography>
                      <Typography variant={'body2'}>{e.text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
      </Box>
    </>
  );
};

export default SpeechToTextPage;
