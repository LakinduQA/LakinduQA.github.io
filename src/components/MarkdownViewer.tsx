import { Fragment, type ReactNode } from "react";

function inline(value: string): ReactNode[] {
  const tokens = value.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const external = link[2].startsWith("http");
      return <a key={`${token}-${index}`} href={link[2]} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{link[1]}</a>;
    }
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={`${token}-${index}`}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={`${token}-${index}`}>{token.slice(1, -1)}</code>;
    return <Fragment key={`${token}-${index}`}>{token}</Fragment>;
  });
}

export function MarkdownViewer({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2]);
      blocks.push(level === 1 ? <h1 key={index}>{content}</h1> : level === 2 ? <h2 key={index}>{content}</h2> : <h3 key={index}>{content}</h3>);
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) { items.push(lines[index].trim().slice(2)); index += 1; }
      blocks.push(<ul key={`list-${index}`}>{items.map((item) => <li key={item}>{inline(item)}</li>)}</ul>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current || /^(#{1,3})\s+/.test(current) || current.startsWith("- ")) break;
      paragraph.push(current);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{inline(paragraph.join(" "))}</p>);
  }
  return <article className="markdown-viewer">{blocks}</article>;
}
