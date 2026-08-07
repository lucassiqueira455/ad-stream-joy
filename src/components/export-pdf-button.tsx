import { Printer } from "lucide-react";

export function ExportPdfButton({
  label = "Gerar PDF",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent print:hidden ${className}`}
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
