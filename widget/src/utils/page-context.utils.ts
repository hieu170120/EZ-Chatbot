export interface PageContextPayload {
  pageUrl: string;
  pageTitle?: string;
  pageContent?: string;
}

const MAX_URL_LENGTH = 2_048;
const MAX_TITLE_LENGTH = 300;
const MAX_CONTENT_LENGTH = 12_000;

const CONTENT_ROOT_SELECTOR = "main, article, [role='main']";
const EXCLUDED_ELEMENT_SELECTOR = [
  "script",
  "style",
  "noscript",
  "iframe",
  "form",
  "input",
  "textarea",
  "select",
  "option",
  "button",
  "template",
  "svg",
  "canvas",
  "nav",
  "footer",
  "aside",
  "[hidden]",
  "[aria-hidden='true']",
  "[contenteditable]:not([contenteditable='false'])",
  "[data-ez-chat-ignore]",
  "#ez-chat-widget-host",
].join(",");

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIGCAPTION",
  "FIGURE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
]);

const replaceControlCharacters = (value: string): string =>
  Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    const isUnsafeControl =
      code <= 8 ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127;
    return isUnsafeControl ? " " : character;
  }).join("");

const normalizeInlineText = (value: string): string =>
  replaceControlCharacters(value).replace(/\s+/g, " ").trim();

const normalizeExtractedText = (value: string): string =>
  value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const truncate = (value: string, limit: number): string =>
  value.length <= limit ? value : value.slice(0, limit).trimEnd();

const normalizePageUrl = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";

    const normalized = url.toString();
    return normalized.length <= MAX_URL_LENGTH ? normalized : null;
  } catch {
    return null;
  }
};

const getContentRoots = (doc: Document): HTMLElement[] => {
  const candidates = Array.from(
    doc.querySelectorAll<HTMLElement>(CONTENT_ROOT_SELECTOR),
  );
  const topLevelCandidates = candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) => other !== candidate && other.contains(candidate),
      ),
  );

  if (topLevelCandidates.length > 0) return topLevelCandidates;
  return doc.body ? [doc.body] : [];
};

const extractVisibleText = (doc: Document): string => {
  const view = doc.defaultView;
  const excludedCache = new WeakMap<Element, boolean>();

  const isExcluded = (element: Element | null): boolean => {
    if (!element) return false;
    const cached = excludedCache.get(element);
    if (cached !== undefined) return cached;

    const parentExcluded = isExcluded(element.parentElement);
    if (parentExcluded || element.matches(EXCLUDED_ELEMENT_SELECTOR)) {
      excludedCache.set(element, true);
      return true;
    }

    if (view) {
      const style = view.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        style.contentVisibility === "hidden"
      ) {
        excludedCache.set(element, true);
        return true;
      }
    }

    excludedCache.set(element, false);
    return false;
  };

  const sections: string[] = [];
  let collectedLength = 0;

  for (const root of getContentRoots(doc)) {
    if (isExcluded(root)) continue;

    const parts: string[] = [];
    const walker = doc.createTreeWalker(root, view?.NodeFilter.SHOW_TEXT ?? 4);
    let node = walker.nextNode();

    while (node && collectedLength < MAX_CONTENT_LENGTH) {
      const parent = node.parentElement;
      if (!isExcluded(parent)) {
        const text = normalizeInlineText(node.textContent ?? "");
        if (text) {
          if (parent && BLOCK_TAGS.has(parent.tagName) && parts.length > 0) {
            parts.push("\n");
          }
          parts.push(text, " ");
          collectedLength += text.length + 1;
        }
      }
      node = walker.nextNode();
    }

    const section = normalizeExtractedText(parts.join(""));
    if (section) sections.push(section);
    if (collectedLength >= MAX_CONTENT_LENGTH) break;
  }

  return truncate(
    normalizeExtractedText(sections.join("\n\n")),
    MAX_CONTENT_LENGTH,
  );
};

export const collectCurrentPageContext = (
  doc: Document = document,
  rawUrl: string = window.location.href,
): PageContextPayload | undefined => {
  try {
    const pageUrl = normalizePageUrl(rawUrl);
    if (!pageUrl) return undefined;

    const title = truncate(
      normalizeInlineText(doc.title ?? ""),
      MAX_TITLE_LENGTH,
    );
    const content = extractVisibleText(doc);

    return {
      pageUrl,
      ...(title ? { pageTitle: title } : {}),
      ...(content ? { pageContent: content } : {}),
    };
  } catch {
    return undefined;
  }
};
