export const SETTINGS_REQUEST_TYPE = "no-paste:get-settings";
export const SETTINGS_WRITTEN_TYPE = "no-paste:settings-written";
export const SETTINGS_RESPONSE_TYPE = "no-paste:settings-response";
export const SETTINGS_SNAPSHOT_TYPE = "no-paste:settings";
export const IMAGE_SETTING_EVENT = "no-paste:image-setting";

export interface PasteSettings {
  blockImages: boolean;
}

export interface SettingsSnapshot extends PasteSettings {
  type: typeof SETTINGS_SNAPSHOT_TYPE;
}

export interface SettingsResponse extends PasteSettings {
  type: typeof SETTINGS_RESPONSE_TYPE;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
);

export const settingsSnapshot = (blockImages: boolean): SettingsSnapshot => ({
  type: SETTINGS_SNAPSHOT_TYPE,
  blockImages,
});

export const settingsResponse = (blockImages: boolean): SettingsResponse => ({
  type: SETTINGS_RESPONSE_TYPE,
  blockImages,
});

export const isSettingsRequest = (value: unknown): boolean => (
  isRecord(value) && value.type === SETTINGS_REQUEST_TYPE
);

export const isSettingsResponse = (
  value: unknown,
): value is SettingsResponse => (
  isRecord(value)
  && value.type === SETTINGS_RESPONSE_TYPE
  && typeof value.blockImages === "boolean"
);

export const isSettingsWritten = (
  value: unknown,
): value is { type: typeof SETTINGS_WRITTEN_TYPE; blockImages: boolean } => (
  isRecord(value)
  && value.type === SETTINGS_WRITTEN_TYPE
  && typeof value.blockImages === "boolean"
);

export const isSettingsSnapshot = (value: unknown): value is SettingsSnapshot => (
  isRecord(value)
  && value.type === SETTINGS_SNAPSHOT_TYPE
  && typeof value.blockImages === "boolean"
);
