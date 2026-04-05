const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.openai.com/v1/chat/completions",
  apiToken: "",
  model: "gpt-4.1-mini",
  temperature: 0.2,
  maxBookmarks: 800,
  rootFolderName: "AI Organized",
  customInstructions:
    [
      "请根据书签标题、URL、域名和现有路径做中文整理。",
      "相同主域名尽量放在同一个文件夹。",
      "目录层级尽量控制在 2 到 3 层。",
      "优先产出可长期维护的分类，不要按临时任务零碎分组。",
      "不要创建太多只包含 1 条书签的小文件夹，除非非常必要。"
    ].join("\n")
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case "getSettings":
      return getSettings();
    case "saveSettings":
      return saveSettings(message.payload || {});
    case "scanBookmarks":
      return scanBookmarks();
    case "generatePlan":
      return generatePlan();
    case "applyPlan":
      return applyPlan(message.payload?.plan);
    default:
      throw new Error("Unknown message type.");
  }
}

async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function saveSettings(payload) {
  const next = {
    ...DEFAULT_SETTINGS,
    ...payload
  };
  await chrome.storage.local.set(next);
  return next;
}

async function scanBookmarks() {
  const [tree] = await chrome.bookmarks.getTree();
  const items = flattenBookmarks(tree);
  const folderCounts = countBy(items, (item) => item.folderPath || "未分类");
  const domainCounts = countBy(items, (item) => item.registrableDomain || item.host || "unknown");

  return {
    total: items.length,
    folders: folderCounts.slice(0, 40),
    domains: domainCounts.slice(0, 40),
    sample: items.slice(0, 20)
  };
}

async function generatePlan() {
  const settings = await getSettings();
  if (!settings.apiToken.trim()) {
    throw new Error("请先在设置页填入 API Token。");
  }

  const [tree] = await chrome.bookmarks.getTree();
  const items = flattenBookmarks(tree);
  const limitedItems = items.slice(0, Number(settings.maxBookmarks) || items.length);
  const payload = buildChatPayload(limitedItems, settings);
  const response = await fetch(settings.apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI 请求失败 (${response.status}): ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const content = extractAssistantText(data);
  const plan = parseJsonFromText(content);
  validatePlan(plan, limitedItems);

  return {
    scanned: items.length,
    submitted: limitedItems.length,
    plan,
    summary: summarizePlan(plan)
  };
}

async function applyPlan(plan) {
  if (!plan || !Array.isArray(plan.folders)) {
    throw new Error("整理计划格式不正确。");
  }

  const settings = await getSettings();
  const [tree] = await chrome.bookmarks.getTree();
  const bookmarkMap = new Map(flattenBookmarks(tree).map((item) => [item.id, item]));
  const rootId = await ensureRootFolder(tree, settings.rootFolderName);
  const folderCache = new Map();
  let moved = 0;

  for (const folder of plan.folders) {
    if (!folder.path || !Array.isArray(folder.bookmark_ids)) {
      continue;
    }
    const parentId = await ensureFolderPath(rootId, folder.path, folderCache);
    for (const bookmarkId of folder.bookmark_ids) {
      const node = bookmarkMap.get(String(bookmarkId));
      if (!node) {
        continue;
      }
      await chrome.bookmarks.move(String(bookmarkId), { parentId });
      moved += 1;
    }
  }

  return { moved, targetRootFolder: settings.rootFolderName };
}

function buildChatPayload(items, settings) {
  const systemPrompt = [
    "You are an expert Chrome bookmark organizer.",
    "Return JSON only.",
    "Output schema:",
    '{"folders":[{"path":"一级/二级/三级","bookmark_ids":["1","2"],"reason":"简短原因"}],"notes":["可选说明"]}',
    "Rules:",
    "- Every bookmark_id must come from the provided list.",
    "- Group bookmarks into maintainable folders with Chinese names.",
    "- Keep same registrable domain together whenever practical.",
    "- Prefer 2-3 levels of folders.",
    "- Avoid too many tiny folders.",
    "- Do not omit bookmarks intentionally; assign as many as possible."
  ].join("\n");

  const userPrompt = [
    "请整理下面这些 Chrome 书签，并输出 JSON。",
    `自定义要求:\n${settings.customInstructions}`,
    "",
    "书签列表:",
    JSON.stringify(items, null, 2)
  ].join("\n");

  return {
    model: settings.model,
    temperature: Number(settings.temperature) || 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };
}

function extractAssistantText(data) {
  const choice = data?.choices?.[0]?.message;
  if (!choice) {
    throw new Error("AI 响应中没有 message。");
  }
  if (typeof choice.content === "string") {
    return choice.content;
  }
  if (Array.isArray(choice.content)) {
    return choice.content.map((part) => part?.text || "").join("\n");
  }
  throw new Error("无法解析 AI 响应内容。");
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 没有返回可解析的 JSON。");
    }
    return JSON.parse(match[0]);
  }
}

