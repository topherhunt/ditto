/** Safari on an iPhone, iPod or iPad (iPadOS reports itself as a Mac with a touch screen); other iOS browsers have a different menu. */
export const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
};

/** Running from the home screen icon rather than in a browser tab. */
export const isStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
