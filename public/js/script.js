// 1. サーバーからグループ一覧を取得
async function fetchGroups() {
  // /api/groups に GET リクエスト
  const r = await fetch('/api/groups');
  return await r.json(); // JSONを返す
}

// 2. HTMLエスケープ関数（インジェクション対策）
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
}

// 3. グループ一覧を描画
async function renderGroups() {
  const groups = await fetchGroups();  // サーバーから取得
  const container = document.getElementById('display');
  container.innerHTML = '';             // 一旦クリア

  // groups は名前をキーとしたオブジェクト
  for (const name in groups) {
    const g = groups[name];

    // グループカードを作成
    const div = document.createElement('div');
    div.innerHTML = `
    <button onclick="location.href='viewer.html?group=${encodeURIComponent(g.name)}&episode=1'" class="main">
        <div class="line">
          <div>${g.orientation}</div>
          <a href="group.html?name=${encodeURIComponent(g.name)}" class="option">・・・</a>
        </div>

      <div class="title">
        <img src="${g.cover ? g.cover : './img/no_cover.png'}"><br>
          <strong>${escapeHtml(g.name)}</strong>
          <a>作者</a>
      </div>
    </button>
`;
    container.appendChild(div);
  }

  // ---  最後に「追加用オブジェクト」を 1 個だけ挿入 ---
  const add = document.createElement('div');
  add.innerHTML = `
    <button id="create" class="main_create openPopupBtn">
        <div class="line_create">
          <div></div>
        </div>

      <div class="title_create">
        <img src=""><br>
          <strong>追加する</strong>
      </div>
    </button>
  `;
  container.appendChild(add);

  // ---  追加カードクリックでポップアップを開く ---
  document.querySelector('.openPopupBtn').addEventListener('click', () => {
    popupBg.style.display = 'flex';

    // 安全のためチェック付き
    const popupInput = document.getElementById("groupName");
    if (popupInput) popupInput.focus();
  });
}

      const popupBg = document.getElementById("popupBg");
      const closePopup = document.getElementById("closePopup");
      const popupInput = document.getElementById("groupName"); 

      closePopup.addEventListener("click", () => {
        popupBg.style.display = "none";
      });

      popupBg.addEventListener("click", (e) => {
        if (e.target === popupBg) {
          popupBg.style.display = "none";
        }
      });

// 4. 新規グループ作成イベント
document.getElementById('createGroup').onclick = async () => {
  const name = document.getElementById('groupName').value.trim();
  const orientation = document.getElementById('orientation').value;
  if (!name) { alert('タイトルを入力してください'); return; }

  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, orientation })
  });

  if (res.ok) {
    document.getElementById('groupName').value = ''; // 入力欄クリア
    renderGroups();                                  // グループ一覧更新
    popupBg.style.display = "none";
  } else {
    const j = await res.json().catch(() => ({}));
    alert('エラー: ' + (j.error || res.statusText));
  }
};

// ページ読み込み時にグループを描画
renderGroups();

