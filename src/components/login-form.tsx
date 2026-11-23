"use client";

import { startTransition, useActionState, useState } from "react";
import { login } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/field";

const initial = { message: "", login: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(login, initial);
  const [loginValue, setLoginValue] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setLoginValue(String(data.get("login") || ""));
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="next" value={nextPath} />
      {state.message ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.message}</p> : null}
      <Field label="Логин">
        <Input
          name="login"
          required
          value={loginValue}
          onChange={(event) => setLoginValue(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={controlClass}
        />
      </Field>
      <Field label="Пароль">
        <Input name="password" type="password" required autoComplete="current-password" className={controlClass} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
