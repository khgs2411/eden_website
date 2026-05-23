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
			brand: "",
			language: { label: "בחירת שפה" },
			theme: { toggle: "החלפת מצב תצוגה" },
			menu: {
				toggle: "פתיחת תפריט",
				close: "סגירת תפריט",
				mobileLabel: "ניווט מובייל",
			},
			nav: {
				home: "בית",
				lessons: "שיעורים",
				privateLesson: "תכירו אותי",
				signup: "הרשמה",
			},
			hero: {
				eyebrow: "סטודיו לתנועה",
				noLimits: "עדן דפנה",
				just: "גורן",
				movement: "שיעורי ריקוד לבוגרים",
				body: "משמעת היום. חופש מחר.",
				bookClass: "להזמין שיעור",
				privateLesson: "שיעור פרטי",
			},
			lessons: {
				eyebrow: "השבוע",
				title: "מערכת שיעורים",
				dayPrefix: "יום",
				signupCta: "הרשמה",
				contactCard: {
					title: "שיעור פרטי או קבוצתי סגור",
					body: "רוצות לתאם שיעור אישי, הכנה לאירוע או סדנה לקבוצה סגורה? כתבו לי ונמצא את הפורמט שמתאים לכן.",
					cta: "ליצירת קשר",
				},
				fitCta: "למי זה מתאים?",
				fit: {
					hipHop: {
						title: "Hip-Hop",
						body: "שיעורי היפ הופ לנשים מתאימים לכל מי שרוצה לרקוד, להשתחרר ולהנות במרחב פתוח ומאפשר.\nאין צורך בנסיון קודם. בואי כמו שאת.",
					},
					vogue: {
						title: "Vogue",
						body: "שעורי Vogue New Way היחידים בישראל!\nבשעור נתנסה ונלמד את ארבעת האלמנטים שמרכיבים את הסגנון, נתרגל טכניקת ידיים ייחודית, נפתח פרפורמנס וביטחון אישי ונכנס לתרבות הבולרום הצבעונית.\nאין צורך בניסיון קודם.",
					},
				},
			},
			about: {
				title: "תכירו אותי",
				body: "היי, אני עדן - רקדנית מקצועית ומורה לריקוד\nבעלת נסיון של מעל 14 שנים בהוראת מחול\n\nבוגרת קורס מדריכי היפ-הופ בוינגייט ומסלול הכשרת רקדנים באקדמיה למחול\nמופיעה במחזות זמר והצגות בתיאטראות ברחבי הארץ,\nממקימי סצנת הבולרום בישראל, מתמחה בסגנון Vogue New Way ושופטת בתחרויות ריקוד בארץ.\nבעלת ניסיון בסגנונות מגוונים כמו ג'אז, היפהופ, בלט, מחזות זמר, ווג ואמפרוביזציה.\n\nאת השעורים שלי אני מלמדת באווירה מקצועית, פתוחה ומעצימה, עם דגש על ביטחון עצמי, ביטוי אישי והנאה.\n\nאני מאמינה שכל עוד יש בך את הרצון, יש בך גם את היכולת\nכל מה שנדרש הוא לתרגל\nזה מה שנעשה יחד, צעד צעד, בשעורי ריקוד לבוגרים\n\nאין צורך בנסיון קודם, השיעורים מתאימים לכל הרמות\nמחכה לכן.ם בסטודיו 🤍",
			},
			days: {
				mon: "שני",
				sun: "ראשון",
				tue: "שלישי",
				wed: "רביעי",
				thu: "חמישי",
				fri: "שישי",
				sat: "שבת",
			},
			locations: {
				ramatGan: "רמת גן",
				rishonLeZion: "ראשון לציון",
				nessZiona: "נס ציונה",
			},
			lessonStyleSubtitles: {
				women: "לנשים",
			},
			lessonPeriods: {
				morning: "בוקר",
				evening: "ערב",
			},
			privateLesson: {
				quote: "הריקוד הוא השפה הנסתרת של הנשמה.",
				body: "שיעור פרטי ממוקד בקצב, טכניקה וביטוי אישי. מתאים להכנה לאירוע, שיפור ביטחון או בניית בסיס חזק יותר.",
				cta: "להזמין שיעור פרטי",
			},
			voguePricing: {
				back: "חזרה לעמוד הקודם",
				title: "מחירון שיעורי ווג",
				schedule: "ימי ראשון / 19:15",
				duration: "משך השיעור 75 דק׳",
				location: "השיעור מתקיים במרכז שקמה, רחוב שלם 32 - רמת גן",
				registration: "לפרטים והרשמה פנו אלי באינסטגרם",
				table: {
					entry: "כניסה",
					quantity: "כמות שיעורים",
					price: "מחיר",
					validity: "תוקף",
				},
				rows: {
					trial: { entry: "שיעור היכרות", quantity: "1", price: "60₪", validity: "חד פעמי" },
					single: { entry: "שיעור בודד", quantity: "1", price: "70₪", validity: "חד פעמי" },
					card8: { entry: "כרטיסייה\nקטנה", quantity: "8", price: "480₪", validity: "תקף לשלושה חודשים" },
					card12: { entry: "כרטיסייה בינונית", quantity: "12", price: "660₪", validity: "תקף לשלושה חודשים" },
					card16: { entry: "כרטיסייה\nגדולה", quantity: "16", price: "800₪", validity: "תקף לשלושה חודשים" },
				},
			},
			signup: {
				eyebrow: "מתחילים לזוז",
				title: "הרשמה",
				body: "השאירו פרטים ונחזור אליכם כדי לתאם שיעור קבוצתי או שיעור פרטי.",
				name: "שם",
				namePlaceholder: "השם שלך",
				email: "אימייל",
				emailPlaceholder: "you@example.com",
				notes: "מה מעניין אותך?",
				notesPlaceholder: "שיעור פרטי, היפ הופ, ווג, הכנה לאירוע...",
				submit: "שליחת בקשה",
			},
			footer: {
				socialPrompt: "עקבו אחריי ברשתות",
				instagram: "אינסטגרם",
				tiktok: "טיקטוק",
				facebook: "פייסבוק",
			},
		},
	},
	en: {
		translation: {
			brand: "",
			language: { label: "Choose language" },
			theme: { toggle: "Toggle theme" },
			menu: {
				toggle: "Toggle menu",
				close: "Close menu",
				mobileLabel: "Mobile navigation",
			},
			nav: {
				home: "Home",
				lessons: "Lessons",
				privateLesson: "About Me",
				signup: "Signup",
			},
			hero: {
				eyebrow: "Movement studio",
				noLimits: "Eden Dafna",
				just: "Goren",
				movement: "Dance lessons for adults.",
				body: "Discipline today. Freedom tomorrow.",
				bookClass: "Book a class",
				privateLesson: "Book a private lesson",
			},
			lessons: {
				eyebrow: "This week",
				title: "Lesson plan",
				dayPrefix: "",
				signupCta: "Sign up",
				contactCard: {
					title: "Private lesson or closed group",
					body: "Want to book a personal lesson, event prep, or a workshop for a closed group? Message me and we will find the right format.",
					cta: "Contact",
				},
				fitCta: "Who is this for?",
				fit: {
					hipHop: {
						title: "Hip-Hop",
						body: "Hip-Hop classes for women are for anyone who wants to dance, release, and enjoy movement in an open, supportive space.\nNo previous experience is needed. Come as you are.",
					},
					vogue: {
						title: "Vogue",
						body: "The only Vogue New Way classes in Israel!\nIn class we will explore and learn the four elements that shape the style, practice unique hand technique, develop performance and personal confidence, and enter the colorful world of ballroom culture.\nNo previous experience is needed.",
					},
				},
			},
			about: {
				title: "About Me",
				body: "Hi, I am Eden - a professional dancer and dance teacher\nwith over 14 years of experience teaching dance\n\nI graduated from the Hip-Hop instructors course at Wingate and from a professional dancer training program at the Academy of Dance\nI perform in musicals and theatre productions in theaters across Israel,\nI am one of the founders of the ballroom scene in Israel, specialize in Vogue New Way, and judge dance competitions in Israel.\nI have experience in a wide range of styles, including jazz, hip-hop, ballet, musicals, vogue, and improvisation.\n\nI teach my classes in a professional, open, and empowering atmosphere, with an emphasis on confidence, self-expression, and enjoyment.\n\nI believe that as long as you have the desire, you also have the ability.\nAll it takes is practice.\nThat is what we will do together, step by step, in dance classes for adults.\n\nNo previous experience is needed. Classes are suitable for all levels.\nWaiting for you in the studio 🤍",
			},
			days: {
				mon: "Monday",
				sun: "Sunday",
				tue: "Tuesday",
				wed: "Wednesday",
				thu: "Thursday",
				fri: "Friday",
				sat: "Saturday",
			},
			locations: {
				ramatGan: "Ramat Gan",
				rishonLeZion: "Rishon LeZion",
				nessZiona: "Ness Ziona",
			},
			lessonStyleSubtitles: {
				women: "Women",
			},
			lessonPeriods: {
				morning: "Morning",
				evening: "Evening",
			},
			privateLesson: {
				quote: "Dance is the hidden language of the soul.",
				body: "A focused private lesson built around rhythm, technique, and personal expression. Ideal for event prep, confidence, or building a stronger foundation.",
				cta: "Book a private lesson",
			},
			voguePricing: {
				back: "Back to previous page",
				title: "Vogue class pricing",
				schedule: "Sundays / 19:15",
				duration: "Class duration: 75 minutes",
				location: "Classes take place in Ramat Gan",
				registration: "For details and registration, message me on Instagram",
				table: {
					entry: "Entry",
					quantity: "Classes",
					price: "Price",
					validity: "Valid for",
				},
				rows: {
					trial: { entry: "Intro class", quantity: "1", price: "₪60", validity: "One time" },
					single: { entry: "Single class", quantity: "1", price: "₪70", validity: "One time" },
					card8: { entry: "Class card", quantity: "8", price: "₪480", validity: "3 months" },
					card12: { entry: "Class card", quantity: "12", price: "₪660", validity: "3 months" },
					card16: { entry: "Class card", quantity: "16", price: "₪800", validity: "3 months" },
				},
			},
			signup: {
				eyebrow: "Start moving",
				title: "Signup",
				body: "Leave your details and we will follow up to coordinate a group class or private lesson.",
				name: "Name",
				namePlaceholder: "Your name",
				email: "Email",
				emailPlaceholder: "you@example.com",
				notes: "What are you looking for?",
				notesPlaceholder: "Private lesson, hip hop, vogue, event prep...",
				submit: "Send request",
			},
			footer: {
				socialPrompt: "Follow me on Social Media",
				instagram: "Instagram",
				tiktok: "TikTok",
				facebook: "Facebook",
			},
		},
	},
	ru: {
		translation: {
			brand: "",
			language: { label: "Выбрать язык" },
			theme: { toggle: "Переключить тему" },
			menu: {
				toggle: "Открыть меню",
				close: "Закрыть меню",
				mobileLabel: "Мобильная навигация",
			},
			nav: {
				home: "Главная",
				lessons: "Уроки",
				privateLesson: "Обо мне",
				signup: "Запись",
			},
			hero: {
				eyebrow: "Студия движения",
				noLimits: "Эден Дафна",
				just: "Горен",
				movement: "Уроки танцев для взрослых.",
				body: "Дисциплина сегодня. Свобода завтра.",
				bookClass: "Записаться",
				privateLesson: "Личный урок",
			},
			lessons: {
				eyebrow: "На этой неделе",
				title: "План уроков",
				dayPrefix: "",
				signupCta: "Запись",
				contactCard: {
					title: "Личный урок или закрытая группа",
					body: "Хотите личный урок, подготовку к событию или занятие для закрытой группы? Напишите мне, и мы подберем подходящий формат.",
					cta: "Связаться",
				},
				fitCta: "Кому это подходит?",
				fit: {
					hipHop: {
						title: "Hip-Hop",
						body: "Занятия Hip-Hop для женщин подходят всем, кто хочет танцевать, расслабиться и получать удовольствие в открытом и поддерживающем пространстве.\nПредыдущий опыт не нужен. Приходи такой, какая ты есть.",
					},
					vogue: {
						title: "Vogue",
						body: "Единственные занятия Vogue New Way в Израиле!\nНа занятии мы познакомимся и изучим четыре элемента, из которых состоит стиль, будем практиковать уникальную технику рук, развивать перформанс и личную уверенность, а также войдем в яркую культуру ballroom.\nПредыдущий опыт не нужен.",
					},
				},
			},
			about: {
				title: "Обо мне",
				body: "Привет, я Эден - профессиональная танцовщица и преподаватель танца\nс опытом преподавания более 14 лет\n\nЯ окончила курс инструкторов по Hip-Hop в Wingate и программу подготовки танцоров в Академии танца\nВыступаю в мюзиклах и театральных постановках по всей стране,\nодна из основательниц ballroom-сцены в Израиле, специализируюсь на Vogue New Way и сужу танцевальные соревнования в Израиле.\nУ меня есть опыт в разных стилях, включая джаз, хип-хоп, балет, мюзиклы, vogue и импровизацию.\n\nСвои занятия я веду в профессиональной, открытой и поддерживающей атмосфере, с акцентом на уверенность, самовыражение и удовольствие.\n\nЯ верю, что если в тебе есть желание, значит, в тебе есть и способность.\nВсе, что нужно, - это практика.\nИменно этим мы будем заниматься вместе, шаг за шагом, на уроках танца для взрослых.\n\nПредыдущий опыт не требуется. Занятия подходят для всех уровней.\nЖду вас в студии 🤍",
			},
			days: {
				mon: "Понедельник",
				sun: "Воскресенье",
				tue: "Вторник",
				wed: "Среда",
				thu: "Четверг",
				fri: "Пятница",
				sat: "Суббота",
			},
			locations: {
				ramatGan: "Рамат-Ган",
				rishonLeZion: "Ришон-ле-Цион",
				nessZiona: "Нес-Циона",
			},
			lessonStyleSubtitles: {
				women: "Для женщин",
			},
			lessonPeriods: {
				morning: "Утро",
				evening: "Вечер",
			},
			privateLesson: {
				quote: "Танец — скрытый язык души.",
				body: "Индивидуальный урок вокруг ритма, техники и личного выражения. Подходит для подготовки к событию, уверенности и сильной базы.",
				cta: "Записаться на личный урок",
			},
			voguePricing: {
				back: "Назад на предыдущую страницу",
				title: "Цены на занятия Vogue",
				schedule: "Воскресенье / 19:15",
				duration: "Продолжительность: 75 минут",
				location: "Занятия проходят в Рамат-Гане",
				registration: "Для подробностей и записи напишите мне в Instagram",
				table: {
					entry: "Вход",
					quantity: "Занятий",
					price: "Цена",
					validity: "Срок",
				},
				rows: {
					trial: { entry: "Пробное занятие", quantity: "1", price: "₪60", validity: "Один раз" },
					single: { entry: "Разовое занятие", quantity: "1", price: "₪70", validity: "Один раз" },
					card8: { entry: "Абонемент", quantity: "8", price: "₪480", validity: "3 месяца" },
					card12: { entry: "Абонемент", quantity: "12", price: "₪660", validity: "3 месяца" },
					card16: { entry: "Абонемент", quantity: "16", price: "₪800", validity: "3 месяца" },
				},
			},
			signup: {
				eyebrow: "Начать движение",
				title: "Запись",
				body: "Оставьте данные, и мы свяжемся с вами, чтобы согласовать групповое занятие или личный урок.",
				name: "Имя",
				namePlaceholder: "Ваше имя",
				email: "Email",
				emailPlaceholder: "you@example.com",
				notes: "Что вас интересует?",
				notesPlaceholder: "Личный урок, хип-хоп, вог, подготовка к событию...",
				submit: "Отправить заявку",
			},
			footer: {
				socialPrompt: "Следите за мной в соцсетях",
				instagram: "Instagram",
				tiktok: "TikTok",
				facebook: "Facebook",
			},
		},
	},
} as const;

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
