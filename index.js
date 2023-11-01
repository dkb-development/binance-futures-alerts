import { fetchTelegramBot } from './configs/TelegramBotConfig.js';
import { startPatternCheck } from './services/PatternCheckService1.js';
import { handleInputMessage } from './services/TelegramMessageService1.js';

// Create the telegram bot
var bot = fetchTelegramBot(handleInputMessage);

// Modifying the console.log to print the data & time
const originalConsoleLog = console.log;

console.log = function () {
  const timestamp = new Date();
  const args = Array.from(arguments).map(arg => {
    return typeof arg === 'object' ? arg : arg;
  });
  originalConsoleLog(`[${timestamp}]`, ...args);
};
// Modifying the console.log to print the data & time

// Start the pattern check DB service
await startPatternCheck();

console.log("Hello World");