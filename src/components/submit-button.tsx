"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  variant = "default",
  pendingLabel = "Сохраняем…",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
