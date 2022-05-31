export type Lang = { label: string; code: string };

const toLang: Lang[] = [
  { label: '日本語', code: 'ja' },
  { label: '英語', code: 'en' },
  { label: 'ポルトガル語 (ブラジル)', code: 'pt' },
  { label: 'スペイン語', code: 'es' },
  { label: 'ヒンディー語', code: 'hi' },
  { label: '中国語 (繁体字)', code: 'zh-Hant' },
  { label: '中国語 (標準、簡体字)', code: 'zh-Hans' },
  { label: 'ドイツ語', code: 'de' },
  { label: 'フランス語', code: 'fr' },
];

export const pattern: { id: string; fromLabel: string; from: string; to: Lang[] }[] = [
  { id: '1', fromLabel: '日本語', from: 'ja-JP', to: toLang.filter((e) => e.code !== 'ja') },
  { id: '2', fromLabel: '英語', from: 'en-US', to: toLang.filter((e) => e.code !== 'en') },
  { id: '3', fromLabel: 'ポルトガル語(ブラジル)', from: 'pt-BR', to: toLang.filter((e) => e.code !== 'pt') },
  { id: '4', fromLabel: 'スペイン語', from: 'es-ES', to: toLang.filter((e) => e.code !== 'es') },
  { id: '5', fromLabel: 'ヒンディー語', from: 'hi-IN', to: toLang.filter((e) => e.code !== 'hi') },
  { id: '6', fromLabel: '中国語 (繁体字)', from: 'zh-HK', to: toLang.filter((e) => e.code !== 'zh-Hant') },
  { id: '7', fromLabel: '中国語 (標準、簡体字)', from: 'zh-CN', to: toLang.filter((e) => e.code !== 'zh-Hans') },
  { id: '8', fromLabel: 'ドイツ語', from: 'de-DE', to: toLang.filter((e) => e.code !== 'de') },
  { id: '9', fromLabel: 'フランス語', from: 'fr-FR', to: toLang.filter((e) => e.code !== 'fr') },
];
