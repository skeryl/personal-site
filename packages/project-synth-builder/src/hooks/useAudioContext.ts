import { useEffect, useState } from "react";

export function useAudioContext(options: AudioContextOptions = {}) {
  const [ctx, setCtx] = useState<AudioContext | undefined>();

  useEffect(() => {
    setCtx(new AudioContext(options));
    return () => {
      if (ctx) {
        ctx.close();
      }
    };
  }, []);

  return {
    current: ctx,
  };
}
