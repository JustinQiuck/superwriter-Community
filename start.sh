#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOG_DIR"
FORCE_RESTART=0
STARTED_NEXT_PID=""

case "${1:-}" in
    --restart)
        FORCE_RESTART=1
        ;;
    --help|-h)
        echo "Usage: ./start.sh [--restart]"
        echo "  default    Reuse an already-running local dev server when possible."
        echo "  --restart  Stop existing Next.js dev server first, then start fresh."
        exit 0
        ;;
esac

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SuperWriter]${NC} $1"; }
warn() { echo -e "${YELLOW}[SuperWriter]${NC} $1"; }
err()  { echo -e "${RED}[SuperWriter]${NC} $1"; }

kill_old() {
    log "正在停止旧进程..."
    pkill -f "next dev.*3000" 2>/dev/null || true
    pkill -f "supabase.*start" 2>/dev/null || true
    sleep 1
    if lsof -ti:3000 >/dev/null 2>&1; then
        warn "端口 3000 仍被占用，强制释放..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    sleep 1
}

check_docker() {
    if ! docker info --format '{{.ServerVersion}}' >/dev/null 2>&1; then
        log "正在启动 Docker (OrbStack)..."
        open -a OrbStack 2>/dev/null || open -a Docker 2>/dev/null
        for i in $(seq 1 30); do
            if docker info --format '{{.ServerVersion}}' >/dev/null 2>&1; then
                log "Docker 已就绪"
                return 0
            fi
            sleep 2
        done
        err "Docker 启动超时，请手动启动后重试"
        exit 1
    fi
}

start_supabase() {
    if supabase status 2>/dev/null | grep -q "API URL"; then
        log "Supabase 已在运行"
        return 0
    fi
    log "正在启动 Supabase..."
    cd "$PROJECT_DIR"
    supabase start 2>&1 | tail -5
    log "Supabase 已启动"
}

clean_next_cache_if_needed() {
    local next_dir="$PROJECT_DIR/apps/web/.next"
    local next_log="$LOG_DIR/next.log"

    if [ "$FORCE_RESTART" -eq 1 ] && [ -d "$next_dir" ]; then
        warn "重启模式：清理 Next.js 本地缓存"
        rm -rf "$next_dir"
        return 0
    fi

    if [ ! -d "$next_dir" ] || [ ! -f "$next_log" ]; then
        return 0
    fi

    if grep -Eq "React Client Manifest|Cannot find module './vendor-chunks|__webpack_modules__\\[moduleId\\]|build-manifest\\.json|app-build-manifest\\.json|ENOENT: no such file or directory, open '.+\\.next" "$next_log"; then
        warn "检测到 Next.js manifest/vendor chunk 缓存损坏，正在清理 .next"
        rm -rf "$next_dir"
    fi
}

next_cache_looks_broken() {
    local next_log="$LOG_DIR/next.log"

    [ -f "$next_log" ] || return 1
    grep -Eq "React Client Manifest|Cannot find module './vendor-chunks|__webpack_modules__\\[moduleId\\]|build-manifest\\.json|app-build-manifest\\.json|ENOENT: no such file or directory, open '.+\\.next" "$next_log"
}

is_next_healthy() {
    curl -fsS --max-time 5 -o /dev/null http://localhost:3000 2>/dev/null
}

recover_unhealthy_next_if_needed() {
    if next_cache_looks_broken; then
        warn "端口 3000 上的 Next.js 服务不健康，且日志显示缓存损坏；正在重启"
        kill_old
        clean_next_cache_if_needed
        return 0
    fi

    warn "端口 3000 被占用但服务不健康；如需强制清理，请运行 ./start.sh --restart"
    err "Next.js 未启动"
    exit 1
}

start_next() {
    if is_next_healthy; then
        log "Next.js 已在运行，复用现有开发服务器"
        return 0
    fi

    if lsof -ti:3000 >/dev/null 2>&1; then
        recover_unhealthy_next_if_needed
    fi

    clean_next_cache_if_needed

    log "正在启动 Next.js 开发服务器..."
    cd "$PROJECT_DIR/apps/web"
    pnpm exec next dev --turbopack --port 3000 > "$LOG_DIR/next.log" 2>&1 &
    local pid=$!
    STARTED_NEXT_PID="$pid"
    echo "$pid" > "$LOG_DIR/next.pid"

    for i in $(seq 1 20); do
        if is_next_healthy; then
            log "Next.js 已就绪"
            return 0
        fi
        sleep 1
    done
    err "Next.js 启动超时，查看日志: $LOG_DIR/next.log"
    tail -40 "$LOG_DIR/next.log" 2>/dev/null || true
    exit 1
}

show_status() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}SuperWriter 已启动${NC}                           ${CYAN}║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  应用:  ${YELLOW}http://localhost:3000${NC}                ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  API:   ${YELLOW}http://127.0.0.1:54321${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  数据库: ${YELLOW}http://127.0.0.1:54323${NC}             ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  邮件:  ${YELLOW}http://127.0.0.1:54324${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  日志:  $LOG_DIR/next.log"
    echo -e "${CYAN}║${NC}  停止:  ./stop.sh 或 Ctrl+C"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

stop_handler() {
    echo ""
    log "正在停止..."
    kill_old
    log "已停止"
    exit 0
}

trap stop_handler SIGINT SIGTERM

if [ "$FORCE_RESTART" -eq 1 ]; then
    kill_old
else
    log "使用智能启动模式；已有开发服务器会被复用"
fi
check_docker
start_supabase
start_next
show_status

if [ -n "$STARTED_NEXT_PID" ]; then
    log "按 Ctrl+C 停止本次启动的服务"
    wait "$STARTED_NEXT_PID"
else
    log "已复用现有服务；需要停止时运行 ./stop.sh"
fi
