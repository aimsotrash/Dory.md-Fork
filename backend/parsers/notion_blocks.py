"""
Convert Notion API block objects to markdown text.
Handles the most common block types needed for knowledge ingestion.
"""


def blocks_to_markdown(blocks: list[dict]) -> str:
    lines: list[str] = []
    for block in blocks:
        btype = block.get("type", "")
        data = block.get(btype, {})
        rich_text = data.get("rich_text", [])
        text = "".join(rt.get("plain_text", "") for rt in rich_text)

        if btype == "paragraph":
            lines.append(text)
        elif btype == "heading_1":
            lines.append(f"# {text}")
        elif btype == "heading_2":
            lines.append(f"## {text}")
        elif btype == "heading_3":
            lines.append(f"### {text}")
        elif btype == "bulleted_list_item":
            lines.append(f"- {text}")
        elif btype == "numbered_list_item":
            lines.append(f"1. {text}")
        elif btype == "to_do":
            checked = data.get("checked", False)
            lines.append(f"- [{'x' if checked else ' '}] {text}")
        elif btype == "code":
            lang = data.get("language", "")
            lines.append(f"```{lang}\n{text}\n```")
        elif btype == "quote":
            lines.append(f"> {text}")
        elif btype == "callout":
            lines.append(f"> **Note:** {text}")
        elif btype == "divider":
            lines.append("---")
        elif btype == "equation":
            lines.append(f"$${data.get('expression', '')}$$")
        # child_page / child_database / unsupported types: skip

    return "\n\n".join(line for line in lines if line.strip())
