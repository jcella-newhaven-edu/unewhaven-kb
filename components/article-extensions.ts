import { Node, mergeAttributes } from "@tiptap/core";
import { validArticleImageSrc } from "@/lib/article-media";

export const ArticleImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: { default: null }, alt: { default: "" } };
  },

  parseHTML() {
    return [{
      tag: "img[src]",
      getAttrs: (element) => validArticleImageSrc(element.getAttribute("src")) ? null : false,
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { referrerpolicy: "no-referrer" })];
  },
});

export const ArticleTabs = Node.create({
  name: "articleTabs",
  group: "block",
  content: "articleTab{2,8}",
  isolating: true,

  parseHTML() {
    return [{ tag: "section[data-article-tabs]" }];
  },

  renderHTML() {
    return ["section", { "data-article-tabs": "" }, 0];
  },
});

export const ArticleTab = Node.create({
  name: "articleTab",
  content: "block+",
  isolating: true,

  addAttributes() {
    return {
      label: {
        default: "Tab",
        parseHTML: (element) => element.getAttribute("data-label") || "Tab",
        renderHTML: ({ label }) => ({ "data-label": label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-article-tab]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-article-tab": "" }), 0];
  },
});

export const ArticleAccordion = Node.create({
  name: "articleAccordion",
  group: "block",
  content: "articleAccordionItem{1,8}",
  isolating: true,

  parseHTML() {
    return [{ tag: "section[data-article-accordion]" }];
  },

  renderHTML() {
    return ["section", { "data-article-accordion": "" }, 0];
  },
});

export const ArticleAccordionItem = Node.create({
  name: "articleAccordionItem",
  content: "block+",
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: "Section",
        parseHTML: (element) => element.getAttribute("data-title") || "Section",
        renderHTML: ({ title }) => ({ "data-title": title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-article-accordion-item]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-article-accordion-item": "" }), 0];
  },
});
