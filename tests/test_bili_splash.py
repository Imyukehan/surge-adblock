"""Regression for the splash list missed by Biliverse 0.7.3. Requires jq."""
from pathlib import Path
import json
import re
import shlex
import subprocess

module = (Path(__file__).resolve().parents[1] / "Domestic-Adblock.sgmodule").read_text()
line = next(line for line in module.splitlines() if line.startswith("http-response-jq "))
_, pattern, expression = line.split(maxsplit=2)
expression = shlex.split(expression)[0]

for host in ("app.bilibili.com", "app.biliapi.net"):
    for path in ("show", "list", "brand/list", "event/list2"):
        for suffix in ("", "?build=999999"):
            assert re.search(pattern, f"https://{host}/x/v2/splash/{path}{suffix}")
for url in (
    "https://app.bilibili.com/x/v2/feed/index?idx=0",
    "https://app.bilibili.com/x/v2/splash/list_extra",
    "https://unrelated.example/x/v2/splash/list",
):
    assert not re.search(pattern, url), url

def rewrite(body):
    result = subprocess.run(
        ["jq", "-c", expression], input=json.dumps(body),
        text=True, capture_output=True, check=True,
    )
    return json.loads(result.stdout)

for message in ("0", "OK"):
    body = {"code": 0, "message": message, "ttl": 1, "data": {
        "list": [{"id": 123, "card_type": 39, "thumb": "https://example.invalid/ad.jpg"}],
        "max_time": 4, "min_interval": 14400, "splash_request_id": "fixture",
        "other_config": {"enabled": True},
    }}
    expected = json.loads(json.dumps(body))
    expected["data"]["list"] = []
    assert rewrite(body) == expected

for body in (
    {"code": 0, "data": {"list": []}},
    {"code": 0, "data": {"other_config": True}},
    {"code": -400, "message": "request error", "data": None},
    {"code": -400, "message": "request error"},
):
    assert rewrite(body) == body
print("OK: splash lists cleared; other fields, error responses and feed routing preserved")
