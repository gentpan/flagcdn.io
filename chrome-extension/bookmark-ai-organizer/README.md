# AI Bookmark Organizer

一个零依赖的 Chrome Manifest V3 扩展，用用户自己的 AI API 来整理书签。

## 功能

- 读取当前 Chrome 书签树
- 允许用户填写自己的 API Endpoint、Model、Token
- 调用 OpenAI 兼容 `chat/completions` 接口生成整理计划
- 在弹窗中预览和手改 JSON 计划
- 一键把书签移动到扩展创建的目标目录下

## 目录

- `manifest.json`: Chrome 扩展清单
- `background.js`: 书签扫描、AI 请求、计划执行
- `popup.*`: 主操作界面
- `options.*`: API 配置页面

## 使用方法

1. 打开 Chrome 扩展管理页 `chrome://extensions/`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选中这个目录：
   `/Users/gentpan/projects/flagcdn.io/chrome-extension/bookmark-ai-organizer`
5. 打开扩展设置页，填入你自己的 API 信息
6. 在扩展弹窗中点击：
   - `扫描书签`
   - `生成整理计划`
   - 检查 `计划 JSON`
   - `应用计划`

## 计划格式

AI 需要返回这个 JSON 结构：

```json
{
  "folders": [
    {
      "path": "开发/前端/UI组件",
      "bookmark_ids": ["123", "456"],
      "reason": "同类前端组件站点"
    }
  ],
  "notes": ["可选说明"]
}
```

## 当前限制

- 默认通过一次请求把书签列表发给模型，超大书签库建议调低 `Max Bookmarks per Run`
- 目前的执行动作是“移动现有书签”，不删除书签、不去重
- 所有 AI 新建目录都会落在 `Other bookmarks` 下的 `AI Organized` 根目录中
