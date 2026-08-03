import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { mountCoffeeButton } from './coffee-button.js';

createRuntime({ config: DEFAULT_SETTINGS }).start();
mountCoffeeButton();
