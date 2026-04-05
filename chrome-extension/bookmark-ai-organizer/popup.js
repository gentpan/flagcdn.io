const statusBox = document.getElementById("statusBox");
const planBox = document.getElementById("planBox");
const scanBtn = document.getElementById("scanBtn");
const generateBtn = document.getElementById("generateBtn");
const applyBtn = document.getElementById("applyBtn");
const openOptionsBtn = document.getElementById("openOptionsBtn");

scanBtn.addEventListener("click", async () => {
  await runAction("正在扫描书签...", async () => {
    const result = await sendMessage({ type: "scanBookmarks" });
    statusBox.textContent = [
      `书签总数: ${result.total}`,
      "",
      "高频文件夹:",
      ...result.folders.slice(0, 10).map((item) => `- ${item.name}: ${item.count}`),
      "",
      "高频域名:",
      ...result.domains.slice(0, 10).map((item) => `- ${item.name}: ${item.count}`)
    ].join("\n");
  });
});

generateBtn.addEventListener("click", async () => {
  await runAction("正在调用 AI 生成整理计划...", async () => {
    const result = await sendMessage({ type: "generatePlan" });
    planBox.value = JSON.stringify(result.plan, null, 2);
    statusBox.textContent = [
      `扫描到书签: ${result.scanned}`,
      `提交给 AI: ${result.submitted}`,
      `计划文件夹数: ${result.summary.folderCount}`,
      `计划覆盖书签数: ${result.summary.bookmarkCount}`,
      "",
      "你可以先检查下方 JSON，再点击“应用计划”。"
    ].join("\n");
  });
});

applyBtn.addEventListener("click", async () => {
  await runAction("正在应用计划并移动书签...", async () => {
    const plan = JSON.parse(planBox.value);
    const result = await sendMessage({
      type: "applyPlan",
      payload: { plan }
    });
    statusBox.textContent = `已移动 ${result.moved} 条书签。\n目标根目录: ${result.targetRootFolder}`;
  });
});

openOptionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());

async function runAction(loadingText, fn) {
  try {
    statusBox.textContent = loadingText;
    toggleButtons(true);
    await fn();
  } catch (error) {
    statusBox.textContent = `发生错误:\n${error.message || String(error)}`;
  } finally {
    toggleButtons(false);
  }
}

function toggleButtons(disabled) {
  scanBtn.disabled = disabled;
  generateBtn.disabled = disabled;
  applyBtn.disabled = disabled;
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "Unknown error");
  }
  return response.result;
}
