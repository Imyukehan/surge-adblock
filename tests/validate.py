from pathlib import Path
import json, re, subprocess, tempfile, shutil
root = Path(__file__).resolve().parents[1]
text = (root / "Domestic-Adblock.sgmodule").read_text()
assert "#!name=国内常用网站与 App 去广告" in text
assert not any(x in text for x in ["AdblockScripts/", "/Users/", "{{{", "biliintl", "qidian.com", "ca-p12", "password="])
names = []; urls = set(); section = ""
for line in text.splitlines():
    if line.startswith("["): section = line
    if not line or line.startswith("#"): continue
    if "type=http-" in line:
        names.append(line.split("=", 1)[0].strip())
        pattern = re.search(r"pattern=([^,]+)", line).group(1)
        re.compile(pattern)
        url = re.search(r"script-path=([^,\s]+)", line).group(1)
        assert url.startswith("https://"), url
        urls.add(url)
    elif section == "[Map Local]" and not line.startswith("["):
        re.compile(line.split(" data-")[0])
    elif section == "[URL Rewrite]" and not line.startswith("["):
        assert line.endswith(" _ reject"), line
        re.compile(line.split()[0])
assert len(names) == len(set(names)), "Duplicate script names"
assert urls == {x["url"] for x in json.loads((root / "sources.json").read_text())["scripts"]}
cli = shutil.which("surge-cli") or "/Applications/Surge.app/Contents/Applications/surge-cli"
if Path(cli).exists():
    with tempfile.NamedTemporaryFile(suffix=".conf", mode="w") as f:
        f.write(text.replace("%APPEND% ", "") + "\n[Rule]\nFINAL,DIRECT\n"); f.flush()
        subprocess.run([cli, "--check", f.name], check=True)
print(f"OK: {len(names)} scripts, {len(urls)} remote dependencies")
