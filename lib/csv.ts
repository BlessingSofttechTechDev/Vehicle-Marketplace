"use client";

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export function toCSV<T>(
  rows: T[],
  columns: { key: keyof T | string; label: string; format?: (row: T) => unknown }[]
): string {
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => escape(c.format ? c.format(r) : (r as Record<string, unknown>)[c.key as string]))
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadRows<T>(
  filename: string,
  rows: T[],
  columns: { key: keyof T | string; label: string; format?: (row: T) => unknown }[]
) {
  downloadCSV(filename, toCSV(rows, columns));
}
