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
      brand: '',
      language: { label: 'בחירת שפה' },
      theme: { toggle: 'החלפת מצב תצוגה' },
      menu: {
        toggle: 'פתיחת תפריט',
        close: 'סגירת תפריט',
        mobileLabel: 'ניווט מובייל',
      },
      nav: {
        home: 'בית',
        lessons: 'שיעורים',
        privateLesson: 'תכירו אותי',
        signup: 'הרשמה',
      },
      hero: {
        eyebrow: 'סטודיו לתנועה',
        noLimits: 'עדן דפנה',
        just: 'גורן',
        movement: 'שיעורי ריקוד לבוגרים',
        body: 'משמעת היום. חופש מחר.',
        bookClass: 'להזמין שיעור',
        privateLesson: 'שיעור פרטי',
      },
      lessons: {
        eyebrow: 'השבוע',
        title: 'מערכת שיעורים',
        dayPrefix: 'יום',
        signupCta: 'הרשמה',
        fitCta: 'למי זה מתאים?',
        fit: {
          hipHop: {
            title: 'Hip-Hop',
            body: 'שיעורי היפ הופ לנשים מתאימים לכל מי שרוצה לרקוד, להשתחרר ולהנות במרחב פתוח ומאפשר.\nאין צורך בנסיון קודם. בואי כמו שאת.',
          },
          vogue: {
            title: 'Vogue',
            body: 'שיעור Vogue בסגנון Vogue New Way. בואו נלמד את ארבעת האלמנטים המרכיבים את הסגנון (arms controls, flexibility/tricks, pose, floor performance). נתנסה בטכניקה, פיתוח אימפרוביזציה אישית ונלמד קטעי ריקוד.\nאין צורך בנסיון קודם.',
          },
        },
      },
      about: {
        title: 'תכירו אותי',
        body: 'היי, אני עדן - רקדנית מקצועית ומורה לריקוד\nבעלת נסיון של מעל 14 שנים בהוראת מחול\n\nבוגרת קורס מדריכי היפ-הופ בוינגייט ובוגרת מסלול הכשרת רקדנים באקדמיה למחול\nאני רוקדת במחזות זמר והצגות, מובילה ושופטת בתחויות vogue בארץ\n\nאני מלמדת באווירה מקצועית, פתוחה ומעצימה, עם דגש על ביטחון עצמי, ביטוי אישי והנאה.\nאין צורך בנסיון קודם, השיעורים מתאימים לכל הרמות',
      },
      days: {
        mon: 'שני',
        sun: 'ראשון',
        tue: 'שלישי',
        wed: 'רביעי',
        thu: 'חמישי',
        fri: 'שישי',
        sat: 'שבת',
      },
      locations: {
        ramatGan: 'רמת גן',
        rishonLeZion: 'ראשון לציון',
        nessZiona: 'נס ציונה',
      },
      lessonPeriods: {
        morning: 'בוקר',
        evening: 'ערב',
      },
      privateLesson: {
        quote: 'הריקוד הוא השפה הנסתרת של הנשמה.',
        body: 'שיעור פרטי ממוקד בקצב, טכניקה וביטוי אישי. מתאים להכנה לאירוע, שיפור ביטחון או בניית בסיס חזק יותר.',
        cta: 'להזמין שיעור פרטי',
      },
      signup: {
        eyebrow: 'מתחילים לזוז',
        title: 'הרשמה',
        body: 'השאירו פרטים ונחזור אליכם כדי לתאם שיעור קבוצתי או שיעור פרטי.',
        name: 'שם',
        namePlaceholder: 'השם שלך',
        email: 'אימייל',
        emailPlaceholder: 'you@example.com',
        notes: 'מה מעניין אותך?',
        notesPlaceholder: 'שיעור פרטי, היפ הופ, ווג, הכנה לאירוע...',
        submit: 'שליחת בקשה',
      },
      footer: {
        socialPrompt: 'עקבו אחריי ברשתות',
        instagram: 'אינסטגרם',
        tiktok: 'טיקטוק',
        facebook: 'פייסבוק',
      },
    },
  },
  en: {
    translation: {
      brand: '',
      language: { label: 'Choose language' },
      theme: { toggle: 'Toggle theme' },
      menu: {
        toggle: 'Toggle menu',
        close: 'Close menu',
        mobileLabel: 'Mobile navigation',
      },
      nav: {
        home: 'Home',
        lessons: 'Lessons',
        privateLesson: 'About Me',
        signup: 'Signup',
      },
      hero: {
        eyebrow: 'Movement studio',
        noLimits: 'Eden Dafna',
        just: 'Goren',
        movement: 'Dance lessons for adults.',
        body: 'Discipline today. Freedom tomorrow.',
        bookClass: 'Book a class',
        privateLesson: 'Book a private lesson',
      },
      lessons: {
        eyebrow: 'This week',
        title: 'Lesson plan',
        dayPrefix: '',
        signupCta: 'Sign up',
        fitCta: 'Who is this for?',
        fit: {
          hipHop: {
            title: 'Hip-Hop',
            body: 'Hip-Hop classes for women are for anyone who wants to dance, release, and enjoy movement in an open, supportive space.\nNo previous experience is needed. Come as you are.',
          },
          vogue: {
            title: 'Vogue',
            body: 'A Vogue class in the Vogue New Way style. We will learn the four elements that shape the style (arms controls, flexibility/tricks, pose, floor performance), practice technique, develop personal improvisation, and learn choreography.\nNo previous experience is needed.',
          },
        },
      },
      about: {
        title: 'About Me',
        body: 'Hi, I am Eden - a professional dancer and dance teacher\nwith over 14 years of experience teaching dance\n\nI graduated from the Hip Hop instructors course at Wingate and from a professional dancer training program at the Academy of Dance\nI perform in musicals and theatre productions, and lead and judge Vogue competitions in Israel\n\nI teach in a professional, open, and empowering atmosphere, with an emphasis on confidence, self-expression, and enjoyment.\nNo previous experience is needed. Classes are suitable for all levels',
      },
      days: {
        mon: 'Monday',
        sun: 'Sunday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
      },
      locations: {
        ramatGan: 'Ramat Gan',
        rishonLeZion: 'Rishon LeZion',
        nessZiona: 'Ness Ziona',
      },
      lessonPeriods: {
        morning: 'Morning',
        evening: 'Evening',
      },
      privateLesson: {
        quote: 'Dance is the hidden language of the soul.',
        body: 'A focused private lesson built around rhythm, technique, and personal expression. Ideal for event prep, confidence, or building a stronger foundation.',
        cta: 'Book a private lesson',
      },
      signup: {
        eyebrow: 'Start moving',
        title: 'Signup',
        body: 'Leave your details and we will follow up to coordinate a group class or private lesson.',
        name: 'Name',
        namePlaceholder: 'Your name',
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        notes: 'What are you looking for?',
        notesPlaceholder: 'Private lesson, hip hop, vogue, event prep...',
        submit: 'Send request',
      },
      footer: {
        socialPrompt: 'Follow me on Social Media',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        facebook: 'Facebook',
      },
    },
  },
  ru: {
    translation: {
      brand: '',
      language: { label: 'Выбрать язык' },
      theme: { toggle: 'Переключить тему' },
      menu: {
        toggle: 'Открыть меню',
        close: 'Закрыть меню',
        mobileLabel: 'Мобильная навигация',
      },
      nav: {
        home: 'Главная',
        lessons: 'Уроки',
        privateLesson: 'Обо мне',
        signup: 'Запись',
      },
      hero: {
        eyebrow: 'Студия движения',
        noLimits: 'Эден Дафна',
        just: 'Горен',
        movement: 'Уроки танцев для взрослых.',
        body: 'Дисциплина сегодня. Свобода завтра.',
        bookClass: 'Записаться',
        privateLesson: 'Личный урок',
      },
      lessons: {
        eyebrow: 'На этой неделе',
        title: 'План уроков',
        dayPrefix: '',
        signupCta: 'Запись',
        fitCta: 'Кому это подходит?',
        fit: {
          hipHop: {
            title: 'Hip-Hop',
            body: 'Занятия Hip-Hop для женщин подходят всем, кто хочет танцевать, расслабиться и получать удовольствие в открытом и поддерживающем пространстве.\nПредыдущий опыт не нужен. Приходи такой, какая ты есть.',
          },
          vogue: {
            title: 'Vogue',
            body: 'Занятие Vogue в стиле Vogue New Way. Мы изучим четыре элемента стиля (arms controls, flexibility/tricks, pose, floor performance), попробуем технику, разовьем личную импровизацию и выучим танцевальные связки.\nПредыдущий опыт не нужен.',
          },
        },
      },
      about: {
        title: 'Обо мне',
        body: 'Привет, я Эден - профессиональная танцовщица и преподаватель танца\nс опытом преподавания более 14 лет\n\nЯ окончила курс инструкторов по хип-хопу в Wingate и программу подготовки танцоров в Академии танца\nЯ танцую в мюзиклах и театральных постановках, а также веду и сужу Vogue соревнования в Израиле\n\nЯ преподаю в профессиональной, открытой и поддерживающей атмосфере, с акцентом на уверенность, самовыражение и удовольствие.\nПредыдущий опыт не требуется. Занятия подходят для всех уровней',
      },
      days: {
        mon: 'Понедельник',
        sun: 'Воскресенье',
        tue: 'Вторник',
        wed: 'Среда',
        thu: 'Четверг',
        fri: 'Пятница',
        sat: 'Суббота',
      },
      locations: {
        ramatGan: 'Рамат-Ган',
        rishonLeZion: 'Ришон-ле-Цион',
        nessZiona: 'Нес-Циона',
      },
      lessonPeriods: {
        morning: 'Утро',
        evening: 'Вечер',
      },
      privateLesson: {
        quote: 'Танец — скрытый язык души.',
        body: 'Индивидуальный урок вокруг ритма, техники и личного выражения. Подходит для подготовки к событию, уверенности и сильной базы.',
        cta: 'Записаться на личный урок',
      },
      signup: {
        eyebrow: 'Начать движение',
        title: 'Запись',
        body: 'Оставьте данные, и мы свяжемся с вами, чтобы согласовать групповое занятие или личный урок.',
        name: 'Имя',
        namePlaceholder: 'Ваше имя',
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        notes: 'Что вас интересует?',
        notesPlaceholder: 'Личный урок, хип-хоп, вог, подготовка к событию...',
        submit: 'Отправить заявку',
      },
      footer: {
        socialPrompt: 'Следите за мной в соцсетях',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        facebook: 'Facebook',
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
