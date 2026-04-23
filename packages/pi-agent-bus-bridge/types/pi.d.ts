declare global {
  const pi: {
    tools: Record<string, any>;
    link: {
      list: () => Promise<string[]>;
      send: (to: string, message: string, triggerTurn?: boolean) => Promise<void>;
      prompt: (to: string, prompt: string) => Promise<string>;
    };
    context: {
      tag: (name: string, target?: string) => void;
      log: (limit?: number, verbose?: boolean) => string;
      checkout: (target: string, message: string, backupTag?: string) => void;
    };
    log: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
    };
    onSlashCommand: (command: string, handler: (...args: any[]) => any, description?: string) => void;
    terminal: {
      id?: string;
      write: (message: string) => void;
      clear: () => void;
    };
    addModel: () => void;
  };
}

export {};
