import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "uz" | "ru" | "en";

type Dict = {
  search: string;
  searchPh: string;
  searchEmpty: string;
  searchTests: string;
  searchGroups: string;
  searchUsers: string;
  leaderboard: string;
  leaderboardTitle: string;
  leaderboardSub: string;
  rank: string;
  user: string;
  attempts: string;
  avg: string;
  language: string;
  chat: string;
  send: string;
  messagePh: string;
  noMessages: string;
  announcements: string;
  announcement: string;
  newAnnouncement: string;
  title: string;
  body: string;
  post: string;
  noAnnouncements: string;
  groupStats: string;
  attemptsByDay: string;
  reviews: string;
  rating: string;
  writeReview: string;
  yourRating: string;
  reviewPh: string;
  submit: string;
  noReviews: string;
  exportCsv: string;
  exportPdf: string;
  reviewSaved: string;
};

const dicts: Record<Lang, Dict> = {
  uz: {
    search: "Qidirish",
    searchPh: "Test, guruh yoki foydalanuvchi…",
    searchEmpty: "Hech narsa topilmadi",
    searchTests: "Testlar",
    searchGroups: "Guruhlar",
    searchUsers: "Foydalanuvchilar",
    leaderboard: "Reyting",
    leaderboardTitle: "Yetakchilar jadvali",
    leaderboardSub: "Eng faol va eng yuqori natijali foydalanuvchilar",
    rank: "O'rin",
    user: "Foydalanuvchi",
    attempts: "Urinishlar",
    avg: "O'rtacha %",
    language: "Til",
    chat: "Chat",
    send: "Yuborish",
    messagePh: "Xabar yozing…",
    noMessages: "Hali xabarlar yo'q",
    announcements: "E'lonlar",
    announcement: "E'lon",
    newAnnouncement: "Yangi e'lon",
    title: "Sarlavha",
    body: "Matn",
    post: "Joylash",
    noAnnouncements: "E'lonlar yo'q",
    groupStats: "Statistika",
    attemptsByDay: "Kunlar bo'yicha urinishlar",
    reviews: "Sharhlar",
    rating: "Baho",
    writeReview: "Sharh yozish",
    yourRating: "Sizning bahoyingiz",
    reviewPh: "Test haqida fikringiz…",
    submit: "Yuborish",
    noReviews: "Hali sharhlar yo'q",
    exportCsv: "CSV export",
    exportPdf: "PDF export",
    reviewSaved: "Sharh saqlandi",
  },
  ru: {
    search: "Поиск",
    searchPh: "Тест, группа или пользователь…",
    searchEmpty: "Ничего не найдено",
    searchTests: "Тесты",
    searchGroups: "Группы",
    searchUsers: "Пользователи",
    leaderboard: "Рейтинг",
    leaderboardTitle: "Таблица лидеров",
    leaderboardSub: "Самые активные и результативные пользователи",
    rank: "Место",
    user: "Пользователь",
    attempts: "Попытки",
    avg: "Средний %",
    language: "Язык",
    chat: "Чат",
    send: "Отправить",
    messagePh: "Напишите сообщение…",
    noMessages: "Сообщений пока нет",
    announcements: "Объявления",
    announcement: "Объявление",
    newAnnouncement: "Новое объявление",
    title: "Заголовок",
    body: "Текст",
    post: "Опубликовать",
    noAnnouncements: "Объявлений нет",
    groupStats: "Статистика",
    attemptsByDay: "Попытки по дням",
    reviews: "Отзывы",
    rating: "Оценка",
    writeReview: "Написать отзыв",
    yourRating: "Ваша оценка",
    reviewPh: "Ваше мнение о тесте…",
    submit: "Отправить",
    noReviews: "Отзывов пока нет",
    exportCsv: "Экспорт CSV",
    exportPdf: "Экспорт PDF",
    reviewSaved: "Отзыв сохранён",
  },
  en: {
    search: "Search",
    searchPh: "Test, group or user…",
    searchEmpty: "Nothing found",
    searchTests: "Tests",
    searchGroups: "Groups",
    searchUsers: "Users",
    leaderboard: "Leaderboard",
    leaderboardTitle: "Global Leaderboard",
    leaderboardSub: "Most active and highest scoring users",
    rank: "Rank",
    user: "User",
    attempts: "Attempts",
    avg: "Avg %",
    language: "Language",
    chat: "Chat",
    send: "Send",
    messagePh: "Type a message…",
    noMessages: "No messages yet",
    announcements: "Announcements",
    announcement: "Announcement",
    newAnnouncement: "New announcement",
    title: "Title",
    body: "Body",
    post: "Post",
    noAnnouncements: "No announcements",
    groupStats: "Statistics",
    attemptsByDay: "Attempts by day",
    reviews: "Reviews",
    rating: "Rating",
    writeReview: "Write review",
    yourRating: "Your rating",
    reviewPh: "Your thoughts on this test…",
    submit: "Submit",
    noReviews: "No reviews yet",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    reviewSaved: "Review saved",
  },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; tr: Dict }>({
  lang: "uz",
  setLang: () => {},
  tr: dicts.uz,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang") as Lang | null;
      if (saved && dicts[saved]) setLangState(saved);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  };
  return <Ctx.Provider value={{ lang, setLang, tr: dicts[lang] }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}
