import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS } from './settings.js';

createRuntime({ config: DEFAULT_SETTINGS }).start();
