const fs = require('fs');

const WaveFile = require('wavefile').WaveFile;

const buff = fs.readFileSync(`src/convert-8ch-wav/audio/${process.argv[2]}.wav`);
const wav1 = new WaveFile(buff);
const wav2 = new WaveFile();
const wav3 = new WaveFile();
const wav4 = new WaveFile();
const wav5 = new WaveFile();
const wav6 = new WaveFile();
const wav7 = new WaveFile();
const wav8 = new WaveFile();
const multiChannelWav = new WaveFile();
multiChannelWav.fromScratch(8, 16000, '16', [
  wav1.getSamples(),
  wav2.getSamples(),
  wav3.getSamples(),
  wav4.getSamples(),
  wav5.getSamples(),
  wav6.getSamples(),
  wav7.getSamples(),
  wav8.getSamples(),
]);

try {
  fs.writeFileSync(`src/convert-8ch-wav/audio/${process.argv[2]}_8ch.wav`, multiChannelWav.toBuffer());
  console.log('write end');
} catch (e) {
  console.log(e);
}
