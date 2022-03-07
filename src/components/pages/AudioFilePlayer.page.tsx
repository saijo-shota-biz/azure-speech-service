import { Stack } from '@mui/material';
import Link from 'next/link';
import { ChangeEvent, useState, VFC } from 'react';

export const AudioFilePlayerPage: VFC = () => {
  const [audioFileUrl, setAudioFileUrl] = useState<string>();

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setAudioFileUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Stack direction={'column'} spacing={3}>
        <Link href={'/'}>音声文字起こしページに戻る</Link>
        <input type={'file'} accept={'wav'} onChange={onChange} />
        {audioFileUrl && <audio src={audioFileUrl} controls={true} />}
      </Stack>
    </>
  );
};
