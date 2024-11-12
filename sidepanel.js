let searchResult = {};

// 패널이 열릴 때 저장된 데이터 불러오기
chrome.storage.local.get(null, (data) => {
    if (data) {
        searchResult = Object.fromEntries(
            Object.entries(data).filter(([key]) => key !== 'lastWord')
        );
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
        // 최신 검색 결과를 searchResult의 맨 앞에 추가
        searchResult = { [word.toLowerCase()]: searchResult[word.toLowerCase()], ...searchResult };
        chrome.storage.local.set(searchResult, () => {
            console.log("검색 결과 업데이트됨:", searchResult);
            displayDefinitions(); // 즉시 화면 갱신
        });
    });
}

// 단어 정의를 화면에 표시하는 함수
function displayDefinitions() {
    const definitionElement = document.querySelector('#definition-text');
    const previousDefinitions = Object.entries(searchResult)
        .map(([key, value]) => `
<div class="definition-container" style="margin-bottom: 10px; display: flex; flex-direction: column;" data-key="${key}">
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span class="key-text" style="font-weight: bold; margin-bottom: 2px; font-size: 16px; line-height: 27px;">
            ${key}
        </span>
        <div class="icons" style="display: flex; gap: 10px; align-items: center;">
            <span class="delete-icon" style="display: none; cursor: pointer; color: red;">❎</span>
            <span class="pin-icon" style="display: none; cursor: pointer;">✅</span>
        </div>
    </div>
    <div class="definition-content" style="display: flex; align-items: center;">
        <span style="max-width: calc(100% - 10px); overflow-wrap: break-word; font-size: 12px; color: #5a5a5a; line-height: 21px;">
            <a href="https://terms.naver.com/search.naver?query=${encodeURIComponent(key)}&searchType=&dicType=&subject=" 
               target="_blank" 
               style="color: inherit; text-decoration: none;">
                ${value}
            </a>
        </span>
    </div>
</div>

            <hr style="border: 1px solid #ccc; margin: 10px 0;">
        `)
        .join('');

    definitionElement.innerHTML = previousDefinitions || '검색된 결과가 없습니다.';

    // 이후 마우스 이벤트 처리 (변경없음)
    document.querySelectorAll('.definition-container').forEach(container => {
        const keyText = container.querySelector('.key-text');
        const deleteIcon = container.querySelector('.delete-icon');
        const pinIcon = container.querySelector('.pin-icon');

        // 단어와 정의를 포함하는 container에 반짝임 효과 적용
        container.addEventListener('mouseenter', () => {
            container.classList.add('blink-effect'); // 전체 container에 반짝임 효과 적용
            deleteIcon.style.display = 'inline-block'; // x 아이콘을 보이게
            pinIcon.style.display = 'inline-block'; // 핀 아이콘을 보이게
        });

        // 마우스가 벗어났을 때 반짝임 효과 제거
        container.addEventListener('mouseleave', () => {
            container.classList.remove('blink-effect'); // 전체 container에서 반짝임 효과 제거
            deleteIcon.style.display = 'none'; // x 아이콘 숨기기
            pinIcon.style.display = 'none'; // 핀 아이콘 숨기기
        });

        // 클릭 이벤트 핸들러 추가
        container.addEventListener('click', () => {
            if (deleteIcon.style.display === 'none') {
                deleteIcon.style.display = 'inline-block'; // x 아이콘을 보이게
                pinIcon.style.display = 'inline-block'; // 핀 아이콘을 보이게
            } else {
                deleteIcon.style.display = 'none'; // x 아이콘 숨기기
                pinIcon.style.display = 'none'; // 핀 아이콘 숨기기
            }
        });

        // x 아이콘 클릭 시 해당 단어 삭제
        deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // x 아이콘을 클릭할 때 정의의 클릭 이벤트가 발생하지 않도록 막기
            const key = keyText.innerText; // 단어 키값 가져오기
            delete searchResult[key.toLowerCase()]; // 검색 결과에서 단어 삭제
            chrome.storage.local.remove(key.toLowerCase(), () => {
                console.log("로컬 스토리지에서 삭제된 항목:", key);
                displayDefinitions(); // 화면 갱신
            });
        });

        // 핀 아이콘 클릭 시 핀 상태 변경 및 단어 색상 변경
        pinIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // 핀 아이콘 클릭 시 정의의 클릭 이벤트가 발생하지 않도록 막기
            pinIcon.style.color = pinIcon.style.color === 'red' ? '' : 'red'; // 핀을 고정시키거나 해제
            
            if (pinIcon.style.color === 'red') {
                keyText.style.color = '#008689'; // 핀을 고정하면 키 텍스트 색상 초록색으로 변경
                deleteIcon.style.display = 'none'; // 핀 고정 시 x 아이콘 숨기기
            } else {
                keyText.style.color = ''; // 핀 해제하면 색상 원래대로 복구
                deleteIcon.style.display = 'inline-block'; // 핀 해제 시 x 아이콘 표시
            }
            console.log(`${keyText.innerText} 핀 상태: ${pinIcon.style.color === 'red' ? '고정됨' : '해제됨'}`);
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
