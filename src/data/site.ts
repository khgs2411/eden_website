export const navItems = [
  { key: 'home', href: '#home' },
  { key: 'lessons', href: '#lessons' },
  { key: 'privateLesson', href: '#private-lesson' },
] as const

export const instagramUrl = 'https://www.instagram.com/edendafna?utm_source=qr&igsh=MW5scHlmMDB4ZmkyZw=='
export const whatsappUrl = 'https://wa.me/972505555041'

export const lessonGroups = [
  {
    id: 'vogueWorkshops',
    lessons: [
      {
        id: 'technique-workshop-17-11',
        date: '17.11',
        time: '11:00 - 12:30',
        style: 'techniqueWorkshop',
        styleSubtitle: 'earlyBirdPrice',
        location: 'beerYaakov',
        signupUrl: whatsappUrl,
      },
      {
        id: 'vogue-workshop-20-11',
        date: '20.11',
        time: '11:30 - 13:00',
        style: 'vogueDanceWorkshop',
        styleSubtitle: 'hipHopClubPrice',
        location: 'shenkin17TelAviv',
        signupUrl: 'https://wa.me/972528346012',
      },
      {
        id: 'vogue-workshop-27-11',
        date: '27.11',
        time: '13:00 - 14:30',
        style: 'vogueDanceWorkshop',
        styleSubtitle: 'ramatGanResidentPrice',
        location: 'bialik25StudioNaim',
        signupUrl: 'https://ramat-gan.smarticket.co.il/%D7%A1%D7%93%D7%A0%D7%AA_Vogue_New_Way/?id=4534',
      },
    ],
    // Paths are relative to public/; width/height are the source pixels, used to reserve layout space.
    videos: [
      { src: 'videos/vogue-workshops-1.mp4', poster: 'videos/vogue-workshops-1.jpg', width: 478, height: 850 },
      { src: 'videos/vogue-workshops-2.mp4', poster: 'videos/vogue-workshops-2.jpg', width: 478, height: 850 },
      { src: 'videos/vogue-workshops-3.mp4', poster: 'videos/vogue-workshops-3.jpg', width: 478, height: 850 },
    ],
  },
  {
    id: 'hipHop',
    lessons: [
      {
        id: 'hip-hop-wednesdays-shenkin',
        day: 'wednesdays',
        time: '18:30 - 19:30 / 19:30 - 20:30',
        style: 'openHipHopClasses',
        styleSubtitle: 'hipHopClubTrial',
        location: 'shenkin17TelAviv',
        signupUrl:
          'https://www.hiphop-club.com/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAdGRzdgVbyaxleHRuA2FlbQIxMQBwZG9mAnNydGMGYXBwX2lkDzU2NzA2NzM0MzM1MjQyNwABpyJUlmQfmZ6PRbgd2hSO3PW2mW-jC2vahu7GUgwmsFkvO9D88zTdG4LQ7v_Q_aem_cP07OUNPUGUHg8uHije8SQ',
      },
    ],
    videos: [
      { src: 'videos/hip-hop-1.mp4', poster: 'videos/hip-hop-1.jpg', width: 848, height: 478 },
      { src: 'videos/hip-hop-2.mp4', poster: 'videos/hip-hop-2.jpg', width: 832, height: 464 },
      { src: 'videos/hip-hop-3.mp4', poster: 'videos/hip-hop-3.jpg', width: 640, height: 448 },
    ],
  },
  {
    id: 'tailored',
    lessons: [
      {
        id: 'guest-teacher-contact',
        kind: 'contact',
        copy: 'guestTeacher',
        href: 'https://wa.me/972549847896',
      },
      {
        id: 'private-group-contact',
        kind: 'contact',
        copy: 'privateGroup',
        href: instagramUrl,
      },
    ],
    videos: [
      { src: 'videos/guest-teacher-1.mp4', poster: 'videos/guest-teacher-1.jpg', width: 848, height: 444 },
      { src: 'videos/guest-teacher-2.mp4', poster: 'videos/guest-teacher-2.jpg', width: 478, height: 850 },
    ],
  },
] as const

export type NavItem = (typeof navItems)[number]
export type Lesson = (typeof lessonGroups)[number]['lessons'][number]
