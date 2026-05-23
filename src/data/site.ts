export const navItems = [
  { key: 'home', href: '#home' },
  { key: 'lessons', href: '#lessons' },
  { key: 'privateLesson', href: '#private-lesson' },
] as const

export const lessons = [
  {
    id: 'sun-12-hip-hop',
    day: 'sun',
    date: '12',
    time: '8:00 PM - 9:00 PM',
    style: 'Hip Hop',
  },
  {
    id: 'sun-12-vogue',
    day: 'sun',
    date: '12',
    time: '9:00 PM - 10:00 PM',
    style: 'Vogue',
  },
  {
    id: 'tue-14-hip-hop',
    day: 'tue',
    date: '14',
    time: '8:00 PM - 9:00 PM',
    style: 'Hip Hop',
  },
  {
    id: 'wed-15-hip-hop',
    day: 'wed',
    date: '15',
    time: '8:00 PM - 9:00 PM',
    style: 'Hip Hop',
  },
] as const

export type NavItem = (typeof navItems)[number]
export type Lesson = (typeof lessons)[number]
