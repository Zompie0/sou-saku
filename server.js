const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const groupsJSON = "./groups.json";
const UPLOADS_ROOT = path.join(__dirname, "uploads");

function safeName(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_");
}

// JSON 読み書き
async function loadGroups() {
  if (!fs.existsSync(groupsJSON)) return {};
  return JSON.parse(await fsp.readFile(groupsJSON, "utf8"));
}
async function saveGroups(obj) {
  await fsp.writeFile(groupsJSON, JSON.stringify(obj, null, 2));
}

// ------------------------------
// グループ一覧
// ------------------------------
app.get("/api/groups", async (req, res) => {
  res.json(await loadGroups());
});

// ------------------------------
// グループ作成
// ------------------------------
app.post("/api/groups", async (req, res) => {
  const { name, orientation } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const groups = await loadGroups();
  if (groups[name]) return res.status(400).json({ error: "exists" });

  groups[name] = {
    name,
    orientation: orientation || "横漫画",
    episodes: {},
    nextEpisodeId: 1,
    cover: null
  };
  await saveGroups(groups);

  await fsp.mkdir(`uploads/${safeName(name)}`, { recursive: true });

  res.json({ ok: true });
});

// ------------------------------
// 話追加
// ------------------------------
app.post("/api/groups/:name/episodes", async (req, res) => {
  const group = req.params.name;
  const { title } = req.body;

  const groups = await loadGroups();
  if (!groups[group]) return res.status(404).json({ error: "group not found" });

  const g = groups[group];

  const ids = Object.keys(g.episodes).map(Number);
  const newId = ids.length === 0 ? 1 : Math.max(...ids) + 1;

  g.episodes[newId] = {
    id: newId,
    title: title || `第${newId}話`,
    pages: []
  };

  await fsp.mkdir(`${UPLOADS_ROOT}/${safeName(group)}/${newId}`, { recursive: true });

  await saveGroups(groups);

  res.json({ ok: true, id: newId });
});

// ------------------------------
// 話削除
// ------------------------------
app.delete("/api/groups/:name/episodes/:id", async (req, res) => {
  const { name, id } = req.params;

  const groups = await loadGroups();
  if (!groups[name]) return res.status(404).json({ error: "not found" });

  delete groups[name].episodes[id];
  await saveGroups(groups);

  await fsp.rm(`${UPLOADS_ROOT}/${safeName(name)}/${id}`, { recursive: true, force: true });

  res.json({ ok: true });
});

// ------------------------------
// ★ 表紙アップロード
// ------------------------------
const coverUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = `${UPLOADS_ROOT}/${safeName(req.params.name)}/cover`;
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      cb(null, "cover" + path.extname(file.originalname));
    }
  })
}).single("file");

app.post("/api/groups/:name/cover", (req, res) => {
  coverUpload(req, res, async err => {
    if (err) return res.status(500).json({ error: err.message });

    const name = req.params.name;
    const groups = await loadGroups();

    const url = `/uploads/${safeName(name)}/cover/${req.file.filename}`;
    groups[name].cover = url;
    await saveGroups(groups);

    res.json({ ok: true, cover: url });
  });
});

// ------------------------------
// ★ Episode 画像アップロード
// ------------------------------
const uploadPages = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const { group, episodeId } = req.query;
      const dir = `${UPLOADS_ROOT}/${safeName(group)}/${episodeId}`;
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  })
}).array("files");

app.post("/api/upload", (req, res) => {
  uploadPages(req, res, async err => {
    if (err) return res.json({ ok: false, error: err.message });

    const { group, episodeId } = req.query;

    const groups = await loadGroups();
    const g = groups[group];

    const added = req.files.map(f => `/uploads/${safeName(group)}/${episodeId}/${f.filename}`);
    g.episodes[episodeId].pages.push(...added);

    await saveGroups(groups);

    res.json({ ok: true, files: added });
  });
});

// ------------------------------
// ★ Episode 画像一覧
// ------------------------------
app.get("/api/groups/:group/episodes/:episode/pages", async (req, res) => {
  const { group, episode } = req.params;

  const groups = await loadGroups();
  if (!groups[group]) return res.json({ pages: [] });

  res.json({ pages: groups[group].episodes[episode]?.pages || [] });
});

// ------------------------------
// ★ Episode 画像削除
// ------------------------------
app.delete("/api/groups/:group/episodes/:episode/pages", async (req, res) => {
  const { group, episode } = req.params;
  const { path: img } = req.body;

  const groups = await loadGroups();
  const g = groups[group];
  if (!g) return res.json({ error: "not found" });

  g.episodes[episode].pages = g.episodes[episode].pages.filter(p => p !== img);
  await saveGroups(groups);

  const local = img.replace("/uploads/", `${UPLOADS_ROOT}/`);
  await fsp.rm(local, { force: true });

  res.json({ ok: true });
});

// ------------------------------
// ★ グループ削除
// ------------------------------
app.delete("/api/groups/:name", async (req, res) => {
  const name = req.params.name;
  const groups = await loadGroups();

  // 既に存在しない場合
  if (!groups[name]) {
    return res.status(404).json({ error: "group not found" });
  }

  // JSONから削除
  delete groups[name];
  await saveGroups(groups);

  // uploads フォルダ内のグループディレクトリも削除
  const dir = `${UPLOADS_ROOT}/${safeName(name)}`;
  await fsp.rm(dir, { recursive: true, force: true });

  res.json({ ok: true });
});


// ==============================
// 小説 保存
// ==============================
app.post("/api/novel", async (req, res) => {
  const { group, episodeId, text } = req.body;

  if (!group || !episodeId) {
    return res.status(400).json({ error: "group or episodeId missing" });
  }

  const dir = path.join(
    UPLOADS_ROOT,
    safeName(group),
    String(episodeId)
  );

  await fsp.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, "novel.txt");
  await fsp.writeFile(filePath, text ?? "", "utf8");

  res.json({ ok: true });
});

// ==============================
// 小説 読み込み
// ==============================
app.get("/api/novel", async (req, res) => {
  const { group, episodeId } = req.query;

  if (!group || !episodeId) {
    return res.status(400).json({ error: "missing params" });
  }

  const filePath = path.join(
    UPLOADS_ROOT,
    safeName(group),
    String(episodeId),
    "novel.txt"
  );

  if (!fs.existsSync(filePath)) {
    return res.json({ text: "" });
  }

  const text = await fsp.readFile(filePath, "utf8");
  res.json({ text });
});


// ------------------------------
app.listen(3000, () => console.log("Server running → http://localhost:3000"));
