export const CAMERA_FPS_STORAGE_KEY = "metal_inspect_camera_fps";

export const DEFAULT_CAMERA_FPS = 15;

export const normalizeCameraFps = (value) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return DEFAULT_CAMERA_FPS;
  }

  if (numberValue < 1) {
    return 1;
  }

  if (numberValue > 60) {
    return 60;
  }

  return numberValue;
};

export const getSavedCameraFps = () => {
  const savedValue = localStorage.getItem(CAMERA_FPS_STORAGE_KEY);
  return normalizeCameraFps(savedValue || DEFAULT_CAMERA_FPS);
};

export const saveCameraFps = (fps) => {
  const normalizedFps = normalizeCameraFps(fps);
  localStorage.setItem(CAMERA_FPS_STORAGE_KEY, String(normalizedFps));
  return normalizedFps;
};

export const fpsToDelaySec = (fps) => {
  const normalizedFps = normalizeCameraFps(fps);
  return 1 / normalizedFps;
};