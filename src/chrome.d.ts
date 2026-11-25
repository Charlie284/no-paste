interface ChromeMessageSender {
  id?: string;
}

interface ChromeRuntimeMessageEvent {
  addListener(
    callback: (
      message: unknown,
      sender: ChromeMessageSender,
      sendResponse: (response?: unknown) => void,
    ) => boolean | void,
  ): void;
}

interface ChromeRuntime {
  onMessage: ChromeRuntimeMessageEvent;
  sendMessage(message: unknown): Promise<unknown>;
}

interface ChromeTab {
  id?: number;
}

interface ChromeTabs {
  query(queryInfo: object): Promise<ChromeTab[]>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
}

interface Chrome {
  runtime: ChromeRuntime;
  tabs: ChromeTabs;
}

declare const chrome: Chrome;
