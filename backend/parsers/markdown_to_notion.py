"""
Convert a subset of Markdown to Notion block objects.

Supports: h1/h2/h3, bold/italic inline, bullet list, numbered list,
code blocks, blockquote, horizontal rule, and plain paragraphs.
Inline formatting (bold/italic) is handled via rich_text annotations.
"""

import re
from typing import Any


def _rich_text(raw: str) -> list[dict]:
    """Parse **bold** and *italic* into Notion rich_text segments."""
    tokens: list[dict] = []
    # Split on bold (**...**) and italic (*...*)
    pattern = r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)'
    parts = re.split(pattern, raw)
    for part in parts:
        if not part:
            continue
        if part.startswith('**') and part.endswith('**'):
            tokens.append({'type': 'text', 'text': {'content': part[2:-2]}, 'annotations': {'bold': True}})
        elif part.startswith('`') and part.endswith('`'):
            tokens.append({'type': 'text', 'text': {'content': part[1:-1]}, 'annotations': {'code': True}})
        elif part.startswith('*') and part.endswith('*'):
            tokens.append({'type': 'text', 'text': {'content': part[1:-1]}, 'annotations': {'italic': True}})
        else:
            tokens.append({'type': 'text', 'text': {'content': part}})
    return tokens or [{'type': 'text', 'text': {'content': raw}}]


def _block(btype: str, content_key: str, rt: list[dict], extra: dict | None = None) -> dict:
    inner: dict[str, Any] = {'rich_text': rt}
    if extra:
        inner.update(extra)
    return {'object': 'block', 'type': btype, btype: inner}


def markdown_to_notion_blocks(md: str) -> list[dict]:
    blocks: list[dict] = []
    lines = md.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i]

        # Fenced code block
        if line.startswith('```'):
            lang = line[3:].strip() or 'plain text'
            code_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            blocks.append({
                'object': 'block', 'type': 'code',
                'code': {
                    'rich_text': [{'type': 'text', 'text': {'content': '\n'.join(code_lines)}}],
                    'language': lang,
                }
            })
            i += 1
            continue

        # Headings
        if line.startswith('### '):
            blocks.append(_block('heading_3', 'heading_3', _rich_text(line[4:])))
        elif line.startswith('## '):
            blocks.append(_block('heading_2', 'heading_2', _rich_text(line[3:])))
        elif line.startswith('# '):
            blocks.append(_block('heading_1', 'heading_1', _rich_text(line[2:])))

        # Blockquote
        elif line.startswith('> '):
            blocks.append(_block('quote', 'quote', _rich_text(line[2:])))

        # Bullet list
        elif re.match(r'^[-*+] ', line):
            blocks.append(_block('bulleted_list_item', 'bulleted_list_item', _rich_text(line[2:])))

        # Numbered list
        elif re.match(r'^\d+\. ', line):
            text = re.sub(r'^\d+\. ', '', line)
            blocks.append(_block('numbered_list_item', 'numbered_list_item', _rich_text(text)))

        # Horizontal rule
        elif re.match(r'^-{3,}$|^\*{3,}$', line.strip()):
            blocks.append({'object': 'block', 'type': 'divider', 'divider': {}})

        # Non-empty paragraph
        elif line.strip():
            blocks.append(_block('paragraph', 'paragraph', _rich_text(line)))

        i += 1

    return blocks
