import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

const SpeechToTextPage = dynamic(() => import('../components/pages/SpeechToText.page'), { ssr: false });

const Home: NextPage = () => {
  return (
    <>
      <SpeechToTextPage />
    </>
  );
};

export default Home;
