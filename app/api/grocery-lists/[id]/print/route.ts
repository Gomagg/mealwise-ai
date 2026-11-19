import { currentUser, getList } from "@/lib/store";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) {
    return new Response("Please log in to print this list.", { status: 401, headers: { "content-type": "text/plain" } });
  }
  const list = await getList(user.id, params.id);
  if (!list) return new Response("List not found", { status: 404, headers: { "content-type": "text/plain" } });

  const categories = [...new Set(list.items.map((i) => i.category))];
  const sections = categories
    .map((cat) => {
      const rows = list.items
        .filter((i) => i.category === cat)
        .map(
          (i) => `<tr>
  <td class="check"></td>
  <td>${escape(i.name)}</td>
  <td class="qty">${i.qty} ${escape(i.unit)}</td>
  <td class="cost">${escape(money(i.estimatedCost, list.currency))}</td>
</tr>`
        )
        .join("\n");
      return `<h2>${escape(cat)}</h2><table>${rows}</table>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escape(list.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #14281b; margin: 32px; }
  header { border-bottom: 2px solid #2f6840; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.meta { font-size: 12px; color: #55705f; margin: 0; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #2f6840; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  tr { border-bottom: 1px solid #e4ece5; }
  td { padding: 6px 4px; }
  td.check { width: 18px; }
  td.check::before { content: ""; display: inline-block; width: 12px; height: 12px; border: 1.5px solid #8aa694; border-radius: 3px; }
  td.qty { width: 90px; color: #55705f; }
  td.cost { width: 90px; text-align: right; font-variant-numeric: tabular-nums; }
  .total { margin-top: 24px; display: flex; justify-content: space-between; font-weight: 700; border-top: 2px solid #2f6840; padding-top: 10px; }
  .note { margin-top: 10px; font-size: 11px; color: #7b8f81; }
  .noprint { margin-bottom: 16px; }
  button { background: #2f6840; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
  @media print { .noprint { display: none; } body { margin: 0; } }
</style></head>
<body>
<div class="noprint"><button onclick="window.print()">Print this list</button></div>
<header>
  <h1>${escape(list.title)}</h1>
  <p class="meta">${list.items.length} items · ${escape(list.currency)} · generated ${escape(new Date(list.createdAt).toLocaleDateString("en-GB"))}</p>
</header>
${sections}
<div class="total"><span>Estimated total</span><span>${escape(money(list.estimatedTotal, list.currency))}</span></div>
<p class="note">Prices are planning estimates from a built-in reference table, not live supermarket quotes. Verify in store.</p>
</body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
