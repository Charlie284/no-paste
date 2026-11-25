const DATABASE_NAME = "no-paste-settings";
const DATABASE_VERSION = 1;
const STORE_NAME = "settings";
const BLOCK_IMAGES_KEY = "blockImages";

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("The settings database request failed."));
});

const openSettingsDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("The settings database could not be opened."));
});

export const readBlockImages = async (): Promise<boolean> => {
  const database = await openSettingsDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const value = await requestResult(transaction.objectStore(STORE_NAME).get(BLOCK_IMAGES_KEY));
    return value === true;
  } finally {
    database.close();
  }
};

export const writeBlockImages = async (blockImages: boolean): Promise<void> => {
  const database = await openSettingsDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestResult(transaction.objectStore(STORE_NAME).put(blockImages, BLOCK_IMAGES_KEY));
  } finally {
    database.close();
  }
};
