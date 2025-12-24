/* ===============================
   共通DOM
=============================== */
const homeBtn = document.getElementById("homeBtn");

homeBtn.addEventListener("click", () => {
  location.href = "index.html";
});

/* ===============================
   URLパラメータ
=============================== */
const params = new URLSearchParams(location.search);
const group = params.get("group");
const episodeId = params.get("episode");

/* ===============================
   グループ情報取得 & 判別
=============================== */
async function isNovelGroup(group) {
  const groups = await fetch("/api/groups").then(r => r.json());
  return groups[group]?.orientation === "小説";
}

/* ===============================
   初期処理
=============================== */
window.addEventListener("DOMContentLoaded", async () => {
  if (!group || !episodeId) return;

  const isNovel = await isNovelGroup(group);

  if (isNovel) {
    initNovelEditor(group, episodeId);
  } else {
    initImageUpload(group, episodeId);
  }
});


function initNovelEditor(group, episodeId) {
  // UI 切り替え
  document.getElementById("mangaUI").style.display = "none";
  document.getElementById("novelUI").style.display = "block";

  const textarea = document.getElementById("novelText");
  const saveBtn = document.getElementById("saveNovel");

  /* ---------- 読み込み ---------- */
  loadNovel();

  async function loadNovel() {
    const res = await fetch(
      `/api/novel?group=${encodeURIComponent(group)}&episodeId=${encodeURIComponent(episodeId)}`
    );

    if (!res.ok) return;

    const json = await res.json();
    textarea.value = json.text || "";
  }

  /* ---------- 保存 ---------- */
  saveBtn.addEventListener("click", async () => {
    const text = textarea.value;

    const res = await fetch("/api/novel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group,
        episodeId,
        text
      })
    });

    if (res.ok) {
      alert("保存しました");
    } else {
      alert("保存失敗");
    }
  });
}


function initImageUpload(group, episodeId) {

  /* -----------------------------
     DOM
  ----------------------------- */
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const previewArea = document.getElementById("previewArea");
  const uploadBtn = document.getElementById("uploadBtn");
  const pages = document.getElementById("pages");

  let selectedFiles = [];

  /* -----------------------------
     ファイル選択
  ----------------------------- */
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => handleFiles(e.target.files));

  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () =>
    dropZone.classList.remove("dragover")
  );

  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  /* -----------------------------
     ファイル処理
  ----------------------------- */
  function handleFiles(files) {
    [...files].forEach(file => {
      if (!file.type.startsWith("image/")) return;

      selectedFiles.push(file);

      const reader = new FileReader();
      reader.onload = e => addPreview(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  function addPreview(src) {
    const div = document.createElement("div");
    div.className = "preview-item";
    div.innerHTML = `<img src="${src}" class="preview-img">`;
    previewArea.prepend(div);
  }

  /* -----------------------------
     アップロード
  ----------------------------- */
  uploadBtn.addEventListener("click", async () => {
    if (selectedFiles.length === 0) {
      alert("画像が選択されていません");
      return;
    }

    const fd = new FormData();
    selectedFiles.forEach(f => fd.append("files", f));

    const res = await fetch(
      `/api/upload?group=${encodeURIComponent(group)}&episodeId=${encodeURIComponent(episodeId)}`,
      { method: "POST", body: fd }
    );

    const json = await res.json();

    if (json.ok) {
      selectedFiles = [];
      previewArea.innerHTML = "";
      loadImages();
    } else {
      alert("アップロード失敗");
    }
  });

  /* -----------------------------
     画像一覧
  ----------------------------- */
  async function loadImages() {
    pages.innerHTML = "";

    const res = await fetch(
      `/api/groups/${encodeURIComponent(group)}/episodes/${encodeURIComponent(episodeId)}/pages`
    );

    const { pages: list = [] } = await res.json();

    list.forEach(path => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.style.position = "relative";

      const img = document.createElement("img");
      img.src = path;
      img.className = "preview-img";

      const del = document.createElement("button");
      del.textContent = "✕";
      del.className = "del-btn";

      del.onclick = async () => {
        if (!confirm("削除しますか？")) return;

        await fetch(
          `/api/groups/${encodeURIComponent(group)}/episodes/${encodeURIComponent(episodeId)}/pages`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path })
          }
        );

        loadImages();
      };

      div.append(del, img);
      pages.appendChild(div);
    });
  }

  loadImages();
}
