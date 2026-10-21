"""Read-only, bounded publication byte/identity checks; no deployment or Git writes."""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urljoin, urlsplit

SHOWCASE_VERSION = "1.3.2"
SHOWCASE_SOURCE = "24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07"
HOMEPAGE_VERSION = "1.3.0"
HOMEPAGE_SOURCE = "7f202150b2e95f744d90eab39eaf5e2d18d40bd8"
HOMEPAGE_PACKAGE_SHA256 = "3acd90283037d999406d322c385f36570582191b1194f999c6a149c484c470f4"
RELEASE_PREFIX = "/ui/releases/1.3.2/"


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class HtmlInventory(HTMLParser):
    def __init__(self, text: str):
        super().__init__()
        self.refs: list[str] = []
        self.meta: dict[str, str] = {}
        self.budding = False
        self.feed(text)

    def handle_starttag(self, tag: str, values: list[tuple[str, str | None]]):
        attrs = dict(values)
        if tag in {"script", "link", "img"}:
            for key in ("src", "href"):
                if attrs.get(key):
                    self.refs.append(attrs[key])
        if tag == "meta" and attrs.get("name"):
            self.meta[attrs["name"]] = attrs.get("content", "")
        if attrs.get("data-budding-link") == "website-ui-entrance":
            self.budding = True


def child_file(root: Path, relative: str) -> Path:
    text = unquote(relative).replace("\\", "/")
    if text.startswith("/") or any(part in {"", ".", ".."} for part in text.split("/")):
        raise ValueError("Invalid resource path")
    result = (root / text).resolve()
    result.relative_to(root.resolve())
    if not result.is_file():
        raise FileNotFoundError("Required local resource is absent")
    return result


def site_path(reference: str, base: str, origin: str) -> str | None:
    parsed = urlsplit(urljoin(origin + base, reference))
    if parsed.scheme != "https" or parsed.netloc != urlsplit(origin).netloc:
        return None
    if parsed.username or parsed.password:
        return None
    return parsed.path


def fetch(origin: str, path: str) -> tuple[bytes, dict]:
    # Every request is GET; these retries never repeat a write operation.
    marker = b"\nALVENX_HTTP_META:"
    run = subprocess.run(
        ["curl.exe", "--fail", "--silent", "--show-error", "--location",
         "--proto", "=https", "--proto-redir", "=https", "--compressed",
         "--connect-timeout", "10", "--max-time", "40", "--retry", "2",
         "--retry-delay", "1", "--retry-max-time", "85", "--retry-all-errors",
         "--header", "Cache-Control: no-cache", "--write-out", "\nALVENX_HTTP_META:%{json}",
         origin + path], capture_output=True, timeout=125,
    )
    body, separator, raw_meta = run.stdout.rpartition(marker)
    meta = {}
    if separator:
        try:
            parsed = json.loads(raw_meta)
            effective = urlsplit(parsed.get("url_effective", ""))
            meta = {
                "httpStatus": parsed.get("http_code"),
                "effectivePath": effective.path,
                "redirects": parsed.get("num_redirects"),
                "contentType": parsed.get("content_type"),
            }
        except (json.JSONDecodeError, ValueError):
            pass
    else:
        body = b""
    meta["curlExit"] = run.returncode
    if run.returncode or not separator:
        raise HttpFailure(meta)
    return body, meta


