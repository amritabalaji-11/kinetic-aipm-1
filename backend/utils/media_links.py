"""Swaps private gs:// addresses in API responses for temporary viewing links.

Applied to every JSON response by one middleware in main.py, so a route can keep returning the
address it stored (gs://...) and the browser still gets something it can open."""
import re

from utils.gcs import GS_PREFIX, sign_gs_url

# an address ends at a double quote or a backslash (file names may contain spaces)
_GS_PATTERN = re.compile(re.escape(GS_PREFIX) + r'[^"\\]+')


def sign_media_links(text: str) -> str:
    if GS_PREFIX not in text:
        return text
    cache: dict[str, str] = {}

    def swap(match: re.Match) -> str:
        url = match.group(0)
        if url not in cache:
            try:
                cache[url] = sign_gs_url(url)
            except Exception as e:  # never break a response because a link couldn't be made
                print(f"[media] could not sign {url}: {e}")
                cache[url] = url
        return cache[url]

    return _GS_PATTERN.sub(swap, text)
