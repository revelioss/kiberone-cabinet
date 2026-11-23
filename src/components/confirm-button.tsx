"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmButton({
  action,
  hidden,
  title,
  description,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  title: string;
  description: string;
  label: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="destructive" size="lg" />}>
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {Object.entries(hidden).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <DialogClose render={<Button type="button" variant="outline" size="lg" />}>Отмена</DialogClose>
          <Button type="submit" variant="destructive" size="lg">
            Удалить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
