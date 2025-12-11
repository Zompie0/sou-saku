const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");

// 選択された File オブジェクト
let selectedFiles = [];

/*-------------------------------
  基本のイベント
-------------------------------*/

// クリックでファイル選択
dropZone.addEventListener("click", () => fileInput.click());

// input選択
fileInput.addEventListener("change", () => handleFiles(fileInput.files));

// drag over
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

// drag leave
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover")
);

// drop
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

/*-------------------------------
  複数ファイル処理
-------------------------------*/
function handleFiles(files) {
  [...files].forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    selectedFiles.push(file);

    const reader = new FileReader();
    reader.onload = (e) => addPreview(e.target.result);
    reader.readAsDataURL(file);
  });
}

/*-------------------------------
  プレビュー追加
-------------------------------*/
function addPreview(src) {
  const div = document.createElement("div");
  div.className = "preview-item";
  div.innerHTML = `<img src="${src}" class="preview-img">`;

  previewArea.prepend(div);
}

/*-------------------------------
  アップロード
-------------------------------*/
uploadBtn.addEventListener("click", uploadAll);

async function uploadAll() {
  if (selectedFiles.length === 0) {
    alert("画像が選択されていません");
    return;
  }

  const params = new URLSearchParams(location.search);
  const group = params.get("group");
  const episodeId = params.get("episode");

  if (!group || !episodeId) {
    alert("URL に group と episode がありません");
    return;
  }

  const fd = new FormData();
  selectedFiles.forEach((f) => fd.append("files", f));

  let json;
  try {
    const res = await fetch(
      `/api/upload?group=${encodeURIComponent(group)}&episodeId=${encodeURIComponent(episodeId)}`,
      { method: "POST", body: fd }
    );

    json = await res.json();
  } catch (e) {
    alert("通信エラーが発生しました");
    return;
  }

  if (json.ok) {
    alert("アップロード完了！");
    selectedFiles = [];
    previewArea.innerHTML = "";
    loadUploadedImages(group, episodeId);
  } else {
    alert("アップロード失敗: " + json.error);
  }
}

/*-------------------------------
  アップロード済み画像の読み込み
-------------------------------*/
async function loadUploadedImages(group, episodeId) {
  const container = document.getElementById("pages");
  container.innerHTML = "";

  let data;
  try {
    const res = await fetch(
      `/api/groups/${encodeURIComponent(group)}/episodes/${encodeURIComponent(episodeId)}/pages`
    );
    if (!res.ok) return;

    data = await res.json();
  } catch (e) {
    console.error(e);
    return;
  }

  const pages = data.pages || [];

  pages.forEach((path) => {
    if (!path) return;

    const div = document.createElement("div");
    div.className = "preview-item";
    div.style.position = "relative";

    // 削除ボタン
    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    Object.assign(delBtn.style, {
      position: "absolute",
      top: "2px",
      left: "2px",
      padding: "2px 5px",
      fontSize: "12px",
      cursor: "pointer",
      background: "rgba(255,255,255,0.8)",
      border: "1px solid #888",
      borderRadius: "3px"
    });

    delBtn.addEventListener("click", async () => {
      if (!confirm("この画像を削除しますか？")) return;

      const res = await fetch(
        `/api/groups/${encodeURIComponent(group)}/episodes/${encodeURIComponent(episodeId)}/pages`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path })
        }
      );

      if (res.ok) {
        loadUploadedImages(group, episodeId);
      } else {
        alert("削除に失敗しました");
      }
    });

    const img = document.createElement("img");
    img.src = path;
    img.className = "preview-img";

    div.appendChild(delBtn);
    div.appendChild(img);
    container.appendChild(div);
  });
}

/*-------------------------------
  初回ロード
-------------------------------*/
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const group = params.get("group");
  const episodeId = params.get("episode");

  if (group && episodeId) {
    loadUploadedImages(group, episodeId);
  }
});

document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});
