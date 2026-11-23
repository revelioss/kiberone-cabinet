import { notFound } from "next/navigation";
import { AccountEditor } from "@/components/account-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, controlClass } from "@/components/field";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { SyncForm } from "@/components/sync-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAchievement,
  deleteBonus,
  deleteCertificate,
  deleteHomework,
  deleteLesson,
  deleteTest,
  releaseLesson,
  saveAchievement,
  saveBonus,
  saveCertificate,
  saveHomework,
  saveLesson,
  saveTest,
  setBalanceMode,
} from "@/lib/actions/content";
import { deleteStudent, updateLinks, updateRating } from "@/lib/actions/students";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bonusKindLabel, formatAmount, formatDate, lessonStatusLabel, toInputDate } from "@/lib/format";

export const metadata = { title: "Карточка ученика" };

const selectClass = "h-11 w-full rounded-xl border bg-white px-3 text-base";

export default async function StudentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      bonuses: { orderBy: { occurredAt: "desc" } },
      lessons: { orderBy: { occurredOn: "desc" } },
      homework: { orderBy: { createdAt: "desc" } },
      tests: { orderBy: { takenAt: "desc" } },
      certificates: { orderBy: { createdAt: "desc" } },
      achievements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!student) notFound();

  return (
    <div className="grid gap-5">
      <PageTitle title={student.fullName} subtitle={`${student.user.login} · баланс ${formatAmount(student.kiberonBalance)}`} />
      <Notice ok={query.ok} error={query.error} />

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Вход и связь с AlfaCRM</h2>
        <AccountEditor
          studentId={student.id}
          fullName={student.fullName}
          login={student.user.login}
          alfacrmId={student.alfacrmId ? String(student.alfacrmId) : ""}
          groupName={student.groupName}
          isActive={student.user.isActive}
        />
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-1 text-lg font-bold">Синхронизация этого ученика</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {student.syncWarning || "Имя, группа, кибероны и уроки обновятся из CRM, если указан ID клиента."}
        </p>
        <SyncForm studentId={student.id} label="Обновить из AlfaCRM" />
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Портфолио и Google Диск</h2>
        <p className="mb-3 text-sm text-muted-foreground">В AlfaCRM этих ссылок нет, их хранит кабинет.</p>
        <form action={updateLinks} className="grid gap-4">
          <input type="hidden" name="studentId" value={student.id} />
          <Field label="Портфолио">
            <Input name="portfolioUrl" defaultValue={student.portfolioUrl} className={controlClass} />
          </Field>
          <Field label="Ссылка на папку Диска">
            <Input name="driveUrl" defaultValue={student.driveUrl} className={controlClass} />
          </Field>
          <Field label="Подпись папки" hint="Обычно имя ученика.">
            <Input name="driveFolderName" defaultValue={student.driveFolderName} className={controlClass} />
          </Field>
          <SubmitButton>Сохранить ссылки</SubmitButton>
        </form>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Кибероны</h2>
        <form action={setBalanceMode} className="mb-4 grid gap-3">
          <input type="hidden" name="studentId" value={student.id} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="kiberonManualOverride" defaultChecked={student.kiberonManualOverride} />
            Не перезаписывать баланс из CRM
          </label>
          <Field label="Баланс, если включён ручной режим">
            <Input name="kiberonBalance" defaultValue={String(student.kiberonBalance)} className={controlClass} />
          </Field>
          <SubmitButton variant="secondary">Сохранить режим баланса</SubmitButton>
        </form>
        <form action={saveBonus} className="grid gap-3 border-t pt-4 sm:grid-cols-2">
          <input type="hidden" name="studentId" value={student.id} />
          <Field label="Сумма" hint="Минус — списание. Ручная строка не меняет цифру, пока не включён ручной баланс.">
            <Input name="amount" required className={controlClass} placeholder="10 или -5" />
          </Field>
          <Field label="Дата">
            <Input name="occurredAt" type="date" required className={controlClass} />
          </Field>
          <Field label="Вид списания">
            <select name="kind" className={selectClass} defaultValue="spend">
              <option value="spend">Списание</option>
              <option value="commodity">Магазин</option>
              <option value="compensation">Компенсация на счёт</option>
            </select>
          </Field>
          <Field label="Комментарий">
            <Input name="note" className={controlClass} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Добавить операцию</SubmitButton>
          </div>
        </form>
        <ul className="mt-4 grid gap-2">
          {student.bonuses.map((bonus) => (
            <li key={bonus.id} className="flex items-center justify-between gap-3 rounded-2xl bg-sky-50/60 px-3 py-2 text-sm">
              <span>
                {formatDate(bonus.occurredAt)} · {bonus.note || bonusKindLabel(bonus.kind)} · {bonus.source === "CRM" ? "CRM" : "вручную"}
              </span>
              <span className="flex items-center gap-2">
                <strong>{formatAmount(bonus.amount)}</strong>
                {bonus.source === "MANUAL" ? (
                  <ConfirmButton
                    action={deleteBonus}
                    hidden={{ id: bonus.id, studentId: student.id }}
                    title="Удалить операцию?"
                    description="Ручная строка исчезнет из истории ученика."
                    label="Удалить"
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Уроки</h2>
        <details className="mb-3 rounded-2xl bg-sky-50/70 p-3">
          <summary className="cursor-pointer font-medium">Добавить урок вручную</summary>
          <LessonForm studentId={student.id} />
        </details>
        <div className="grid gap-2">
          {student.lessons.map((lesson) => (
            <details key={lesson.id} className="rounded-2xl border p-3">
              <summary className="cursor-pointer">
                {formatDate(lesson.occurredOn)} · {lesson.topic} · {lessonStatusLabel(lesson.status)}
                {lesson.localOverride ? " · правка школы" : ""}
              </summary>
              <LessonForm studentId={student.id} lesson={lesson} />
              <div className="mt-3 flex flex-wrap gap-2">
                {lesson.localOverride ? (
                  <form action={releaseLesson}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="id" value={lesson.id} />
                    <SubmitButton variant="secondary">Снова брать из CRM</SubmitButton>
                  </form>
                ) : null}
                <ConfirmButton
                  action={deleteLesson}
                  hidden={{ id: lesson.id, studentId: student.id }}
                  title="Убрать урок?"
                  description="Ручной урок удалится. Урок из CRM будет скрыт как отменённый, пока вы не вернёте его синхронизации."
                  label="Убрать"
                />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Домашние задания</h2>
        <details className="mb-3 rounded-2xl bg-sky-50/70 p-3">
          <summary className="cursor-pointer font-medium">Новое задание</summary>
          <HomeworkForm studentId={student.id} />
        </details>
        {student.homework.map((item) => (
          <details key={item.id} className="mb-2 rounded-2xl border p-3">
            <summary className="cursor-pointer">{item.title}</summary>
            <HomeworkForm studentId={student.id} item={item} />
            <div className="mt-3">
              <ConfirmButton action={deleteHomework} hidden={{ id: item.id, studentId: student.id }} title="Удалить задание?" description="Если оно пришло с урока, синхронизация может создать его снова." label="Удалить" />
            </div>
          </details>
        ))}
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Тесты</h2>
        <details className="mb-3 rounded-2xl bg-sky-50/70 p-3">
          <summary className="cursor-pointer font-medium">Добавить результат</summary>
          <TestForm studentId={student.id} />
        </details>
        {student.tests.map((item) => (
          <details key={item.id} className="mb-2 rounded-2xl border p-3">
            <summary className="cursor-pointer">{item.title}</summary>
            <TestForm studentId={student.id} item={item} />
            <div className="mt-3">
              <ConfirmButton action={deleteTest} hidden={{ id: item.id, studentId: student.id }} title="Удалить результат?" description="Результат из CRM вернётся при следующей синхронизации." label="Удалить" />
            </div>
          </details>
        ))}
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Грамоты</h2>
        <details className="mb-3 rounded-2xl bg-sky-50/70 p-3">
          <summary className="cursor-pointer font-medium">Загрузить грамоту</summary>
          <FileForm action={saveCertificate} studentId={student.id} titleLabel="Название грамоты" dateName="issuedOn" />
        </details>
        {student.certificates.map((item) => (
          <div key={item.id} className="mb-2 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm">
            <span>{item.title}{item.fileName ? ` · ${item.fileName}` : ""}</span>
            <ConfirmButton action={deleteCertificate} hidden={{ id: item.id, studentId: student.id }} title="Удалить грамоту?" description="Файл тоже будет удалён." label="Удалить" />
          </div>
        ))}
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Достижения</h2>
        <details className="mb-3 rounded-2xl bg-sky-50/70 p-3">
          <summary className="cursor-pointer font-medium">Добавить достижение</summary>
          <FileForm action={saveAchievement} studentId={student.id} titleLabel="Название" dateName="awardedOn" withDescription />
        </details>
        {student.achievements.map((item) => (
          <div key={item.id} className="mb-2 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm">
            <span>{item.title}</span>
            <ConfirmButton action={deleteAchievement} hidden={{ id: item.id, studentId: student.id }} title="Удалить достижение?" description="Карточка и картинка исчезнут из кабинета." label="Удалить" />
          </div>
        ))}
      </section>

      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Рейтинг группы</h2>
        <form action={updateRating} className="grid gap-3">
          <input type="hidden" name="studentId" value={student.id} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ratingEnabled" defaultChecked={student.ratingEnabled} />
            Показывать в рейтинге группы
          </label>
          <Field label="Балл">
            <Input name="ratingScore" defaultValue={student.ratingScore ?? ""} className={controlClass} />
          </Field>
          <SubmitButton>Сохранить рейтинг</SubmitButton>
        </form>
      </section>

      <section className="rounded-[24px] border border-rose-100 bg-rose-50/40 p-4">
        <h2 className="mb-2 text-lg font-bold text-rose-800">Удалить ученика</h2>
        <p className="mb-3 text-sm text-rose-900">Пропадёт вход, кибероны, уроки и файлы этого кабинета. В AlfaCRM карточка клиента не изменится.</p>
        <ConfirmButton
          action={deleteStudent}
          hidden={{ studentId: student.id }}
          title={`Удалить ${student.fullName}?`}
          description="Это нельзя отменить из кабинета."
          label="Удалить ученика"
        />
      </section>
    </div>
  );
}

function LessonForm({
  studentId,
  lesson,
}: {
  studentId: string;
  lesson?: {
    id: string;
    occurredOn: Date;
    timeFrom: string;
    timeTo: string;
    topic: string;
    subject: string;
    groupName: string;
    status: string;
    homeworkText: string;
  };
}) {
  return (
    <form action={saveLesson} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="studentId" value={studentId} />
      {lesson ? <input type="hidden" name="id" value={lesson.id} /> : null}
      <Field label="Дата"><Input type="date" name="occurredOn" required defaultValue={toInputDate(lesson?.occurredOn)} className={controlClass} /></Field>
      <Field label="Статус">
        <select name="status" defaultValue={lesson?.status || "held"} className={selectClass}>
          <option value="planned">Скоро</option>
          <option value="held">Были</option>
          <option value="missed">Не были</option>
          <option value="cancelled">Отменён</option>
          <option value="unknown">Без отметки</option>
        </select>
      </Field>
      <Field label="Начало"><Input name="timeFrom" defaultValue={lesson?.timeFrom} className={controlClass} placeholder="15:00" /></Field>
      <Field label="Конец"><Input name="timeTo" defaultValue={lesson?.timeTo} className={controlClass} placeholder="16:30" /></Field>
      <Field label="Тема" className="sm:col-span-2"><Input name="topic" required defaultValue={lesson?.topic} className={controlClass} /></Field>
      <Field label="Предмет"><Input name="subject" defaultValue={lesson?.subject} className={controlClass} /></Field>
      <Field label="Группа"><Input name="groupName" defaultValue={lesson?.groupName} className={controlClass} /></Field>
      <Field label="Задание с урока" className="sm:col-span-2"><Textarea name="homeworkText" defaultValue={lesson?.homeworkText} /></Field>
      <div className="sm:col-span-2"><SubmitButton>{lesson ? "Сохранить урок" : "Добавить урок"}</SubmitButton></div>
    </form>
  );
}

function HomeworkForm({
  studentId,
  item,
}: {
  studentId: string;
  item?: {
    id: string;
    title: string;
    description: string;
    dueOn: Date | null;
    status: string;
    teacherComment: string;
    grade: string;
  };
}) {
  return (
    <form action={saveHomework} className="mt-3 grid gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Field label="Название"><Input name="title" required defaultValue={item?.title} className={controlClass} /></Field>
      <Field label="Условие"><Textarea name="description" defaultValue={item?.description} /></Field>
      <Field label="Дата"><Input type="date" name="dueOn" defaultValue={toInputDate(item?.dueOn)} className={controlClass} /></Field>
      <Field label="Статус">
        <select name="status" defaultValue={item?.status || "new"} className={selectClass}>
          <option value="new">Нужно сделать</option>
          <option value="submitted">Сдано</option>
          <option value="checked">Проверено</option>
        </select>
      </Field>
      <Field label="Оценка"><Input name="grade" defaultValue={item?.grade} className={controlClass} /></Field>
      <Field label="Комментарий преподавателя"><Textarea name="teacherComment" defaultValue={item?.teacherComment} /></Field>
      <SubmitButton>{item ? "Сохранить задание" : "Добавить задание"}</SubmitButton>
    </form>
  );
}

function TestForm({
  studentId,
  item,
}: {
  studentId: string;
  item?: { id: string; title: string; score: number | null; maxScore: number | null; takenAt: Date; comment: string };
}) {
  return (
    <form action={saveTest} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="studentId" value={studentId} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Field label="Название" className="sm:col-span-2"><Input name="title" required defaultValue={item?.title} className={controlClass} /></Field>
      <Field label="Балл"><Input name="score" defaultValue={item?.score ?? ""} className={controlClass} /></Field>
      <Field label="Максимум"><Input name="maxScore" defaultValue={item?.maxScore ?? ""} className={controlClass} /></Field>
      <Field label="Дата"><Input type="date" name="takenAt" required defaultValue={toInputDate(item?.takenAt)} className={controlClass} /></Field>
      <Field label="Комментарий" className="sm:col-span-2"><Textarea name="comment" defaultValue={item?.comment} /></Field>
      <div className="sm:col-span-2"><SubmitButton>{item ? "Сохранить тест" : "Добавить тест"}</SubmitButton></div>
    </form>
  );
}

function FileForm({
  action,
  studentId,
  titleLabel,
  dateName,
  withDescription = false,
}: {
  action: (formData: FormData) => Promise<void>;
  studentId: string;
  titleLabel: string;
  dateName: string;
  withDescription?: boolean;
}) {
  return (
    <form action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <Field label={titleLabel}><Input name="title" required className={controlClass} /></Field>
      <Field label="Дата"><Input type="date" name={dateName} className={controlClass} /></Field>
      {withDescription ? <Field label="Описание"><Textarea name="description" /></Field> : <Field label="Заметка"><Textarea name="note" /></Field>}
      <Field label="Файл" hint="PDF или картинка, до 8 МБ.">
        <Input name="file" type="file" accept="image/*,.pdf,application/pdf" className={controlClass} />
      </Field>
      <SubmitButton>Сохранить</SubmitButton>
    </form>
  );
}
