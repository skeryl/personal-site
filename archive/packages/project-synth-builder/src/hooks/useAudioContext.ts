import { useEffect, useState } from "react";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

/*
 * Chrome doesn't allow an AudioContext to be created unless the user first gestures or does something on the page.
 *
 * This is a work-around to that annoying fact.
 * */
async function getAudioContext(
  options: AudioContextOptions = {},
  retryInMs: number = 50,
): Promise<AudioContext> {
  let ctx: AudioContext | undefined;
  while (!ctx) {
    try {
      ctx = new AudioContext(options);
    } catch (e) {
      console.warn(
        `Failed to create AudioContext, trying again in ${retryInMs}milliseconds.`,
      );
    }
    if (!ctx) {
      await wait(retryInMs);
    }
  }
  return ctx;
}

export function useAudioContext(options: AudioContextOptions = {}) {
  const [ctx, setCtx] = useState<AudioContext | undefined>();

  useEffect(() => {
    getAudioContext(options).then((ctx) => {
      setCtx(ctx);
    });
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
