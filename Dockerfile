# 第一阶段：构建阶段 (Builder)
FROM node:20-alpine AS builder
WORKDIR /app

# 仅复制依赖配置文件，利用 Docker 缓存加速构建
COPY package*.json ./

# 核心优化 1：仅安装生产依赖，忽略 devDependencies
# 核心优化 2：运行完毕后清理 npm 缓存，减小临时体积
RUN npm install --production && npm cache clean --force

# 第二阶段：运行阶段 (Runner)
FROM node:20-alpine
WORKDIR /app

# 核心优化 3：从 builder 阶段只复制干净的生产 node_modules，不带缓存和编译垃圾
COPY --from=builder /app/node_modules ./node_modules

# 复制业务代码
COPY . /app

EXPOSE 14484
CMD ["node", "index.js"]
