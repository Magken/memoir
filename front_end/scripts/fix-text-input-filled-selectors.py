import re
from pathlib import Path

p = Path("front_end/src/css/effects/text-input-effects.css")
css = p.read_text(encoding="utf-8")
pat = re.compile(
    r"(\.theme \.theme-text-input-fx--[a-z]+)\[data-filled='true'\], "
    r"\1\.theme-text-input-fx--filled "
    r"((?:\.theme-text-input-fx__[^{]+(?: \.theme-text-input-fx__[^{]+)*))"
)
css, n = pat.subn(
    r"\1[data-filled='true'] \2, \1.theme-text-input-fx--filled \2",
    css,
)
css = css.replace("anim-chisato-1", "theme-text-input-fx-chisato-1").replace(
    "anim-chisato-2", "theme-text-input-fx-chisato-2"
)
p.write_text(css, encoding="utf-8")
print(f"fixed {n} filled selectors")
