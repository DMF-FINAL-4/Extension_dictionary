chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});


function setupContextMenu() {
  chrome.contextMenus.create({
    id: 'define-word',
    title: '단어 검색',
    contexts: ['selection']
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});

chrome.contextMenus.onClicked.addListener((data, tab) => {
  // Store the last word in chrome.storage.session.
  chrome.storage.local.set({ lastWord: data.selectionText });

  // Make sure the side panel is open.
  chrome.sidePanel.open({ tabId: tab.id });
});