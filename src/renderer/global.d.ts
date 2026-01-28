export {};

declare global {
  interface Window {
    compass: {
      invoke: (channel: string, payload?: unknown) => Promise<any>;
    };
  }
}
