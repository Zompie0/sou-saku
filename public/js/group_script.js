
// -------- 共通 --------
function qs(k) { return new URLSearchParams(location.search).get(k); }
const groupName = qs('name');
document.getElementById('title').textContent = groupName;

async function fetchGroups() {
  return (await fetch('/api/groups')).json();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
}

// -------- 表紙読み込み --------
async function loadCover() {
  const groups = await fetchGroups();
  const g = groups[groupName];
  if (!g) return;

  const coverImg = document.getElementById("coverImg");
  if (g.cover) coverImg.src = g.cover;
  else coverImg.src = "";

  const groupOri = g.orientation;
  const Episode = encodeURIComponent(g.name);
  document.getElementById('type').textContent = groupOri;

  document.getElementById("viewerBtn").addEventListener("click", () => {
  window.location.href = `viewer.html?group=${Episode}&episode=1`;
});

}

// -------- 表紙アップロード --------
document.getElementById("uploadCover").onclick = async () => {
  const file = document.getElementById("coverFile").files[0];
  if (!file) return alert("画像を選択してください");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`/api/groups/${encodeURIComponent(groupName)}/cover`, {
    method: "POST",
    body: fd
  });

  const j = await res.json();
  if (j.ok) {
    alert("表紙を更新しました");
    loadCover();
  } else {
    alert("失敗: " + j.error);
  }
};

// -------- 話一覧 --------
async function renderEpisodes() {
  const groups = await fetchGroups();
  const g = groups[groupName];
  if (!g) return alert("グループがありません");

  const container = document.getElementById('episodeList');
  container.innerHTML = "";

  const eps = g.episodes || {};
  for (const id in eps) {
    const ep = eps[id];
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${escapeHtml(ep.title)}</strong> (id:${id})
      <a href="episode.html?group=${encodeURIComponent(groupName)}&episode=${id}">編集/アップロード</a>
      <button data-id="${id}" class="del">削除</button>
    `;
    container.appendChild(div);
  }

  document.querySelectorAll('.del').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("削除しますか？")) return;
      const id = btn.dataset.id;

      const res = await fetch(`/api/groups/${encodeURIComponent(groupName)}/episodes/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) renderEpisodes();
      else alert("削除失敗");
    };
  });
}

// -------- 話追加 --------
document.getElementById('addEpisode').onclick = async () => {
  const title = document.getElementById('episodeTitle').value.trim();

  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupName)}/episodes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    }
  );

  const json = await res.json().catch(() => ({}));

  if (json.ok) {
    document.getElementById('episodeTitle').value = '';
    renderEpisodes();
  } else {
    alert('追加失敗: ' + (json.error || 'unknown'));
  }
};

document.getElementById("deleteGroupBtn").onclick = async () => {
  const params = new URLSearchParams(location.search);
  const group = params.get("name");

  if (!confirm(`${group} を削除しますか？\n（話・画像を含む全データが削除されます）》`)) return;

  const res = await fetch(`/api/groups/${encodeURIComponent(group)}`, {
    method: "DELETE"
  });

  if (res.ok) {
    alert("削除しました");
    location.href = "index.html";
  } else {
    alert("削除に失敗しました");
  }
};



// 初期読み込み
loadCover();
renderEpisodes();

