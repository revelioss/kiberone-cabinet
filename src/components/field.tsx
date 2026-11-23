import { Label } from "@/components/ui/label";

export const controlClass =
  "h-11 rounded-xl border-input bg-white px-3 text-base shadow-none md:text-base";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label className={`grid gap-1.5 text-sm text-[#17315c] ${className ?? ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 font-normal text-muted-foreground">{hint}</span> : null}
    </Label>
  );
}
