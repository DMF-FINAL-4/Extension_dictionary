let searchResult = {};
let searchOrder = [];

// 패널이 열릴 때 저장된 데이터 불러오기
chrome.storage.local.get(['searchResult', 'searchOrder'], (data) => {
    if (data) {
        searchResult = data.searchResult || {};
        searchOrder = data.searchOrder || [];
        console.log('검색 결과 복원:', searchResult);
        displayDefinitions(); // 페이지 로드 시 모든 이전 정의 표시
    }
});

// lastWord가 변경될 때 정의 업데이트
chrome.storage.local.onChanged.addListener((changes) => {
    const lastWordChange = changes['lastWord'];
    if (lastWordChange) {
        updateDefinitionWithFetch(lastWordChange.newValue);
    }
});

// 단어의 정의를 업데이트하는 함수
function updateDefinitionWithFetch(word) {
    fetchEncyclopedia(word).then(() => {
        const lowerWord = word.toLowerCase();

        // 새로운 단어는 맨 앞에 추가
        if (!searchOrder.includes(lowerWord)) {
            searchOrder.unshift(lowerWord); // 최신 단어를 맨 앞에 추가
        } else {
            // 이미 있던 단어라면 순서 변경
            searchOrder = [lowerWord, ...searchOrder.filter(w => w !== lowerWord)];
        }

        // 검색 결과 저장 (단어와 정의)
        searchResult[lowerWord] = searchResult[lowerWord] || `No definition found for ${lowerWord}`;

        // 최신순으로 저장
        chrome.storage.local.set({ searchResult, searchOrder }, () => {
            console.log("검색 결과 및 순서 저장됨:", searchResult, searchOrder);
            displayDefinitions(); // 즉시 화면 갱신
        });
    });
}

// 단어 정의를 화면에 표시하는 함수
function displayDefinitions() {
    const definitionElement = document.querySelector('#definition-text');
    
    // searchOrder 배열을 사용해 최신순으로 정렬
    const previousDefinitions = searchOrder
        .map(key => `
            <div class="definition-container" style="margin-bottom: 10px; display: flex; flex-direction: column;" data-key="${key}">
                <span style="font-weight: bold; margin-bottom: 2px;">${key}</span>
                <div class="definition-content" style="display: flex; align-items: center;">
                    <span style="max-width: calc(100% - 10px); overflow-wrap: break-word;">${searchResult[key]}</span>
                    <input type="checkbox" id="${key}" name="definitions" value="${key}" style="margin-left: 10px;">
                </div>
            </div>
            <hr style="border: 1px solid #ccc; margin: 10px 0;">
        `)
        .join('');

    definitionElement.innerHTML = previousDefinitions || '검색된 결과가 없습니다.';
}

// 나머지 함수 (선택 및 삭제 기능)는 기존 코드 그대로 유지

document.getElementById('select-all').onclick = selectAllCheckboxes;
document.getElementById('delete-selected').onclick = deleteSelectedDefinitions;

// 전체 체크 상태를 추적하는 변수
let isAllChecked = false;
// 모든 체크박스를 선택 또는 해제하는 함수
function selectAllCheckboxes() {
    const checkboxes = document.querySelectorAll('input[name="definitions"]');
    isAllChecked = !isAllChecked;
    checkboxes.forEach(checkbox => {
        checkbox.checked = isAllChecked;
    });
    console.log(isAllChecked ? '모든 체크박스가 선택되었습니다.' : '모든 체크박스가 해제되었습니다.');
}

// 선택된 정의를 삭제하는 함수
function deleteSelectedDefinitions() {
    const checkedKeys = Array.from(document.querySelectorAll('input[name="definitions"]:checked'))
        .map(checkbox => checkbox.value);
    checkedKeys.forEach(key => {
        delete searchResult[key.toLowerCase()];
        const index = searchOrder.indexOf(key.toLowerCase());
        if (index !== -1) searchOrder.splice(index, 1); // 순서에서도 삭제
    });
    chrome.storage.local.remove(checkedKeys, () => {
        console.log("로컬 스토리지에서 삭제된 항목:", checkedKeys);
        chrome.storage.local.set({ searchResult, searchOrder }, () => {
            displayDefinitions(); // 즉시 화면 갱신
        });
    });
}

// 네이버 API 설정
const clientId = "Hvu5PztEEpxKUf_ECdW1";
const clientSecret = "jLdMYU6we5";
// 단어의 정의를 가져오는 함수
async function fetchEncyclopedia(lastWord) {
    const query = encodeURIComponent(lastWord);
    const url = `https://openapi.naver.com/v1/search/encyc.json?query=${query}&display=1`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret
            }
        });
        if (response.ok) {
            const jsonData = await response.json();
            const items = jsonData.items || [];
            items.forEach(item => {
                const description = item.description.replace(/<b>/g, '').replace(/<\/b>/g, '');
                searchResult[lastWord.toLowerCase()] = description;
            });
            await chrome.storage.local.set(searchResult);
            console.log("검색 결과 저장됨:", searchResult);
        } else {
            console.error("Error Code:", response.status);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}