function validatePlan(plan, items) {
  if (!plan || !Array.isArray(plan.folders)) {
    throw new Error("AI 返回的计划缺少 folders 数组。");
  }

  const knownIds = new Set(items.map((item) => item.id));
  for (const folder of plan.folders) {
    if (!folder.path || !Array.isArray(folder.bookmark_ids)) {
      throw new Error("某个文件夹项缺少 path 或 bookmark_ids。");
    }
    for (const id of folder.bookmark_ids) {
      if (!knownIds.has(String(id))) {
        throw new Error(`AI 返回了未知 bookmark_id: ${id}`);
      }
    }
  }
}

function summarizePlan(plan) {
  let bookmarkCount = 0;
  for (const folder of plan.folders) {
    bookmarkCount += Array.isArray(folder.bookmark_ids) ? folder.bookmark_ids.length : 0;
  }
  return {
    folderCount: plan.folders.length,
    bookmarkCount
  };
}

function flattenBookmarks(root) {
  const list = [];

  function walk(node, folderTitles = []) {
    const title = (node.title || "").trim();
    if (node.url) {
      const url = node.url;
      const host = getHost(url);
      list.push({
        id: String(node.id),
        title: title || url,
        url,
        host,
        registrableDomain: getRegistrableDomain(host),
        folderPath: folderTitles.join(" / ")
      });
      return;
    }

    const nextTitles = isChromeRoot(node.id) || !title ? folderTitles : [...folderTitles, title];
    for (const child of node.children || []) {
      walk(child, nextTitles);
    }
  }

  walk(root, []);
  return list;
}

function countBy(items, picker) {
  const counter = new Map();
  for (const item of items) {
    const key = picker(item);
    counter.set(key, (counter.get(key) || 0) + 1);
  }
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch (_error) {
    return "";
  }
}

function getRegistrableDomain(host) {
  if (!host) {
    return "";
  }
  const special = new Set([
    "co.uk",
    "org.uk",
    "gov.uk",
    "ac.uk",
    "com.cn",
    "net.cn",
    "org.cn",
    "gov.cn",
    "com.au",
    "net.au",
    "org.au",
    "co.jp",
    "co.kr",
    "co.nz",
    "com.br",
    "com.tr",
    "com.tw",
    "com.hk",
    "com.sg",
    "com.my",
    "co.za"
  ]);
  const parts = host.split(".");
  if (parts.length <= 2) {
    return host;
  }
  const tail2 = parts.slice(-2).join(".");
  if (special.has(tail2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return tail2;
}

function isChromeRoot(id) {
  return id === "0" || id === "1" || id === "2" || id === "3";
}

async function ensureRootFolder(tree, rootFolderName) {
  const otherBookmarks = findNodeByTitle(tree, "Other bookmarks") ||
    findNodeByTitle(tree, "其他书签") ||
    findNodeById(tree, "2");

  if (!otherBookmarks) {
    throw new Error("找不到 Chrome 的 Other bookmarks 根目录。");
  }

  const existing = (otherBookmarks.children || []).find((child) => !child.url && child.title === rootFolderName);
  if (existing) {
    return existing.id;
  }

  const created = await chrome.bookmarks.create({
    parentId: otherBookmarks.id,
    title: rootFolderName
  });
  return created.id;
}

async function ensureFolderPath(rootId, path, cache) {
  const normalized = path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  let parentId = rootId;
  let builtPath = "";

  for (const part of normalized) {
    builtPath = builtPath ? `${builtPath}/${part}` : part;
    if (cache.has(builtPath)) {
      parentId = cache.get(builtPath);
      continue;
    }

    const children = await chrome.bookmarks.getChildren(parentId);
    const existing = children.find((child) => !child.url && child.title === part);
    if (existing) {
      parentId = existing.id;
      cache.set(builtPath, parentId);
      continue;
    }

    const created = await chrome.bookmarks.create({ parentId, title: part });
    parentId = created.id;
    cache.set(builtPath, parentId);
  }

  return parentId;
}

function findNodeByTitle(node, title) {
  if (node.title === title) {
    return node;
  }
  for (const child of node.children || []) {
    const found = findNodeByTitle(child, title);
    if (found) {
      return found;
    }
  }
  return null;
}

function findNodeById(node, id) {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children || []) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}
