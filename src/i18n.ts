import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const languages = [
  { code: 'he', label: 'עברית', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
] as const

export type LanguageCode = (typeof languages)[number]['code']

const resources = {
  he: {
    translation: {
      brand: 'Eden Dance',
      language: {
        label: 'בחירת שפה',
      },
      theme: {
        toggle: 'החלפת מצב תצוגה',
      },
      menu: {
        toggle: 'פתיחת תפריט',
        close: 'סגירת תפריט',
        mobileLabel: 'ניווט מובייל',
      },
      nav: {
        classes: 'שיעורים',
        instructors: 'מורים',
        studio: 'סטודיו',
        signup: 'הרשמה',
      },
      hero: {
        eyebrow: 'שיעורי ריקוד וחוויות סטודיו',
        title: 'תנועה שמרגישה מדויקת, חברתית וחיה.',
        body: 'עמוד נחיתה נקי למותג ריקוד, מוכן לתמונות, לקול המותג, למערכת שיעורים ולזרימת הרשמה.',
        primaryCta: 'קביעת שיעור',
        secondaryCta: 'צפייה בשיעורים',
        visual: 'כאן תיכנס תמונת מותג כשתהיה מוכנה.',
      },
      classes: {
        private: {
          title: 'שיעורים פרטיים',
          body: 'טקסט זמני להצעה. החליפו בפרטי הסגנון, הרמה ולוח הזמנים המדויקים.',
        },
        group: {
          title: 'שיעורים קבוצתיים',
          body: 'טקסט זמני להצעה. החליפו בפרטי הסגנון, הרמה ולוח הזמנים המדויקים.',
        },
        events: {
          title: 'סדנאות לאירועים',
          body: 'טקסט זמני להצעה. החליפו בפרטי הסגנון, הרמה ולוח הזמנים המדויקים.',
        },
      },
      signup: {
        title: 'הרשמה לשיעור',
        body: 'הטופס מחובר כבסיס לפרונטאנד. Supabase מוכן לטבלה ולשליחה כאשר דרישות ההרשמה ייסגרו.',
        name: 'שם',
        namePlaceholder: 'השם שלך',
        email: 'אימייל',
        emailPlaceholder: 'you@example.com',
        notes: 'מה מעניין אותך?',
        notesPlaceholder: 'שיעור פרטי, שיעור קבוצתי, הכנה לחתונה...',
        submit: 'שליחת בקשה לשיעור',
        submitting: 'שולח...',
        success: 'הבקשה התקבלה. נחזור אליך בקרוב.',
        error: 'ההרשמה עדיין לא זמינה. בדקו את ערכי סביבת Supabase ואת המיגרציה.',
      },
    },
  },
  en: {
    translation: {
      brand: 'Eden Dance',
      language: {
        label: 'Choose language',
      },
      theme: {
        toggle: 'Toggle theme',
      },
      menu: {
        toggle: 'Toggle menu',
        close: 'Close menu',
        mobileLabel: 'Mobile navigation',
      },
      nav: {
        classes: 'Classes',
        instructors: 'Instructors',
        studio: 'Studio',
        signup: 'Signup',
      },
      hero: {
        eyebrow: 'Dance lessons and studio experiences',
        title: 'Movement that feels precise, social, and alive.',
        body: 'A clean starter landing page for a dance brand, ready for your photos, voice, class schedule, and lesson signup flow.',
        primaryCta: 'Book a lesson',
        secondaryCta: 'View classes',
        visual: 'Replace this visual block with brand photography when the materials arrive.',
      },
      classes: {
        private: {
          title: 'Private lessons',
          body: 'Placeholder copy for the offer. Swap this with the exact style, level, and schedule details.',
        },
        group: {
          title: 'Group classes',
          body: 'Placeholder copy for the offer. Swap this with the exact style, level, and schedule details.',
        },
        events: {
          title: 'Event workshops',
          body: 'Placeholder copy for the offer. Swap this with the exact style, level, and schedule details.',
        },
      },
      signup: {
        title: 'Lesson signup',
        body: 'This form is wired as a frontend placeholder. Supabase is ready for the eventual table and submit action once the signup requirements are final.',
        name: 'Name',
        namePlaceholder: 'Your name',
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        notes: 'What are you looking for?',
        notesPlaceholder: 'Private lesson, group class, wedding prep...',
        submit: 'Request a lesson',
        submitting: 'Sending...',
        success: 'Request received. We will follow up soon.',
        error: 'Signup is not available yet. Check the local Supabase env values and migration.',
      },
    },
  },
  ru: {
    translation: {
      brand: 'Eden Dance',
      language: {
        label: 'Выбрать язык',
      },
      theme: {
        toggle: 'Переключить тему',
      },
      menu: {
        toggle: 'Открыть меню',
        close: 'Закрыть меню',
        mobileLabel: 'Мобильная навигация',
      },
      nav: {
        classes: 'Занятия',
        instructors: 'Преподаватели',
        studio: 'Студия',
        signup: 'Запись',
      },
      hero: {
        eyebrow: 'Уроки танцев и студийные форматы',
        title: 'Движение, которое ощущается точным, живым и социальным.',
        body: 'Чистая стартовая страница для танцевального бренда, готовая к вашим фото, голосу бренда, расписанию и форме записи.',
        primaryCta: 'Записаться на урок',
        secondaryCta: 'Смотреть занятия',
        visual: 'Замените этот блок фирменной фотографией, когда материалы будут готовы.',
      },
      classes: {
        private: {
          title: 'Индивидуальные уроки',
          body: 'Временный текст для предложения. Замените его точными деталями стиля, уровня и расписания.',
        },
        group: {
          title: 'Групповые занятия',
          body: 'Временный текст для предложения. Замените его точными деталями стиля, уровня и расписания.',
        },
        events: {
          title: 'Мастер-классы для событий',
          body: 'Временный текст для предложения. Замените его точными деталями стиля, уровня и расписания.',
        },
      },
      signup: {
        title: 'Запись на урок',
        body: 'Форма подключена как фронтенд-заготовка. Supabase готов к таблице и отправке после финализации требований к записи.',
        name: 'Имя',
        namePlaceholder: 'Ваше имя',
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        notes: 'Что вас интересует?',
        notesPlaceholder: 'Индивидуальный урок, группа, подготовка к свадьбе...',
        submit: 'Отправить заявку',
        submitting: 'Отправка...',
        success: 'Заявка получена. Мы скоро свяжемся с вами.',
        error: 'Запись пока недоступна. Проверьте переменные Supabase и миграцию.',
      },
    },
  },
} as const

function getLanguageDirection(language: string) {
  return languages.find((item) => item.code === language.split('-')[0])?.dir ?? 'rtl'
}

function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') return

  const languageCode = language.split('-')[0]
  document.documentElement.lang = languageCode
  document.documentElement.dir = getLanguageDirection(languageCode)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'he',
    supportedLngs: languages.map((language) => language.code),
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'eden-language',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

i18n.on('languageChanged', syncDocumentLanguage)
syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'he')

export default i18n
