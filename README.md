# Cornerstone 前端项目

## 项目简介

Cornerstone 前端是基于 Vue 3 + TypeScript 构建的现代化社交平台 Web 应用，覆盖首页推荐、搜索、话题、AI 助手、即时通讯、创作者中心与管理员后台等核心场景。

## 项目架构

本项目采用典型的前端分层与模块化设计，主要包括以下组件：

- **页面层**：视图页面与布局管理
- **组件层**：可复用 UI 组件与业务组件
- **状态管理**：Pinia 管理用户、IM、通知等状态
- **路由管理**：Vue Router 负责多页面导航与标题控制
- **数据访问**：Axios 统一封装请求与错误处理
- **工具层**：时间、文本等通用工具函数
- **样式体系**：全局样式与模块化样式并行

## 项目目录结构

```
.
├── public/                     # 公共静态资源
├── src/
│   ├── api/                    # API 请求封装
│   ├── assets/                 # 静态资源与样式
│   ├── components/             # 组件
│   ├── layouts/                # 布局
│   ├── router/                 # 路由配置
│   ├── stores/                 # Pinia 状态
│   ├── utils/                  # 工具函数
│   ├── views/                  # 页面视图
│   ├── App.vue                 # 应用根组件
│   └── main.ts                 # 应用入口
├── index.html                  # HTML 模板
├── package.json                # 依赖与脚本
├── tsconfig.json               # TS 配置
└── vite.config.ts              # Vite 配置
```

## 技术栈

### 主要技术

- **框架**：Vue 3
- **语言**：TypeScript
- **构建工具**：Vite
- **路由**：Vue Router
- **状态管理**：Pinia
- **UI 组件**：Element Plus
- **HTTP**：Axios
- **Markdown 渲染**：markdown-it
- **代码高亮**：highlight.js
- **本地存储**：idb

## 功能模块

### 1. 内容与发现
- 首页推荐与最新内容
- 搜索（帖子/用户）
- 标签话题浏览

### 2. 社交互动
- 帖子详情、点赞、收藏、评论
- 用户主页与关注

### 3. 即时通讯
- 私信聊天
- 会话列表与未读提醒

### 4. 通知系统
- 系统消息列表
- 未读统计与一键已读

### 5. 创作者中心
- 发布与编辑帖子
- 帖子管理
- 数据看板（粉丝/内容/帖子）

### 6. 管理员后台
- 用户查询与状态管理
- 角色权限分配
- 帖子审核队列

### 7. AI 模块
- 智能搜索与摘要
- AI 助手对话

## 项目启动

### 环境准备

1. **安装 Node.js**（建议使用 LTS 版本）
2. **安装依赖**

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

服务默认运行在 `http://localhost:5173`。前端通过 `/api` 代理访问后端（默认 `http://localhost:8080`）。

## 构建与预览

```bash
npm run build
npm run preview
```

## 类型检查

```bash
npx vue-tsc -b
```

## 开发规范

- 页面标题统一由路由 meta 管理
- API 请求统一封装在 `src/api`
- 组件与页面分层清晰，样式遵循模块化
- 状态统一由 Pinia 管理
