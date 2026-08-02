"""Add the project-specific Code only filter to graphify's generated viewer."""

from pathlib import Path


HTML_PATH = Path("graphify-out/graph.html")


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f"Expected one graphify marker, found {text.count(old)}: {old[:80]!r}")
    return text.replace(old, new, 1)


def patch(text: str) -> str:
    text = replace_once(
        text,
        '<label><input type="checkbox" id="select-all-cb" checked onchange="toggleAllCommunities(!this.checked)">Select All</label>',
        '<label><input type="checkbox" id="select-all-cb" checked onchange="toggleAllCommunities(!this.checked)">Select All</label>\n'
        '      <label><input type="checkbox" id="code-only-cb">Code only</label>',
    )
    text = replace_once(
        text,
        "const hiddenCommunities = new Set();",
        "const hiddenCommunities = new Set();\n"
        "const codeOnlyCb = document.getElementById('code-only-cb');\n"
        "function applyNodeVisibility() {\n"
        "  nodesDS.update(RAW_NODES.map(n => ({ id: n.id, hidden: hiddenCommunities.has(n.community) || (codeOnlyCb.checked && n.file_type === 'document') })));\n"
        "}\n"
        "codeOnlyCb.addEventListener('change', applyNodeVisibility);",
    )
    text = replace_once(
        text,
        "  const updates = RAW_NODES.map(n => ({ id: n.id, hidden: hide }));\n  nodesDS.update(updates);",
        "  applyNodeVisibility();",
    )
    text = replace_once(
        text,
        "    const updates = RAW_NODES\n      .filter(n => n.community === c.cid)\n      .map(n => ({ id: n.id, hidden: !cb.checked }));\n    nodesDS.update(updates);",
        "    applyNodeVisibility();",
    )
    return text


def main() -> None:
    if not HTML_PATH.exists():
        raise SystemExit(f"Missing generated graph: {HTML_PATH}")
    text = HTML_PATH.read_text(encoding="utf-8")
    if 'id="code-only-cb"' in text:
        print(f"Already patched: {HTML_PATH}")
        return
    HTML_PATH.write_text(patch(text), encoding="utf-8")
    print(f"Patched: {HTML_PATH}")


if __name__ == "__main__":
    main()
