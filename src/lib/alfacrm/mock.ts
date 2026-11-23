import { customerHit, type AlfaApi } from "./client";

function shift(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dotted(days: number) {
  const [year, month, day] = shift(days).split("-");
  return `${day}.${month}.${year}`;
}

const subjects = [
  { id: 1, name: "Скретч" },
  { id: 2, name: "Python" },
];

const statuses = [{ id: 1, name: "Учится" }];

const groups = [
  { id: 501, name: "Скретч-1 Гоголя", b_date: shift(-80), e_date: shift(120) },
  { id: 502, name: "Python-старт Стр", b_date: shift(-40), e_date: shift(140) },
];

type Fixture = {
  customer: Record<string, unknown>;
  balance: number;
  bonuses: Record<string, unknown>[];
  memberships: Record<string, unknown>[];
  lessons: Record<string, unknown>[];
  tests: Record<string, unknown>[];
};

function detail(lessonId: number, customerId: number, attend: number, bonus = 0) {
  return { id: lessonId * 10 + customerId, customer_id: customerId, is_attend: attend, bonus, note: "" };
}

const sharedLessons: Record<string, unknown>[] = [
  {
    id: 7101,
    status: 3,
    topic: "Знакомство со Скретчем",
    subject_id: 1,
    date: shift(-70),
    time_from: "15:00:00",
    time_to: "16:30:00",
    group_ids: [501],
    customer_ids: [9001, 9002],
    homework: "Нарисовать кота и заставить его мяукать.",
    details: [detail(7101, 9001, 1, 40), detail(7101, 9002, 1, 30)],
  },
  {
    id: 7102,
    status: 3,
    topic: "Циклы и повторения",
    subject_id: 1,
    date: shift(-56),
    time_from: "15:00:00",
    time_to: "16:30:00",
    group_ids: [501],
    customer_ids: [9001, 9002],
    homework: "Собрать гонку с циклом на 20 кругов.",
    details: [detail(7102, 9001, 1, 30), detail(7102, 9002, 1, 20)],
  },
  {
    id: 7103,
    status: 3,
    topic: "Игра «Ловец звёзд»",
    subject_id: 1,
    date: shift(-42),
    time_from: "15:00:00",
    time_to: "16:30:00",
    group_ids: [501],
    customer_ids: [9001, 9002],
    homework: "Доделать спрайт звезды.",
    details: [detail(7103, 9001, 0, 0), detail(7103, 9002, 1, 28)],
  },
  {
    id: 7104,
    status: 3,
    topic: "Лабиринт",
    subject_id: 1,
    date: shift(-21),
    time_from: "15:00:00",
    time_to: "16:30:00",
    group_ids: [501],
    customer_ids: [9001, 9002],
    homework: "Нарисовать лабиринт из 6 комнат.",
    details: [detail(7104, 9001, 1, 25), detail(7104, 9002, 0, 0)],
  },
  {
    id: 7105,
    status: 3,
    topic: "Проект «Космический кот»",
    subject_id: 1,
    date: shift(-7),
    time_from: "15:00:00",
    time_to: "16:30:00",
    group_ids: [501],
    customer_ids: [9001, 9002],
    homework: "Показать проект дома и записать, что улучшить.",
    details: [detail(7105, 9001, 1, 40), detail(7105, 9002, 1, 30)],
  },
  {
    id: 7106,
    status: 1,
    topic: "Координаты и движение",
    subject_id: 1,
    date: shift(3),
    time_from: "15:00:00",
    time_to: "16:30:00",
    group_ids: [501],
    customer_ids: [],
    homework: "",
    details: [],
  },
  {
    id: 7301,
    status: 3,
    topic: "Первая программа",
    subject_id: 2,
    date: shift(-30),
    time_from: "11:00:00",
    time_to: "12:30:00",
    group_ids: [502],
    customer_ids: [9003],
    homework: "Написать программу, которая спрашивает имя.",
    details: [detail(7301, 9003, 1, 24)],
  },
  {
    id: 7302,
    status: 3,
    topic: "Переменные",
    subject_id: 2,
    date: shift(-16),
    time_from: "11:00:00",
    time_to: "12:30:00",
    group_ids: [502],
    customer_ids: [9003],
    homework: "",
    details: [detail(7302, 9003, 1, 20)],
  },
  {
    id: 7303,
    status: 2,
    topic: "Черепашка рисует дом",
    subject_id: 2,
    date: shift(-4),
    time_from: "11:00:00",
    time_to: "12:30:00",
    group_ids: [502],
    customer_ids: [9003],
    homework: "",
    details: [],
  },
  {
    id: 7304,
    status: 1,
    topic: "Условия if",
    subject_id: 2,
    date: shift(5),
    time_from: "11:00:00",
    time_to: "12:30:00",
    group_ids: [502],
    customer_ids: [],
    homework: "",
    details: [],
  },
];

const fixtures = new Map<number, Fixture>([
  [
    9001,
    {
      customer: { id: 9001, name: "Алиса Норд", is_study: 1, study_status_id: 1, balance_bonus: 146 },
      balance: 146,
      bonuses: [
        { id: 1, customer_id: 9001, amount: 40, date: dotted(-70), note: "Знакомство со Скретчем", balance_bonus: 40 },
        { id: 2, customer_id: 9001, amount: 30, date: dotted(-56), note: "Циклы и повторения", balance_bonus: 70 },
        { id: 3, customer_id: 9001, amount: 36, date: dotted(-42), note: "Игра «Ловец звёзд»", balance_bonus: 106 },
        { id: 4, customer_id: 9001, amount: 25, type: 1, date: dotted(-28), note: "Магазин: набор стикеров", balance_bonus: 81 },
        { id: 5, customer_id: 9001, amount: 25, date: dotted(-14), note: "Помощь на занятии", balance_bonus: 106 },
        { id: 6, customer_id: 9001, amount: 40, date: dotted(-7), note: "Проект «Космический кот»", balance_bonus: 146 },
      ],
      memberships: [{ id: 1, customer_id: 9001, group_id: 501, b_date: shift(-80), e_date: shift(120) }],
      lessons: [],
      tests: [
        { id: 8101, customer_id: 9001, name: "Скретч: циклы", score: 18, max_score: 20, date: shift(-20), comment: "Уверенно собирает цикл." },
        { id: 8102, customer_id: 9001, name: "Скретч: события", score: 14, max_score: 20, date: shift(-48), comment: "Повторить блоки «когда клавиша нажата»." },
      ],
    },
  ],
  [
    9002,
    {
      customer: { id: 9002, name: "Тимур Бек", is_study: 1, study_status_id: 1, balance_bonus: 98 },
      balance: 98,
      bonuses: [
        { id: 11, customer_id: 9002, amount: 30, date: dotted(-60), note: "Первый проект", balance_bonus: 30 },
        { id: 12, customer_id: 9002, amount: 28, date: dotted(-40), note: "Лабиринт", balance_bonus: 58 },
        { id: 13, customer_id: 9002, amount: 20, date: dotted(-21), note: "Аккуратная работа на уроке", balance_bonus: 78 },
        { id: 14, customer_id: 9002, amount: 10, type: 2, date: dotted(-12), note: "Магазин: значок", balance_bonus: 68 },
        { id: 15, customer_id: 9002, amount: 30, date: dotted(-5), note: "Диалоги персонажей", balance_bonus: 98 },
      ],
      memberships: [{ id: 2, customer_id: 9002, group_id: 501, b_date: shift(-70), e_date: shift(120) }],
      lessons: [],
      tests: [
        { id: 8201, customer_id: 9002, name: "Скретч: циклы", score: 16, max_score: 20, date: shift(-19), comment: "Хорошо, иногда путает вложенность." },
      ],
    },
  ],
  [
    9003,
    {
      customer: { id: 9003, name: "Мира Орын", is_study: 1, study_status_id: 1, balance_bonus: 64 },
      balance: 64,
      bonuses: [
        { id: 21, customer_id: 9003, amount: 24, date: dotted(-30), note: "Первая программа на Python", balance_bonus: 24 },
        { id: 22, customer_id: 9003, amount: 20, date: dotted(-16), note: "Переменные", balance_bonus: 44 },
        { id: 23, customer_id: 9003, amount: 20, date: dotted(-4), note: "Черепашка нарисовала дом", balance_bonus: 64 },
      ],
      memberships: [{ id: 3, customer_id: 9003, group_id: 502, b_date: shift(-40), e_date: shift(140) }],
      lessons: [],
      tests: [
        { id: 8301, customer_id: 9003, name: "Python: print и переменные", score: 9, max_score: 10, date: shift(-10), comment: "Почти без ошибок." },
      ],
    },
  ],
]);

function envelope(items: Record<string, unknown>[]) {
  return { total: items.length, count: items.length, page: 0, items };
}

export class MockAlfaApi implements AlfaApi {
  mode = "mock" as const;

  async fetchCustomer(id: number) {
    return fixtures.get(id)?.customer ?? null;
  }

  async searchCustomers(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    if (/^\d+$/.test(trimmed)) {
      const customer = await this.fetchCustomer(Number(trimmed));
      return customer ? [customerHit(customer)] : [];
    }
    const needle = trimmed.toLowerCase();
    const hits = [];
    for (const fixture of fixtures.values()) {
      const name = String(fixture.customer.name ?? "").toLowerCase();
      if (name.includes(needle)) hits.push(customerHit(fixture.customer));
    }
    return hits.slice(0, 20);
  }

  async fetchBonusBalance(id: number) {
    const fixture = fixtures.get(id);
    if (!fixture) return { customer_id: id, balance_bonus: 0 };
    return { customer_id: id, balance_bonus: fixture.balance };
  }

  async fetchBonusHistory(id: number) {
    return { supported: true, items: fixtures.get(id)?.bonuses ?? [] };
  }

  async fetchMemberships(id: number) {
    return fixtures.get(id)?.memberships ?? [];
  }

  async fetchGroups(ids: number[]) {
    return groups.filter((group) => ids.includes(group.id));
  }

  async fetchLessons(filter: Record<string, unknown>) {
    const status = Number(filter.status);
    const customerId = filter.customer_id == null ? null : Number(filter.customer_id);
    const groupId = filter.group_id == null ? null : Number(filter.group_id);
    const memberGroups = customerId == null
      ? []
      : (fixtures.get(customerId)?.memberships ?? []).map((item) => Number(item.group_id));
    return sharedLessons.filter((lesson) => {
      if (Number(lesson.status) !== status) return false;
      const lessonGroups = Array.isArray(lesson.group_ids) ? lesson.group_ids.map(Number) : [];
      if (groupId != null && !lessonGroups.includes(groupId)) return false;
      if (customerId != null) {
        const customers = Array.isArray(lesson.customer_ids) ? lesson.customer_ids.map(Number) : [];
        const details = Array.isArray(lesson.details) ? lesson.details : [];
        const inDetails = details.some((item) => Number((item as { customer_id?: number }).customer_id) === customerId);
        const inGroup = lessonGroups.some((id) => memberGroups.includes(id));
        if (!customers.includes(customerId) && !inDetails && !inGroup) return false;
      }
      return true;
    });
  }

  async fetchSubjects() {
    return subjects;
  }

  async fetchStudyStatuses() {
    return statuses;
  }

  async fetchTests(id: number) {
    return { supported: true, items: fixtures.get(id)?.tests ?? [] };
  }
}

export function mockIndexShape() {
  const fixture = fixtures.get(9001);
  return {
    balance: { customer_id: 9001, balance_bonus: fixture?.balance ?? 0 },
    history: envelope(fixture?.bonuses ?? []),
  };
}
