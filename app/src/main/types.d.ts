declare module 'discord-rpc' {
  interface ClientOptions {
    transport: 'ipc' | 'websocket';
  }

  interface ActivityOptions {
    details?: string;
    state?: string;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    instance?: boolean;
    party?: {
      id?: string;
      size?: [number, number];
    };
    secrets?: {
      join?: string;
      spectate?: string;
      match?: string;
    };
  }

  interface LoginOptions {
    clientId: string;
    clientSecret?: string;
    scopes?: string[];
    redirectUri?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expireTimeout?: number;
    rpcToken?: string;
  }

  class Client {
    constructor(options: ClientOptions);
    login(options: LoginOptions): Promise<void>;
    destroy(): Promise<void>;
    clearActivity(): Promise<void>;
    setActivity(activity: ActivityOptions): Promise<void>;
    subscribe(event: string, args?: Record<string, unknown>): Promise<void>;
    unsubscribe(event: string, args?: Record<string, unknown>): Promise<void>;
    
    on(event: 'ready', listener: () => void): this;
    on(event: 'disconnected', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
