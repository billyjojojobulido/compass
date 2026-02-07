import { CompassHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    compass: CompassHandler;
  }
}

export {};
