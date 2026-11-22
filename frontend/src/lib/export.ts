import { api } from "./api";
import type { ExpenseQueryParams } from "./queries";

export type ExportFormat = "xlsx" | "pdf";

/** Fetch an export (with auth header) and trigger a browser download. */
export async function downloadExpensesExport(
  format: ExportFormat,
  filters: Omit<ExpenseQueryParams, "page" | "page_size">,
): Promise<void> {
  const res = await api.get("/expenses/export", {
    params: { ...filters, format },
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition && /filename="?([^"]+)"?/.exec(disposition);
  const filename = match ? match[1] : `spendjot-expenses.${format}`;

  saveBlob(res.data as Blob, filename);
}

/** Download the blank bulk-import .xlsx template. */
export async function downloadImportTemplate(): Promise<void> {
  const res = await api.get("/expenses/import/template", { responseType: "blob" });
  saveBlob(res.data as Blob, "spendjot-import-template.xlsx");
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
