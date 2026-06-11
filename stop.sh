#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[SuperWriter] 正在停止..."

pkill -f "next dev.*3000" 2>/dev/null || true
sleep 1

if lsof -ti:3000 >/dev/null 2>&1; then
    echo "[SuperWriter] 强制释放端口 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo "[SuperWriter] Next.js 已停止"
echo "[SuperWriter] Supabase 仍在运行 (用 supabase stop 完全停止)"
echo "[SuperWriter] 完成"
