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
  // 선택된 텍스트 가져오기
  const selectedText = data.selectionText.trim(); // 양쪽 공백 제거

  // 6글자 이상인 단어는 검색하지 않음
  if (selectedText.length > 6) {
    // 6글자 이상인 경우 에러 메시지 표시
    alert('6글자 이하의 단어만 검색할 수 있습니다.');

    // 선택된 텍스트 취소 (드래그된 텍스트가 선택되지 않도록)
    chrome.tabs.executeScript(tab.id, {
      code: 'window.getSelection().removeAllRanges();' // 선택된 텍스트 취소
    });

    return; // 이후 코드 실행을 중단하여 SET 작업 및 사이드 패널 열기를 하지 않음
  }

  // 기호가 포함된 텍스트는 검색하지 않음 (공백과 마침표는 제외)
  if (/[^a-zA-Z0-9\s\.가-힣]/.test(selectedText)) {
    // 기호가 포함된 경우 에러 메시지 표시
    alert('기호가 포함된 단어는 검색할 수 없습니다.');
    return; // 이후 코드 실행을 중단하여 SET 작업 및 사이드 패널 열기를 하지 않음
  }

  // 기호가 포함되지 않고 6글자 이하인 경우에만 검색을 진행
  chrome.storage.local.set({ lastWord: selectedText }, () => {
    // 사이드 패널 열기
    chrome.sidePanel.open({ tabId: tab.id });
  });
});



