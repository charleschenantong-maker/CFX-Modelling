#!/usr/bin/env python3
"""LLM Crash Course · 进度落盘服务

作用：把课程页面里的学习进度（已读章节、自测成绩、学习时长）写进本地文件夹里的
一个 JSON 文件，这样进度就不会随浏览器缓存被清掉，也可以直接纳入 git 备份。

用法（在 ai-course 目录下运行）：

    python progress_server.py                # 默认 http://127.0.0.1:8000
    python progress_server.py --port 8123    # 换端口
    python progress_server.py --file my-progress.json

然后浏览器打开它打印出来的地址（不要直接双击 index.html，那样页面无法写入文件）。
页面会自己检测到这个服务，并在左侧「学习时长」下方显示「已写入 progress.json（本地服务）」。

只监听本机 127.0.0.1，不对外开放；只写入指定的那一个 JSON 文件。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class ProgressHandler(SimpleHTTPRequestHandler):
    """静态文件服务 + 两个极小的进度读写接口。"""

    progress_file: Path = Path("progress.json")
    server_version = "LLMCourseProgress/1.0"

    # ---------- 工具 ----------
    def _send_json(self, obj, code: int = 200) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _api_path(self) -> str:
        return self.path.split("?", 1)[0].rstrip("/")

    # ---------- 路由 ----------
    def do_GET(self):  # noqa: N802 (http.server 的约定)
        api = self._api_path()
        if api == "/api/health":
            return self._send_json({
                "ok": True,
                "file": str(self.progress_file),
                "exists": self.progress_file.exists(),
            })
        if api == "/api/progress":
            if self.progress_file.exists():
                try:
                    return self._send_json(json.loads(self.progress_file.read_text("utf-8")))
                except (OSError, json.JSONDecodeError) as exc:
                    return self._send_json({"ok": False, "error": str(exc)}, 500)
            return self._send_json({})
        return super().do_GET()

    def do_POST(self):  # noqa: N802
        if self._api_path() != "/api/progress":
            self.send_error(404, "only /api/progress accepts POST")
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            return self._send_json({"ok": False, "error": f"invalid JSON: {exc}"}, 400)
        if not isinstance(payload, dict):
            return self._send_json({"ok": False, "error": "payload must be a JSON object"}, 400)

        # 原子写入：先写临时文件再替换，避免中途失败把进度写坏
        tmp = self.progress_file.with_suffix(self.progress_file.suffix + ".tmp")
        try:
            tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf-8")
            os.replace(tmp, self.progress_file)
        except OSError as exc:
            return self._send_json({"ok": False, "error": str(exc)}, 500)
        return self._send_json({"ok": True, "saved": str(self.progress_file)})

    def log_message(self, fmt, *args):  # 只记录进度接口的访问，静态文件不刷屏
        if "/api/" in (self.path or ""):
            super().log_message(fmt, *args)


def main() -> int:
    parser = argparse.ArgumentParser(description="LLM Crash Course 进度落盘服务")
    parser.add_argument("--port", type=int, default=8000, help="监听端口（默认 8000）")
    parser.add_argument("--dir", default=None, help="要服务的目录（默认本脚本所在目录）")
    parser.add_argument("--file", default="progress.json", help="进度文件名（默认 progress.json）")
    args = parser.parse_args()

    root = Path(args.dir).resolve() if args.dir else Path(__file__).resolve().parent
    if not (root / "index.html").exists():
        print(f"[!] 目录里没有 index.html：{root}", file=sys.stderr)
        print("    请用 --dir 指向 ai-course 目录。", file=sys.stderr)
        return 1

    ProgressHandler.progress_file = root / args.file
    handler = partial(ProgressHandler, directory=str(root))
    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), handler)

    print("LLM Crash Course · 进度落盘服务已启动")
    print(f"  课程地址：http://127.0.0.1:{args.port}/")
    print(f"  进度文件：{ProgressHandler.progress_file}")
    print("  停止服务：Ctrl + C")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。进度保存在上面那个文件里。")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
