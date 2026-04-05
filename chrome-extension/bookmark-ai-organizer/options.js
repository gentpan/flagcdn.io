const ids = [
  "apiEndpoint",
  "model",
  "apiToken",
  "temperature",
  "maxBookmarks",
  "rootFolderName",
  "customInstructions"
];

const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const statusBox = document.getElementById("statusBox");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

document.addEventListener("DOMContentLoaded", loadSettings);
saveBtn.addEventListener("click", saveSettings);
resetBtn.addEventListener("click", resetSettings);

async function loadSettings() {
  try {
    const settings = await sendMessage({ type: "getSettings" });
    for (const [key, element] of Object.entries(elements)) {
      element.value = settings[key] ?? "";
    }
    statusBox.textContent = "已加载当前设置。";
  } catch (error) {
    statusBox.textContent = `加载失败: ${error.message || String(error)}`;
  }
}

async function saveSettings() {
  try {
    const payload = {};
    for (const [key, element] of Object.entries(elements)) {
      payload[key] = element.value;
    }
    payload.temperature = Number(payload.temperature);
    payload.maxBookmarks = Number(payload.maxBookmarks);
    await sendMessage({ type: "saveSettings", payload });
    statusBox.textContent = "设置已保存。";
  } catch (error) {
    statusBox.textContent = `保存失败: ${error.message || String(error)}`;
  }
}

async function resetSettings() {
  try {
    await sendMessage({ type: "saveSettings", payload: {} });
    await loadSettings();
    statusBox.textContent = "已恢复默认设置。";
  } catch (error) {
    statusBox.textContent = `恢复失败: ${error.message || String(error)}`;
  }
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "Unknown error");
  }
  return response.result;
}
