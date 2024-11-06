let searchResult = {};

// 패널이 열릴 때 저장된 데이터 불러오기
chrome.storage.local.get(null, (data) => {
    if (data) {
        // lastWord가 아닌 데이터만 searchResult에 복원
        searchResult = Object.fromEntries(
            Object.entries(data).filter(([key]) => key !== 'lastWord')
        );
        console.log('검색 결과 복원:', searchResult);

        // 페이지 로드 시 모든 이전 정의 표시
        displayDefinitions();
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
        updateDefinition(word);
    });
}

// 정의 업데이트 함수
function updateDefinition(word) {
    if (!word) return;

    const currentDefinition = searchResult[word.toLowerCase()] || '';
    const definitionElement = document.querySelector('#definition-text');
    const displayedDefinition = definitionElement.innerText.trim();

    // 중복된 정의가 이미 표시되어 있으면 업데이트하지 않음
    if (displayedDefinition === currentDefinition) {
        console.log('동일한 정의가 이미 표시되어 있습니다.');
        return;
    }

    displayDefinitions();
}

function displayDefinitions() {
    const definitionElement = document.querySelector('#definition-text');
    const previousDefinitions = Object.entries(searchResult)
        .map(([key, value]) => `
            <div class="definition-container" style="margin-bottom: 10px;" data-key="${key}" data-value="${value}">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: bold; margin-bottom: 2px;">${key}</span>
                    <div style="display: flex; align-items: center;">
                        <span style="max-width: calc(100% - 10px); overflow-wrap: break-word;">${value}</span>
                    </div>
                </div>
            </div>
            <hr style="border: 1px solid #ccc; margin: 10px 0;">
        `)
        .reverse()
        .join('');

    definitionElement.innerHTML = previousDefinitions || '검색된 결과가 없습니다.';

    // 각 정의 div 클릭 이벤트 추가
    document.querySelectorAll('.definition-container').forEach(div => {
        div.addEventListener('click', function() {
            const key = div.getAttribute('data-key');
            const value = div.getAttribute('data-value');
            handleClickOnDefinition(key, value);

            // 클릭 시 div에 스타일 추가/제거
            div.classList.toggle('selected');  // 'selected' 클래스 토글
        });
    });
}

// 클릭된 정의에 대해 처리할 함수
function handleClickOnDefinition(key, value) {
    console.log(`클릭된 정의 - 키: ${key}, 값: ${value}`);
    // 여기에 클릭된 정의에 대한 추가 작업을 추가할 수 있습니다
}

// 이벤트 핸들러 설정
document.getElementById('select-all').onclick = selectAllDefinitions;
document.getElementById('delete-selected').onclick = deleteSelectedDefinitions;

let isAllSelected = false; // 전체 선택 상태를 추적하는 변수

// 모든 정의를 선택 또는 해제하는 함수
function selectAllDefinitions() {
    const definitionContainers = document.querySelectorAll('.definition-container');

    // 전체 클릭 상태 토글
    isAllSelected = !isAllSelected;

    definitionContainers.forEach(div => {
        if (isAllSelected) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
    });

    console.log(isAllSelected ? '모든 정의가 선택되었습니다.' : '모든 정의가 해제되었습니다.');
}

// 선택된 정의를 삭제하는 함수
function deleteSelectedDefinitions() {
    const selectedKeys = Array.from(document.querySelectorAll('.definition-container.selected'))
        .map(div => div.getAttribute('data-key'));

    selectedKeys.forEach(key => {
        delete searchResult[key.toLowerCase()];
    });

    chrome.storage.local.remove(selectedKeys, () => {
        console.log("로컬 스토리지에서 삭제된 항목:", selectedKeys);
        displayDefinitions();
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
