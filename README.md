# 聊天室 - Sealos 部署指南

支持功能：
- 无需注册，输入昵称即可聊天
- 发送文字消息（支持换行）
- 发送图片（最大 5MB）
- 浏览器桌面通知（需用户授权）
- 标题栏未读消息计数
- 在线用户列表
- 消息历史记录（最近 80 条）

---

## 方式一：使用 Docker Hub 部署到 Sealos（推荐）

### 第一步：构建并推送镜像

确保本地已安装 Docker，在项目根目录执行：

```bash
# 替换 yourname 为你的 Docker Hub 用户名
docker build -t yourname/chatroom:latest .
docker login
docker push yourname/chatroom:latest
```

### 第二步：在 Sealos 部署

1. 打开 [Sealos 控制台](https://cloud.sealos.io)
2. 进入「应用管理」→「新建应用」
3. 填写以下配置：

| 字段 | 值 |
|------|-----|
| 应用名称 | chatroom |
| 镜像地址 | `yourname/chatroom:latest` |
| CPU | 0.2 核 |
| 内存 | 256 MB |
| 容器端口 | 3000 |
| 开启外网访问 | ✅ 是 |

4. 点击「部署」，等待 1-2 分钟即可访问

---

## 方式二：本地运行测试

```bash
npm install
npm start
# 访问 http://localhost:3000
```

---

## 注意事项

- 图片上传保存在容器内 `/app/public/uploads/`，重启后会清空
- 如需持久化图片，在 Sealos 中挂载存储卷到 `/app/public/uploads`
- 消息历史仅保存在内存，重启后清空
