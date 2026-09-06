import { categoryById } from "@/src/lib/categories";
import { blockDurationSeconds, displayDate, formatRange } from "@/src/lib/date";
import { formatDuration } from "@/src/lib/youtube";
import type { Category, DailyPlan, Settings } from "@/src/types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function statusLabel(status: string) {
  if (status === "done") return "Done";
  if (status === "not-done") return "Skipped";
  return "Pending";
}

export async function shareDailyReport(plan: DailyPlan, categories: Category[], settings: Settings) {
  const plannedSeconds = plan.blocks.reduce((sum, block) => sum + blockDurationSeconds(block), 0);
  const doneBlocks = plan.blocks.filter((block) => block.status === "done");
  const completedSeconds = doneBlocks.reduce((sum, block) => sum + Math.max(0, blockDurationSeconds(block) - (block.savedSeconds ?? 0)), 0);
  const resourceCount = plan.blocks.reduce((sum, block) => sum + (block.resourceItems?.length ?? block.resourceItemIds.length), 0);
  const owner = settings.displayName?.trim() || "RoutineOS user";

  const blocks = plan.blocks
    .map((block, index) => {
      const category = categoryById(categories, block.categoryId);
      const resources = block.resourceItems ?? [];
      const duration = blockDurationSeconds(block);
      const taken = block.status === "done" ? Math.max(0, duration - (block.savedSeconds ?? 0)) : 0;
      return `
        <section class="block">
          <div class="block-head">
            <div>
              <div class="index">Block ${index + 1}</div>
              <h2>${escapeHtml(block.title)}</h2>
              <p>${escapeHtml(formatRange(block))} · ${escapeHtml(category.label)}</p>
            </div>
            <span class="status ${block.status}">${statusLabel(block.status)}</span>
          </div>
          <div class="metrics">
            <div><b>${formatDuration(duration)}</b><span>planned</span></div>
            <div><b>${taken ? formatDuration(taken) : "-"}</b><span>time finished</span></div>
            <div><b>${resources.length}</b><span>videos</span></div>
          </div>
          <h3>Goal</h3>
          <p>${escapeHtml(block.goal || "No goal added.")}</p>
          ${block.notes?.trim() ? `<h3>Notes</h3><p>${escapeHtml(block.notes)}</p>` : ""}
          ${resources.length
          ? `<h3>Videos in this block</h3><ol>${resources
            .map((item) => `<li><span>${escapeHtml(item.title)}</span><em>${formatDuration(item.durationSeconds)}</em></li>`)
            .join("")}</ol>`
          : ""
        }
        </section>`;
    })
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { margin: 0; background: #f6f7fb; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          main { padding: 34px; }
          .hero { background: #0b0d10; color: white; border-radius: 26px; padding: 30px; }
          .logo { font-size: 15px; letter-spacing: 3px; text-transform: uppercase; font-weight: 900; color: #38bdf8; }
          h1 { margin: 12px 0 6px; font-size: 36px; }
          .hero p { color: #cbd5e1; margin: 0; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
          .card, .block { background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 18px; }
          .card b { display: block; font-size: 24px; }
          .card span, .metrics span, .index { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: .8px; }
          .block { margin-top: 14px; }
          .block-head { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
          h2 { margin: 4px 0; font-size: 21px; }
          h3 { margin: 14px 0 6px; color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: .8px; }
          p { line-height: 1.5; }
          .status { border-radius: 999px; padding: 7px 11px; font-size: 11px; font-weight: 900; white-space: nowrap; }
          .status.done { background: #dcfce7; color: #15803d; }
          .status.not-done { background: #fef3c7; color: #b45309; }
          .status.pending { background: #e0f2fe; color: #0369a1; }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
          .metrics div { background: #f8fafc; border-radius: 14px; padding: 12px; }
          .metrics b { display: block; margin-bottom: 3px; }
          ol { padding-left: 22px; }
          li { margin: 7px 0; }
          li em { color: #64748b; float: right; font-style: normal; }
        </style>
      </head>
      <body>
        <main>
          <section class="hero">
            <div class="logo">RoutineOS</div>
            <h1>Daily Performance Report</h1>
            <p>${escapeHtml(displayDate(plan.date))} · ${escapeHtml(owner)}</p>
          </section>
          <section class="summary">
            <div class="card"><b>${doneBlocks.length}/${plan.blocks.length}</b><span>blocks done</span></div>
            <div class="card"><b>${formatDuration(plannedSeconds)}</b><span>planned time</span></div>
            <div class="card"><b>${formatDuration(completedSeconds)}</b><span>finished time</span></div>
            <div class="card"><b>${resourceCount}</b><span>videos</span></div>
          </section>
          ${blocks}
        </main>
      </body>
    </html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "RoutineOS daily report" });
    return;
  }
  await Print.printAsync({ html });
}
