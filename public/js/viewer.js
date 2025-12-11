(async () => {
  const params = new URLSearchParams(window.location.search);
  const group = params.get("group");
  const episodeId = params.get("episode");

  if (!group || !episodeId) {
    alert("URL が不正です");
    return;
  }

  // =========================
  // groups.json 取得
  // =========================
  const groupsRes = await fetch(`/api/groups`);
  const groups = await groupsRes.json();
  const g = groups[group];
  if (!g) {
    alert("グループが存在しません");
    return;
  }

  const episode = g.episodes[episodeId];
  if (!episode) {
    alert("話が存在しません");
    return;
  }

  const orientation = g.orientation;       // 「縦漫画 / 横漫画 / 小説」
  const pages = episode.pages || [];       // 画像配列
  let index = 0;                            // 現在ページ

  // =========================
  // DOM 取得
  // =========================
  const imgSingle = document.getElementById("single"); // 1ページ表示用
  const spread = document.getElementById("spread");    // 見開き用
  const prevBtn = document.getElementById("navPrev");
  const nextBtn = document.getElementById("navNext");

    if (orientation === "縦漫画") {
    document.body.classList.add("vertical");
    }

  // =========================
  // ページ表示関数
  // =========================
  function showPage() {
    if (orientation === "縦漫画") {
      // ---- 1ページずつ ----
      spread.style.display = "none";
      imgSingle.style.display = "block";
      imgSingle.src = pages[index] || "";
    }

    else if (orientation === "横漫画") {
      // ---- 見開き ----
      imgSingle.style.display = "none";
      spread.style.display = "flex";

      const left = pages[index] || "";
      const right = pages[index + 1] || "";

      spread.innerHTML = `
        <img src="${left}">
        <img src="${right}">
      `;
    }

    else {
      // ---- 小説など：1ページ ----
      spread.style.display = "none";
      imgSingle.style.display = "block";
      imgSingle.src = pages[index] || "";
    }
  }

  function updateCounter() {
  const total = pages.length || 0;
  const el = document.getElementById('pageCounter');
  if (!el) return;

  if (orientation === "横漫画") {
    // 横は見開き → 表示は "L:R/TOTAL" 例: 1:2/10
    const left = index + 1;
    const right = Math.min(index + 2, total);
    el.textContent = `${left}:${right}/${total}`;
  } else {
    // 縦・小説は 1ページずつ → "現在/総数"
    const cur = Math.min(index + 1, Math.max(total, 0));
    el.textContent = `${cur}/${total}`;
  }
}

function showPage() {
  if (!pages || pages.length === 0) {
    imgSingle.style.display = "none";
    spread.style.display = "none";
    updateCounter();
    return;
  }

  if (orientation === "縦漫画") {
    spread.style.display = "none";
    imgSingle.style.display = "block";
    imgSingle.src = pages[index] || "";
  }
  else if (orientation === "横漫画") {
    imgSingle.style.display = "none";
    spread.style.display = "flex";

    const leftPage = pages[index] || "";
    const rightPage = pages[index + 1] || "";

    spread.innerHTML = `
      <img src="${leftPage}" alt="">
      <img src="${rightPage}" alt="">
    `;
  }
  else { // 小説等の扱い（本文や画像の扱いに合わせて）
    imgSingle.style.display = "block";
    spread.style.display = "none";
    imgSingle.src = pages[index] || "";
  }

  // ページ表示を更新する（必須）
  updateCounter();
}

  // =========================
  // 次へ
  // =========================
  nextBtn.addEventListener("click", () => {
    if (orientation === "横漫画") {
      if (index + 2 < pages.length) index += 2;
    } else {
      if (index + 1 < pages.length) index++;
    }
    showPage();
  });

  // =========================
  // 前へ
  // =========================
  prevBtn.addEventListener("click", () => {
    if (orientation === "横漫画") {
      if (index - 2 >= 0) index -= 2;
    } else {
      if (index - 1 >= 0) index--;
    }
    showPage();
  });

document.addEventListener("touchend", () => {
  isSwiping = false;
});

// ▼ キーボード操作
window.addEventListener("keydown", (e) => {
  if (orientation === "横漫画") {
    if (e.key === "ArrowLeft") {
      // 次へ
      if (index + 2 < pages.length) {
        index += 2;
        showPage();
      }
    }
    if (e.key === "ArrowRight") {
      // 前へ
      if (index - 2 >= 0) {
        index -= 2;
        showPage();
      }
    }
  } else {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      // 次へ
      if (index + 1 < pages.length) {
        index++;
        showPage();
      }
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      // 前へ
      if (index - 1 >= 0) {
        index--;
        showPage();
      }
    }
  }
});

  // 初期表示
  showPage();
  updateCounter();
})();

/* ===============================
   話選択ボタン → リスト表示
   =============================== */

const episodeBtn = document.getElementById("episodeSelectBtn");
const episodeList = document.getElementById("episodeList");

episodeBtn.addEventListener("click", () => {
  // 表示 / 非表示を切り替え
  if (episodeList.style.display === "block") {
    episodeList.style.display = "none";
  } else {
    episodeList.style.display = "block";
  }
});

// 話一覧を取得して描画する関数
async function loadEpisodeList() {
  const params = new URLSearchParams(window.location.search);
  const group = params.get("group");
  const currentEpisode = params.get("episode");

  // 全グループ情報取得
  const groupsRes = await fetch(`/api/groups`);
  const groups = await groupsRes.json();
  const g = groups[group];
  if (!g) return;

  const entries = Object.values(g.episodes);

  // HTML生成
  episodeList.innerHTML = entries
    .map(ep => {
      const active = ep.id == currentEpisode ? "active-episode" : "";
      return `
        <div class="episode-item ${active}" data-id="${ep.id}">
          第${ep.id}話：${ep.title}
        </div>
      `;
    })
    .join("");

  // クリックで話へ移動
  document.querySelectorAll(".episode-item").forEach(item => {
    item.addEventListener("click", () => {
      const id = item.dataset.id;
      window.location.href = `viewer.html?group=${encodeURIComponent(group)}&episode=${id}`;
    });
  });
}

// 初期化
loadEpisodeList();

document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});
