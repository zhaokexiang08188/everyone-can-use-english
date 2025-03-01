import settings from "electron-settings";
import { LIBRARY_PATH_SUFFIX, DATABASE_NAME } from "@/constants";
import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs-extra";
import os from "os";
import commandExists from "command-exists";
import log from "electron-log";
import * as i18n from "i18next";

const logger = log.scope("settings");

const language = () => {
  const _language = settings.getSync("language");

  if (!_language || typeof _language !== "string") {
    settings.setSync("language", "en");
  }

  return settings.getSync("language") as string;
};

const switchLanguage = (language: string) => {
  settings.setSync("language", language);
  i18n.changeLanguage(language);
};

const libraryPath = () => {
  const _library = settings.getSync("library");

  if (!_library || typeof _library !== "string") {
    settings.setSync(
      "library",
      path.join(app.getPath("documents"), LIBRARY_PATH_SUFFIX)
    );
  } else if (path.parse(_library).base !== LIBRARY_PATH_SUFFIX) {
    settings.setSync("library", path.join(_library, LIBRARY_PATH_SUFFIX));
  }

  const library = settings.getSync("library") as string;
  fs.ensureDirSync(library);

  return library;
};

const cachePath = () => {
  const tmpDir = path.join(libraryPath(), "cache");
  fs.ensureDirSync(tmpDir);

  return tmpDir;
};

const dbPath = () => {
  const dbName = app.isPackaged
    ? `${DATABASE_NAME}.sqlite`
    : `${DATABASE_NAME}_dev.sqlite`;
  return path.join(userDataPath(), dbName);
};

const whisperModelsPath = () => {
  const dir = path.join(libraryPath(), "whisper", "models");
  fs.ensureDirSync(dir);

  return dir;
};

const whisperModelPath = () => {
  return path.join(
    whisperModelsPath(),
    settings.getSync("whisper.model") as string
  );
};

const llamaModelsPath = () => {
  const dir = path.join(libraryPath(), "llama", "models");
  fs.ensureDirSync(dir);

  return dir;
};

const llamaModelPath = () => {
  return path.join(
    llamaModelsPath(),
    settings.getSync("llama.model") as string
  );
};

const userDataPath = () => {
  const userData = path.join(
    libraryPath(),
    settings.getSync("user.id").toString()
  );
  fs.ensureDirSync(userData);

  return userData;
};

const ffmpegConfig = () => {
  const _ffmpegPath = path.join(
    libraryPath(),
    "ffmpeg",
    os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );
  const _ffprobePath = path.join(
    libraryPath(),
    "ffmpeg",
    os.platform() === "win32" ? "ffprobe.exe" : "ffprobe"
  );

  const ffmpegPath = fs.existsSync(_ffmpegPath) ? _ffmpegPath : "";
  const ffprobePath = fs.existsSync(_ffprobePath) ? _ffprobePath : "";

  const _commandExists =
    commandExists.sync("ffmpeg") && commandExists.sync("ffprobe");

  const ready = Boolean(_commandExists || (ffmpegPath && ffprobePath));

  const config = {
    os: os.platform(),
    arch: os.arch(),
    commandExists: _commandExists,
    ffmpegPath,
    ffprobePath,
    ready,
  };

  logger.info("ffmpeg config", config);

  return config;
};

export default {
  registerIpcHandlers: () => {
    ipcMain.handle("settings-get-library", (_event) => {
      libraryPath();
      return settings.getSync("library");
    });

    ipcMain.handle("settings-set-library", (_event, library) => {
      if (path.parse(library).base === LIBRARY_PATH_SUFFIX) {
        settings.setSync("library", library);
      } else {
        const dir = path.join(library, LIBRARY_PATH_SUFFIX);
        fs.ensureDirSync(dir);
        settings.setSync("library", dir);
      }
    });

    ipcMain.handle("settings-get-user", (_event) => {
      return settings.getSync("user");
    });

    ipcMain.handle("settings-set-user", (_event, user) => {
      settings.setSync("user", user);
    });

    ipcMain.handle("settings-get-whisper-model", (_event) => {
      return settings.getSync("whisper.model");
    });

    ipcMain.handle("settings-set-whisper-model", (_event, model) => {
      settings.setSync("whisper.model", model);
    });

    ipcMain.handle("settings-get-whisper-models-path", (_event) => {
      return whisperModelsPath();
    });

    ipcMain.handle("settings-set-llama-model", (_event, model) => {
      settings.setSync("whisper.model", model);
    });

    ipcMain.handle("settings-get-llama-models-path", (_event) => {
      return llamaModelsPath();
    });

    ipcMain.handle("settings-get-user-data-path", (_event) => {
      return userDataPath();
    });

    ipcMain.handle("settings-get-llm", (_event, provider) => {
      return settings.getSync(provider);
    });

    ipcMain.handle("settings-set-llm", (_event, provider, config) => {
      return settings.setSync(provider, config);
    });

    ipcMain.handle("settings-get-ffmpeg-config", (_event) => {
      return ffmpegConfig();
    });

    ipcMain.handle("settings-set-ffmpeg-config", (_event, config) => {
      settings.setSync("ffmpeg.ffmpegPath", config.ffmpegPath);
      settings.setSync("ffmpeg.ffprobePath", config.ffrobePath);
    });

    ipcMain.handle("settings-get-language", (_event) => {
      return language();
    });

    ipcMain.handle("settings-switch-language", (_event, language) => {
      switchLanguage(language);
    });
  },
  cachePath,
  libraryPath,
  whisperModelsPath,
  whisperModelPath,
  llamaModelsPath,
  llamaModelPath,
  userDataPath,
  dbPath,
  ffmpegConfig,
  language,
  switchLanguage,
  ...settings,
};
