export const navItems = [
  { key: 'home', href: '#home' },
  { key: 'lessons', href: '#lessons' },
  { key: 'privateLesson', href: '#private-lesson' },
] as const

export const lessons = [
  {
    id: 'sun-12-vogue',
    day: 'sun',
    date: '12',
    time: '19:15 - 20:30',
    style: 'Vogue',
    location: 'ramatGan',
  },
  {
    id: 'sun-12-hip-hop',
    day: 'sun',
    date: '12',
    time: '20:30 - 21:30',
    style: 'Hip Hop',
    location: 'ramatGan',
  },
  {
    id: 'mon-14-hip-hop',
    day: 'mon',
    date: '14',
    time: '19:15 - 20:15',
    style: 'Hip Hop',
    location: 'rishonLeZion',
  },
  {
    id: 'wed-15-hip-hop',
    day: 'wed',
    date: '15',
    time: '20:00 - 21:00',
    style: 'Hip Hop',
    location: 'nessZiona',
  },
] as const

export type NavItem = (typeof navItems)[number]
export type Lesson = (typeof lessons)[number]
