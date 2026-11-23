"use client";

import { useActionState } from "react";
import { changeAdminPassword, type ChangePasswordState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";

const initial: ChangePasswordState = { message: "" };

export function ChangePasswordForm() {
  const [state, action] = useActionState(changeAdminPassword, initial);
  return (
    <form action={action} className="grid gap-4">
      {state.message ? (
        <p className={`rounded-2xl px-4 py-3 text-sm ${state.ok ? "bg-sky-50 text-[#17315c]" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
      <Field label="Текущий пароль">
        <Input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={controlClass}
        />
      </Field>
      <Field label="Новый пароль" hint="Не короче 3 символов.">
        <Input
          name="newPassword"
          type="password"
          required
          minLength={3}
          maxLength={72}
          autoComplete="new-password"
          className={controlClass}
        />
      </Field>
      <Field label="Повторите новый пароль">
        <Input
          name="confirmPassword"
          type="password"
          required
          minLength={3}
          maxLength={72}
          autoComplete="new-password"
          className={controlClass}
        />
      </Field>
      <SubmitButton pendingLabel="Сохраняем…">Сменить пароль</SubmitButton>
    </form>
  );
}
