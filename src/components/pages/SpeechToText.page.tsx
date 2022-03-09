import { Box, Button, Checkbox, FormControlLabel, MenuItem, Select, Typography } from '@mui/material';
import axios from 'axios';
import {
  AudioConfig,
  Conversation,
  ConversationTranscriber,
  Participant,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import Link from 'next/link';
import { ChangeEvent, useEffect, useState, VFC } from 'react';

import { exportWAV } from '../../utils/exportWav';

type SpeechToken = { token: string; region: string };

const bufferSize = 1024;

const SpeechToTextPage: VFC = () => {
  const [speechToken, setSpeechToken] = useState<SpeechToken | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechRecognizer | TranslationRecognizer | null>(null);

  const [texts, setTexts] = useState<string[]>([]);

  const [mode, setMode] = useState<string>('1');

  const [doRecoding, setDoRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [sampleRate, setSampleRate] = useState<number>(16000);
  const [audioData, setAudioData] = useState<any[]>([]);
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
    audioContext?.close();
    setAudioDataUrl('');
    setAudioData([]);
  };

  useEffect(() => {
    if (mode === '1') {
      speechToText();
      return;
    }
    if (mode === '2' || mode === '3') {
      if (mode === '2') {
        speechToTextWithTranslate('en-US', 'ja');
        return;
      }
      if (mode === '3') {
        speechToTextWithTranslate('ja-JP', 'en');
        return;
      }
    }
  }, [speechToken, mode]);

  const speechToText = () => {
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
  };
  const speechToTextWithTranslate = (fromLang: string, toLang: string) => {
    if (!speechToken) {
      return;
    }
    const speechConfig = SpeechTranslationConfig.fromAuthorizationToken(speechToken.token, speechToken.region);
    speechConfig.speechRecognitionLanguage = fromLang;
    speechConfig.addTargetLanguage(toLang);

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
      if (event.result.reason === ResultReason.TranslatedSpeech && event.result.translations.get(toLang)) {
        setTexts((prevState) => {
          const newTexts = [...prevState];
          newTexts.pop();
          // prettier-ignore
          const text = `${
            event.result.text
          }\n----------------------------------------------------------------------------------------\n${
            event.result.translations.get(toLang)
          }`.replaceAll('. ', '. \n').replaceAll('。', '。\n');
          return [...newTexts, text, ''];
        });
      }
    };
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
    speechTranslationConfig.speechRecognitionLanguage = 'ja-JP';

    const randomId = Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
    const conversation = Conversation.createConversationAsync(speechTranslationConfig, `roomId:${randomId}`);
    console.log('conversation created, id: ' + randomId);
    const transcriber = new ConversationTranscriber(audioConfig);

    transcriber.joinConversationAsync(conversation, () => {
      console.log('transcriber.joinConversationAsync start');
      const user1 = Participant.From('user1@example.com', 'ja-JP', '');
      const user2 = Participant.From('user2@example.com', 'ja-JP', '');
      conversation.addParticipantAsync(user1);
      conversation.addParticipantAsync(user2);
      transcriber.sessionStarted = (sender, event) => {
        console.log(`sessionStarted`);
        console.log({ sender, event });
      };
      transcriber.sessionStopped = (sender, event) => {
        console.log(`sessionStopped`);
        console.log({ sender, event });
      };
      transcriber.canceled = (sender, event) => {
        console.log(`canceled`);
        console.log({ sender, event });
      };
      transcriber.conversationStarted = (sender, event) => {
        console.log(`conversationStarted`);
        console.log({ sender, event });
      };
      transcriber.conversationStopped = (sender, event) => {
        console.log(`conversationStopped`);
        console.log({ sender, event });
      };
      transcriber.transcribing = (sender, event) => {
        console.log(`transcribing`);
        console.log({ sender, event });
      };
      transcriber.transcribed = (sender, event) => {
        console.log(`transcribed`);
        console.log({ sender, event });
      };
      transcriber.startTranscribingAsync(() => {
        console.log(`mode=${mode}: started`);
        setTexts(['']);
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
    setTexts(['']);
    setMode(value);
  };

  const startFromMic = async () => {
    if (['1', '2', '3'].includes(mode) && recognizer) {
      recognizer.startContinuousRecognitionAsync(() => {
        console.log(`mode=${mode}: started`);
        setTexts(['']);
      });
    }
  };

  const stopFromMic = async () => {
    if (['1', '2', '3'].includes(mode) && recognizer) {
      recognizer.stopContinuousRecognitionAsync(() => {
        if (audioData.length > 0) {
          setAudioDataUrl(exportWAV(audioData, sampleRate));
        }
        console.log(`mode=${mode}: stopped`);
      });
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
          <MenuItem value={'4'}>会話文字起こしモード</MenuItem>
        </Select>
        <FormControlLabel
          label="録音する"
          control={<Checkbox checked={doRecoding} onChange={(event) => setDoRecording(event.target.checked)} />}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
        {mode === '4' ? (
          <input type={'file'} onChange={onChange} />
        ) : (
          <>
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
          </>
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
