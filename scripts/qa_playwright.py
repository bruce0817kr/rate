import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


API_BASE = "http://localhost:3030/api"
APP_BASE = "http://localhost:3033"
OUT_DIR = Path("artifacts") / "qa"


def login_api() -> dict:
    payload = json.dumps({"username": "admin", "password": "admin123"}).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def require_text(page, text: str, label: str) -> None:
    page.wait_for_load_state("networkidle")
    body_text = page.inner_text("body")
    if text not in body_text:
        raise RuntimeError(
            f"{label}: expected text not found -> {text}\n"
            f"url={page.url}\n"
            f"body={body_text[:1000]}"
        )


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        auth = login_api()
    except urllib.error.URLError as exc:
        print(f"BLOCKED: login API request failed: {exc}")
        return 2

    token = auth["access_token"]
    user = auth["user"]

    checks = [
        ("/", "현황 개요", "dashboard"),
        ("/team-members", "팀원 관리", "team-members"),
        ("/projects", "사업 관리", "projects"),
        ("/upload", "데이터 업로드", "upload"),
        ("/audit-logs", "감사 로그", "audit-logs"),
    ]

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            storage_state={
                "cookies": [],
                "origins": [
                    {
                        "origin": APP_BASE,
                        "localStorage": [
                            {"name": "auth_token", "value": token},
                            {"name": "auth_user", "value": json.dumps(user, ensure_ascii=False)},
                        ],
                    }
                ],
            }
        )
        page = context.new_page()

        for path, expected_text, slug in checks:
            url = f"{APP_BASE}{path}"
            page.goto(url, wait_until="domcontentloaded")
            require_text(page, expected_text, slug)
            screenshot_path = OUT_DIR / f"{slug}.png"
            page.screenshot(path=str(screenshot_path), full_page=True)
            results.append(
                {
                    "path": path,
                    "expected_text": expected_text,
                    "title": page.title(),
                    "screenshot": str(screenshot_path),
                }
            )

        context.close()
        browser.close()

    print(json.dumps({"status": "ok", "results": results}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
