import React, { useCallback } from 'react';
import { Howl } from 'howler';

const sounds = {
  click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'] }),
  deal: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'] }),
  place: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'] }),
  take: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'] }),
  reveal: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'] }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3'] }),
  score: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2022/2022-preview.mp3'] }),
};

export const useSound = () => {
  const [muted, setMuted] = React.useState(false);

  const play = useCallback((name: keyof typeof sounds) => {
    if (!muted) sounds[name].play();
  }, [muted]);

  return { play, muted, setMuted };
};

export const soundManager = {
  play: (name: keyof typeof sounds) => {
    sounds[name].play();
  }
};
