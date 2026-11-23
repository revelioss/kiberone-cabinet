"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createStudent, importStudents, updateAccount, type AccountState } from "@/lib/actions/students";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";

const initial: AccountState = { message: "" };

function Result({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return (
    <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-[#17315c]">
      <p>{state.message}</p>
      {state.password ? (
        <p className="mt-2 font-semibold">
          Пароль: <span className="font-mono">{state.password}</span>
        </p>
      ) : null}
      {state.studentId ? (
        <Link href={`/admin/students/${state.studentId}`} className={cn(buttonVariants({ size: "lg" }), "mt-3")}>
          Открыть карточку
        </Link>
      ) : null}
    </div>
  );
}

export function CreateStudentForm() {
  const [state, action] = useActionState(createStudent, initial);
  return (
    <form action={action} className="grid gap-4">
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя и фамилия">
          <Input name="fullName" required className={controlClass} placeholder="Алиса Норд" />
        </Field>
        <Field label="Логин" hint="Латиница, без пробелов. Ученик не регистрируется сам.">
          <Input name="login" required autoCapitalize="none" autoCorrect="off" spellCheck={false} className={controlClass} placeholder="alisa" />
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов. Покажите его ученику один раз.">
          <Input name="password" required type="text" className={controlClass} placeholder="не короче 8 символов" />
        </Field>
        <Field label="ID клиента в AlfaCRM" hint="Число из карточки клиента. Без него кибероны не подтянутся.">
          <Input name="alfacrmId" inputMode="numeric" className={controlClass} placeholder="9001" />
        </Field>
        <Field label="Группа" hint="Если пусто, подставится из CRM при синхронизации.">
          <Input name="groupName" className={controlClass} placeholder="Скретч-1" />
        </Field>
        <Field label="Портфолио">
          <Input name="portfolioUrl" type="url" className={controlClass} placeholder="https://" />
        </Field>
        <Field label="Google Диск" className="sm:col-span-2">
          <Input name="driveUrl" type="url" className={controlClass} placeholder="https://drive.google.com/drive/folders/..." />
        </Field>
      </div>
      <SubmitButton>Создать ученика</SubmitButton>
    </form>
  );
}

export function AccountEditor({
  studentId,
  fullName,
  login,
  alfacrmId,
  groupName,
  isActive,
}: {
  studentId: string;
  fullName: string;
  login: string;
  alfacrmId: string;
  groupName: string;
  isActive: boolean;
}) {
  const [state, action] = useActionState(updateAccount, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="studentId" value={studentId} />
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя и фамилия">
          <Input name="fullName" required defaultValue={fullName} className={controlClass} />
        </Field>
        <Field label="Логин">
          <Input name="login" required defaultValue={login} autoCapitalize="none" className={controlClass} />
        </Field>
        <Field label="Новый пароль" hint="Оставьте пустым, если пароль менять не нужно.">
          <Input name="password" type="text" className={controlClass} placeholder="новый пароль" />
        </Field>
        <Field label="ID AlfaCRM">
          <Input name="alfacrmId" defaultValue={alfacrmId} inputMode="numeric" className={controlClass} />
        </Field>
        <Field label="Группа">
          <Input name="groupName" defaultValue={groupName} className={controlClass} />
        </Field>
        <Field label="Аккаунт">
          <span className="flex h-11 items-center gap-2 text-sm font-normal">
            <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-4" />
            Можно входить в кабинет
          </span>
        </Field>
      </div>
      <SubmitButton>Сохранить вход</SubmitButton>
    </form>
  );
}

export function ImportForm() {
  const [state, action] = useActionState(importStudents, initial);
  return (
    <form action={action} className="grid gap-4">
      <Result state={state} />
      <Field label="CSV-файл" hint="Колонки: login, password, fullName, alfacrmId, groupName, portfolioUrl, driveUrl, isActive">
        <Input name="file" type="file" accept=".csv,text/csv" required className={controlClass} />
      </Field>
      <SubmitButton pendingLabel="Загружаем…">Загрузить учеников</SubmitButton>
    </form>
  );
}
