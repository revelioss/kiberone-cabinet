"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importCrmStudent, searchCrmCustomers, type AccountState, type CrmSearchState } from "@/lib/actions/students";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";

const searchInitial: CrmSearchState = { message: "", query: "", results: [] };
const importInitial: AccountState = { message: "" };

function ImportResult({ state }: { state: AccountState }) {
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

export function CrmImportForm() {
  const [search, searchAction] = useActionState(searchCrmCustomers, searchInitial);
  const [imported, importAction] = useActionState(importCrmStudent, importInitial);

  return (
    <div className="grid gap-5">
      <ImportResult state={imported} />
      <form action={searchAction} className="grid gap-3">
        <Field
          label="ID или имя в AlfaCRM"
          hint="Кабинет не заводит всех учеников сразу. Найдите одного, проверьте карточку и добавьте. Данные только читаются, в CRM ничего не пишется."
        >
          <Input
            name="query"
            defaultValue={search.query}
            required
            className={controlClass}
            placeholder="ID клиента или фамилия"
            autoCapitalize="none"
          />
        </Field>
        <SubmitButton pendingLabel="Ищем…">Найти</SubmitButton>
        {search.message ? <p className="text-sm text-muted-foreground">{search.message}</p> : null}
      </form>
      {search.results.length > 0 ? (
        <ul className="grid gap-2">
          {search.results.map((hit) => (
            <li key={hit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-sky-50/60 px-4 py-3 ring-1 ring-sky-100">
              <div>
                <p className="font-semibold text-[#17315c]">{hit.name || "Без имени"}</p>
                <p className="text-sm text-muted-foreground">
                  ID {hit.id}
                  {hit.groupName ? ` · ${hit.groupName}` : ""}
                </p>
              </div>
              <form action={importAction}>
                <input type="hidden" name="alfacrmId" value={hit.id} />
                <SubmitButton pendingLabel="Добавляем…">Добавить в кабинет</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