class HttpFailure(Exception):
    def __init__(self, metadata: dict):
        super().__init__("Public GET failed")
        self.metadata = metadata


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--public-root", type=Path, required=True, help="Isolated website public directory")
    parser.add_argument("--dist-client", type=Path, required=True, help="Matching website dist/client directory")
    parser.add_argument("--origin", default="https://alvenx.com")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("online-byte-verification.json"))
    parser.add_argument("--max-home-assets", type=int, default=16)
    args = parser.parse_args()
    parsed_origin = urlsplit(args.origin)
    if (parsed_origin.scheme != "https" or not parsed_origin.netloc or parsed_origin.username
            or parsed_origin.password or parsed_origin.path not in {"", "/"}
            or parsed_origin.query or parsed_origin.fragment):
        parser.error("--origin must be an HTTPS origin without credentials, path, query or fragment")
    if not 2 <= args.max_home_assets <= 32:
        parser.error("--max-home-assets must be between 2 and 32")
    origin = args.origin.rstrip("/")
    public = args.public_root.resolve()
    dist = args.dist_client.resolve()
    website = public.parent
    report = {
        "schemaVersion": 1, "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "origin": origin,
        "scope": "Read-only selected hosted resource bytes, source identities, homepage SSR asset sample and pinned dependency",
        "expected": {"showcaseVersion": SHOWCASE_VERSION, "showcaseSourceCommit": SHOWCASE_SOURCE,
                     "homepageKitVersion": HOMEPAGE_VERSION, "homepageSourceCommit": HOMEPAGE_SOURCE},
        "checks": [], "resources": [], "skippedOptionalPaths": [], "issues": [],
        "boundaries": ["No physical iOS, IME, Combo Touch or frame-rate certification",
                       "Homepage SSR HTML is inspected for component/resource references, not compared as a static file",
                       "Only selected assets are requested; historical resources are not recursively fetched",
                       "No response bodies, request headers, credentials or local absolute source paths are included"],
    }
    responses: dict[str, bytes] = {}
    plan: dict[str, dict] = {}

    def check(name: str, passed: bool, detail=None):
        record = {"name": name, "passed": bool(passed)}
        if detail is not None:
            record["detail"] = detail
        report["checks"].append(record)
        if not passed:
            report["issues"].append(name)

    def add_public(path: str, category: str, optional=False):
        try:
            local = child_file(public, path.lstrip("/"))
        except FileNotFoundError:
            if optional:
                report["skippedOptionalPaths"].append(path)
                return
            raise
        plan.setdefault(path, {"path": path, "category": category, "root": "public", "file": local})

    def inspect_assets(html_path: str, version: str, category: str):
        text = child_file(public, html_path.lstrip("/")).read_text(encoding="utf-8")
        inventory = HtmlInventory(text)
        prefix = f"/ui/releases/{version}/"
        entries = []
        for ref in inventory.refs:
            path = site_path(ref, html_path, origin)
            if path and path.startswith(prefix) and re.search(r"\.(?:js|css|svg|png)$", path, re.I):
                add_public(path, category)
                entries.append(path)
        # The imported canonical wordmark lives in the JS entry, rather than
        # the HTML. Select its exact generated SVG and a few font resources.
        for path in list(entries):
            if path.endswith(".js"):
                source = child_file(public, path.lstrip("/")).read_text(encoding="utf-8")
                for asset in sorted(set(re.findall(re.escape(prefix) + r"assets/[A-Za-z0-9_.-]+\.svg", source)))[:4]:
                    add_public(asset, category + "-brand")
            elif path.endswith(".css") and version == SHOWCASE_VERSION:
                css = child_file(public, path.lstrip("/")).read_text(encoding="utf-8")
                refs = re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", css)
                fonts = [site_path(value, path, origin) for value in refs if ".woff2" in value]
                for needle in ("InstrumentSans", "misans-400-cs", "misans-500-cs"):
                    matches = sorted({value for value in fonts if value and needle.lower() in value.lower()})
                    if matches:
                        add_public(matches[0], "showcase-font-sample")
        return inventory, entries

    def compare(item: dict) -> tuple[dict, bytes | None]:
        path = item["path"]
        expected = item["file"].read_bytes()
        result = {"path": path, "category": item["category"], "localRoot": item["root"],
                  "expectedBytes": len(expected), "expectedSha256": sha256(expected)}
        try:
            actual, metadata = fetch(origin, path)
            result.update(metadata)
            result.update({"actualBytes": len(actual), "actualSha256": sha256(actual), "matches": actual == expected})
            return result, actual
        except HttpFailure as error:
            result.update(error.metadata)
            result.update({"matches": False, "error": "HTTP_GET_FAILED"})
        except subprocess.TimeoutExpired:
            result.update({"matches": False, "error": "CURL_PROCESS_TIMEOUT"})
        except Exception as error:
            result.update({"matches": False, "error": type(error).__name__})
        return result, None

    try:
        local_index = child_file(public, "ui/index.html").read_bytes()
        manifest = json.loads(child_file(public, "ui/showcase-manifest.json").read_text(encoding="utf-8"))
        entrance = json.loads(child_file(public, "ui/homepage-entry-manifest.json").read_text(encoding="utf-8"))
        pkg = json.loads((website / "package.json").read_text(encoding="utf-8"))
        check("local showcase source identity", manifest.get("version") == SHOWCASE_VERSION and manifest.get("sourceRef") == "v1.3.2" and manifest.get("sourceCommit") == SHOWCASE_SOURCE)
        check("local showcase namespace", manifest.get("releaseBase") == RELEASE_PREFIX)
        check("homepage source identity", entrance.get("kitVersion") == HOMEPAGE_VERSION and entrance.get("sourceRef") == "v1.3.0" and entrance.get("sourceCommit") == HOMEPAGE_SOURCE)
        dependency = pkg.get("dependencies", {}).get("@alvenx/liquid-glass")
        check("homepage dependency pinned 1.3.0", dependency == "file:vendor/alvenx-liquid-glass-1.3.0.tgz")
        vendor = child_file(website, "vendor/alvenx-liquid-glass-1.3.0.tgz")
        check("homepage vendor bytes", sha256(vendor.read_bytes()) == HOMEPAGE_PACKAGE_SHA256 == entrance.get("packageSha256"))
        installed = json.loads(child_file(website, "node_modules/@alvenx/liquid-glass/package.json").read_text(encoding="utf-8"))
        check("homepage installed package version", installed.get("version") == HOMEPAGE_VERSION)
        for path in ("/ui/index.html", "/ui/showcase-manifest.json", "/ui/homepage-entry-manifest.json"):
            add_public(path, "production-identity")
        plan["/ui/"] = {"path": "/ui/", "category": "production-route", "root": "public", "file": child_file(public, "ui/index.html")}
        inventory, entries = inspect_assets("/ui/index.html", SHOWCASE_VERSION, "showcase-current")
        check("local HTML publication metadata", inventory.meta.get("alvenx-source-commit") == SHOWCASE_SOURCE and inventory.meta.get("alvenx-source-ref") == "v1.3.2" and inventory.meta.get("alvenx-kit-version") == SHOWCASE_VERSION)
        check("HTML references current release JS/CSS", any(path.endswith(".js") for path in entries) and any(path.endswith(".css") for path in entries))
        prior_archive = "/ui/archive/production-1.3.1-20261021/"
        for filename in ("index.html", "index-original.html", "showcase-manifest-original.json", "archive-manifest.json"):
            add_public(prior_archive + filename, "previous-production-archive", optional=True)
        for filename in ("index.html", "mobile-review.html"):
            add_public("/ui/releases/1.3.1/" + filename, "previous-release-entry", optional=True)
        if (public / "ui/releases/1.3.1/index.html").is_file():
            inspect_assets("/ui/releases/1.3.1/index.html", "1.3.1", "previous-release-key-assets")
        declared = {item["path"]: item for item in manifest["files"]}
        for path, item in plan.items():
            if path.startswith(RELEASE_PREFIX) or path == "/ui/index.html":
                record = declared.get(path.removeprefix("/ui/"))
                data = item["file"].read_bytes()
                check("selected local manifest entry " + path, bool(record) and record.get("bytes") == len(data) and record.get("sha256") == sha256(data))
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for result, body in pool.map(compare, list(plan.values())):
                report["resources"].append(result)
                if body is not None:
                    responses[result["path"]] = body
        check("production route matches local entry", responses.get("/ui/") == local_index)
        online_manifest = json.loads(responses.get("/ui/showcase-manifest.json", b"{}"))
        check("online showcase source identity", online_manifest.get("version") == SHOWCASE_VERSION and online_manifest.get("sourceRef") == "v1.3.2" and online_manifest.get("sourceCommit") == SHOWCASE_SOURCE)
        online_entrance = json.loads(responses.get("/ui/homepage-entry-manifest.json", b"{}"))
        check("online homepage component identity", online_entrance.get("kitVersion") == HOMEPAGE_VERSION and online_entrance.get("sourceCommit") == HOMEPAGE_SOURCE and online_entrance.get("packageSha256") == HOMEPAGE_PACKAGE_SHA256)
        home, home_meta = fetch(origin, "/")
        home_inventory = HtmlInventory(home.decode("utf-8"))
        check("homepage SSR contains actual budding component", home_inventory.budding)
        home_paths = sorted({path for ref in home_inventory.refs if (path := site_path(ref, "/", origin)) and path.startswith("/_next/static/") and re.search(r"\.(?:js|css)$", path)})
        check("homepage SSR exposes build resources", bool(home_paths))
        home_paths.sort(key=lambda path: ("home-content" not in path, not path.endswith(".css"), path))
        selected = home_paths[:args.max_home_assets]
        home_plan = [{"path": path, "category": "homepage-build-sample", "root": "dist/client", "file": child_file(dist, path.lstrip("/"))} for path in selected]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for result, _body in pool.map(compare, home_plan):
                report["resources"].append(result)
        report["homepage"] = {"http": home_meta, "ssrBuddingComponent": home_inventory.budding,
                              "referencedBuildResources": len(home_paths), "sampledBuildResources": len(selected),
                              "maximumSample": args.max_home_assets,
                              "pinnedKitVersion": HOMEPAGE_VERSION, "vendorSha256": HOMEPAGE_PACKAGE_SHA256}
    except HttpFailure as error:
        report["issues"].append("Public GET failed")
        report["requestFailure"] = error.metadata
    except Exception as error:
        report["issues"].append("Verification interrupted: " + type(error).__name__)
    failed = [item["path"] for item in report["resources"] if not item["matches"]]
    report["issues"].extend("Resource mismatch: " + path for path in failed)
    report["resources"].sort(key=lambda item: item["path"])
    report["completedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
    report["status"] = "passed" if not report["issues"] else "failed"
    report["summary"] = {"resourceChecks": len(report["resources"]), "matchingResources": len(report["resources"]) - len(failed),
                         "identityAndLocalChecks": len(report["checks"]), "issues": len(report["issues"])}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], **report["summary"]}))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
