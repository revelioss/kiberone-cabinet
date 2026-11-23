"use client";

import { useActionState } from "react";
import { syncNow } from "@/lib/actions/sync";
import { SubmitButton } from "@/components/submit-button";

export function SyncForm({ studentId, label = "Синхронизировать сейчас" }: { studentId?: string; label?: string }) {
  const [state, action] = useActionState(syncNow, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      {studentId ? <input type="hidden" name="studentId" value={studentId} /> : null}
      <SubmitButton pendingLabel="Синхронизируем…">{label}</SubmitButton>
      {state.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}
    </form>
  );
}
