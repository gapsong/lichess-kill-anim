import { handleExternalMessage } from './background-message.js';

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  const response = handleExternalMessage(msg, {
    getVersion: () => chrome.runtime.getManifest().version,
    setPack: (packId) => chrome.storage.sync.set({ packId })
  });
  if (response) {
    sendResponse(response);
    return true; // keep the message channel open for the async storage write
  }
});
