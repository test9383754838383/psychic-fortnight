"""Server-side HTML sanitizer using nh3 (Rust-backed, replaces bleach).

Allows a safe subset of formatting tags. Strips script/style/event handlers
and javascript: protocol links. Used on every save to prevent XSS persistence.
"""
import nh3

_ALLOWED_TAGS = {
    "p", "br", "strong", "em", "b", "i", "u", "s",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li",
    "a",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div", "blockquote", "pre", "code",
    "hr",
}

_ALLOWED_ATTRS: dict[str, set[str]] = {
    "a": {"href", "title"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}


def sanitize_html(raw: str) -> str:
    """Sanitize arbitrary HTML: allow safe tags/attrs, strip everything else."""
    if not raw:
        return ""
    return nh3.clean(
        raw,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        link_rel=None,
        # Strip url schemes other than http/https/mailto — blocks javascript:
        url_schemes={"http", "https", "mailto"},
    )
