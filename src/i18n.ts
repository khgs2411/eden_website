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
			theme: { toggle: "החלפת מצב תצוגה", current: "מצב תצוגה: {{mode}}", light: "בהיר", dark: "כהה" },
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
				groups: {
					vogueWorkshops: "סדנאות Vogue New Way",
					hipHop: "שיעורי Hip-Hop",
					tailored: "בהתאמה אישית",
				},
				videosCta: "להתרשמות מ{{title}}",
				// Per-group replacements for videosCta, where the generic "<cta> <group title>" reads badly.
				videosCtaOverrides: {
					tailored: "להתרשמות",
				},
				signupCta: "הרשמה",
				contactCards: {
					privateGroup: {
						title: "שיעור פרטי או קבוצתי סגור",
						body: "רוצות לתאם שיעור אישי, הכנה לאירוע או סדנה לקבוצה סגורה? כתבו לי ונמצא את הפורמט שמתאים לכן.",
						cta: "לתאום",
					},
					guestTeacher: {
						title: "מורה אורחת בסטודיו שלכם",
						body: "סדנאות בסטודיו שלכם לאורך השנה: לסדנה חד פעמית או למס מפגשים כמורה אורחת לגילאי חטיבה ומעלה\nהסגנון משלב טכניקת ידיים, פיתוח פרפורמנס וביטחון אישי, קורדינציה, מוסיקאליות ועוד מגוון איכויות שיתנו בוסט לכל רקדן!",
						cta: "לתאום",
					},
				},
				fitCta: "למי זה מתאים?",
				fit: {
					hipHop: {
						title: "Hip-Hop",
						body: "שיעורי היפ הופ לנשים מתאימים לכל מי שרוצה לרקוד, להשתחרר ולהנות במרחב פתוח ומאפשר.\nאין צורך בנסיון קודם. בואי כמו שאת.",
					},
					vogue: {
						title: "Vogue",
						body: "שעורי Vogue New Way היחידים בישראל!\nבשעור נתנסה ונלמד את ארבעת האלמנטים שמרכיבים את הסגנון, נתרגל טכניקת ידיים ייחודית, נפתח פרפורמנס וביטחון אישי ונכנס לתרבות הבולרום הצבעונית.\nאין צורך בניסיון קודם.\nהשעור מתאים לכולם! בין אם אתם רקדנים מקצועיים שרוצים להוסיף טכניקה ולהתמקצע ובין אם אתם רוצים להתנסות בסגנון ייחודי וחדש.",
					},
				},
			},
			about: {
				title: "תכירו אותי",
				body: "היי, אני עדן - רקדנית מקצועית ומורה לריקוד\nבעלת נסיון של מעל 14 שנים בהוראת מחול\n\nבוגרת קורס מדריכי היפ-הופ בוינגייט ומסלול הכשרת רקדנים באקדמיה למחול\nמופיעה במחזות זמר והצגות בתיאטראות ברחבי הארץ,\nממקימי סצנת הבולרום בישראל, מתמחה בסגנון Vogue New Way ושופטת בתחרויות ריקוד בארץ.\nבעלת ניסיון בסגנונות מגוונים כמו ג'אז, היפהופ, בלט, מחזות זמר, ווג ואמפרוביזציה.\n\nאת השעורים שלי אני מלמדת באווירה מקצועית, פתוחה ומעצימה, עם דגש על ביטחון עצמי, ביטוי אישי והנאה.\n\nאני מאמינה שכל עוד יש בך את הרצון, יש בך גם את היכולת\nכל מה שנדרש הוא לתרגל\nזה מה שנעשה יחד, צעד צעד, בשעורי ריקוד לבוגרים\n\nאין צורך בנסיון קודם, השיעורים מתאימים לכל הרמות\nמחכה לכן.ם בסטודיו 🤍",
				registrationCard: {
					title: "רוצות להצטרף?",
					body: "חזרו למערכת השיעורים ובחרו את השיעור שמתאים לכן.",
					cta: "להרשמה",
				},
			},
			locations: {
				beerYaakov: "באר יעקב",
				shenkin17TelAviv: "שנקין 17 תל אביב",
				bialik25StudioNaim: "ביאליק 25 - סטודיו נעים, רמת גן",
			},
			// Card copy writes "Hip\u2011Hop" (non-breaking hyphen) so narrow cards never split the brand name.
			lessonStyles: {
				techniqueWorkshop: "סדנת טכניקה",
				vogueDanceWorkshop: "סדנת ריקוד Vogue",
				openHipHopClasses: "שיעורי Hip\u2011Hop פתוחים",
			},
			lessonStyleSubtitles: {
				earlyBirdPrice: "80 ש״ח בהרשמה מראש",
				// \u2068…\u2069 isolates the Latin brand name so "/ 150" keeps its place in RTL.
				hipHopClubPrice: "75 ש״ח לחברות \u2068Hip\u2011Hop Club\u2069 / 150 ש״ח לחיצוניים",
				ramatGanResidentPrice: "20 ש״ח לתושבי רמת גן | 40 ש״ח לתושבי חוץ",
				hipHopClubTrial: "בתאום שיעור נסיון ב Hip\u2011Hop Club",
			},
			lessonDays: {
				wednesdays: "ימי רביעי",
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
			theme: { toggle: "Toggle theme", current: "Display mode: {{mode}}", light: "Light", dark: "Dark" },
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
				groups: {
					vogueWorkshops: "Vogue New Way Workshops",
					hipHop: "Hip-Hop Classes",
					tailored: "Tailored to You",
				},
				videosCta: "See {{title}} in action",
				videosCtaOverrides: {
					tailored: "See it in action",
				},
				signupCta: "Sign up",
				contactCards: {
					privateGroup: {
						title: "Private lesson or closed group",
						body: "Want to book a personal lesson, event prep, or a workshop for a closed group? Message me and we will find the right format.",
						cta: "Get in touch",
					},
					guestTeacher: {
						title: "A Guest Teacher at Your Studio",
						body: "Workshops at your studio throughout the year: a one-off workshop or a series of sessions as a guest teacher, for middle school ages and up.\nThe style combines hand technique, performance and confidence building, coordination, musicality and many more qualities that will give every dancer a boost!",
						cta: "Get in touch",
					},
				},
				fitCta: "Who is this for?",
				fit: {
					hipHop: {
						title: "Hip-Hop",
						body: "Hip-Hop classes for women are for anyone who wants to dance, release, and enjoy movement in an open, supportive space.\nNo previous experience is needed. Come as you are.",
					},
					vogue: {
						title: "Vogue",
						body: "The only Vogue New Way classes in Israel!\nIn class we will explore and learn the four elements that shape the style, practice unique hand technique, develop performance and personal confidence, and enter the colorful world of ballroom culture.\nNo previous experience is needed.\nThis class is for everyone, whether you are a professional dancer who wants to add technique and refine your craft, or you want to try a unique new style.",
					},
				},
			},
			about: {
				title: "About Me",
				body: "Hi, I am Eden - a professional dancer and dance teacher\nwith over 14 years of experience teaching dance\n\nI graduated from the Hip-Hop instructors course at Wingate and from a professional dancer training program at the Academy of Dance\nI perform in musicals and theatre productions in theaters across Israel,\nI am one of the founders of the ballroom scene in Israel, specialize in Vogue New Way, and judge dance competitions in Israel.\nI have experience in a wide range of styles, including jazz, hip-hop, ballet, musicals, vogue, and improvisation.\n\nI teach my classes in a professional, open, and empowering atmosphere, with an emphasis on confidence, self-expression, and enjoyment.\n\nI believe that as long as you have the desire, you also have the ability.\nAll it takes is practice.\nThat is what we will do together, step by step, in dance classes for adults.\n\nNo previous experience is needed. Classes are suitable for all levels.\nWaiting for you in the studio 🤍",
				registrationCard: {
					title: "Ready to join?",
					body: "Return to the lesson plan and choose the class that fits you.",
					cta: "Sign up",
				},
			},
			locations: {
				beerYaakov: "Be'er Ya'akov",
				shenkin17TelAviv: "17 Shenkin St, Tel Aviv",
				bialik25StudioNaim: "25 Bialik St - Studio Na'im, Ramat Gan",
			},
			lessonStyles: {
				techniqueWorkshop: "Technique Workshop",
				vogueDanceWorkshop: "Vogue Dance Workshop",
				openHipHopClasses: "Open Hip\u2011Hop Classes",
			},
			lessonStyleSubtitles: {
				earlyBirdPrice: "₪80 with advance registration",
				hipHopClubPrice: "₪75 for Hip\u2011Hop Club members / ₪150 for non-members",
				ramatGanResidentPrice: "₪20 for Ramat Gan residents | ₪40 for non-residents",
				hipHopClubTrial: "Trial class by arrangement at Hip\u2011Hop Club",
			},
			lessonDays: {
				wednesdays: "Wednesdays",
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
			theme: { toggle: "Переключить тему", current: "Режим: {{mode}}", light: "Светлый", dark: "Темный" },
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
				groups: {
					vogueWorkshops: "Воркшопы Vogue New Way",
					hipHop: "Занятия Hip-Hop",
					tailored: "Индивидуальный формат",
				},
				videosCta: "Как проходят {{title}}",
				videosCtaOverrides: {
					tailored: "Как это выглядит",
				},
				signupCta: "Запись",
				contactCards: {
					privateGroup: {
						title: "Личный урок или закрытая группа",
						body: "Хотите личный урок, подготовку к событию или занятие для закрытой группы? Напишите мне, и мы подберем подходящий формат.",
						cta: "Связаться",
					},
					guestTeacher: {
						title: "Приглашённый педагог в вашей студии",
						body: "Воркшопы в вашей студии в течение всего года: разовый воркшоп или серия занятий в формате приглашённого педагога, для учеников средней школы и старше.\nСтиль сочетает технику рук, развитие перформанса и уверенности в себе, координацию, музыкальность и множество других качеств, которые дадут импульс любому танцору!",
						cta: "Связаться",
					},
				},
				fitCta: "Кому это подходит?",
				fit: {
					hipHop: {
						title: "Hip-Hop",
						body: "Занятия Hip-Hop для женщин подходят всем, кто хочет танцевать, расслабиться и получать удовольствие в открытом и поддерживающем пространстве.\nПредыдущий опыт не нужен. Приходи такой, какая ты есть.",
					},
					vogue: {
						title: "Vogue",
						body: "Единственные занятия Vogue New Way в Израиле!\nНа занятии мы познакомимся и изучим четыре элемента, из которых состоит стиль, будем практиковать уникальную технику рук, развивать перформанс и личную уверенность, а также войдем в яркую культуру ballroom.\nПредыдущий опыт не нужен.\nЭто занятие подходит всем: и профессиональным танцорам, которые хотят добавить технику и развиваться, и тем, кто хочет попробовать уникальный новый стиль.",
					},
				},
			},
			about: {
				title: "Обо мне",
				body: "Привет, я Эден - профессиональная танцовщица и преподаватель танца\nс опытом преподавания более 14 лет\n\nЯ окончила курс инструкторов по Hip-Hop в Wingate и программу подготовки танцоров в Академии танца\nВыступаю в мюзиклах и театральных постановках по всей стране,\nодна из основательниц ballroom-сцены в Израиле, специализируюсь на Vogue New Way и сужу танцевальные соревнования в Израиле.\nУ меня есть опыт в разных стилях, включая джаз, хип-хоп, балет, мюзиклы, vogue и импровизацию.\n\nСвои занятия я веду в профессиональной, открытой и поддерживающей атмосфере, с акцентом на уверенность, самовыражение и удовольствие.\n\nЯ верю, что если в тебе есть желание, значит, в тебе есть и способность.\nВсе, что нужно, - это практика.\nИменно этим мы будем заниматься вместе, шаг за шагом, на уроках танца для взрослых.\n\nПредыдущий опыт не требуется. Занятия подходят для всех уровней.\nЖду вас в студии 🤍",
				registrationCard: {
					title: "Хотите присоединиться?",
					body: "Вернитесь к плану уроков и выберите подходящее занятие.",
					cta: "Запись",
				},
			},
			locations: {
				beerYaakov: "Беэр-Яаков",
				shenkin17TelAviv: "Шенкин 17, Тель-Авив",
				bialik25StudioNaim: "Бялик 25 - студия Наим, Рамат-Ган",
			},
			lessonStyles: {
				techniqueWorkshop: "Воркшоп по технике",
				vogueDanceWorkshop: "Танцевальный воркшоп Vogue",
				openHipHopClasses: "Открытые занятия Hip\u2011Hop",
			},
			lessonStyleSubtitles: {
				earlyBirdPrice: "80 ₪ при предварительной записи",
				hipHopClubPrice: "75 ₪ для участниц Hip\u2011Hop Club / 150 ₪ для остальных",
				ramatGanResidentPrice: "20 ₪ для жителей Рамат-Гана | 40 ₪ для остальных",
				hipHopClubTrial: "Пробное занятие по договоренности в Hip\u2011Hop Club",
			},
			lessonDays: {
				wednesdays: "По средам",
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
