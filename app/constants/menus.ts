import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'Apps',
    headingKey: 'nav.apps',
    items: [
      {
        title: 'Kanban Board',
        titleKey: 'nav.kanbanBoard',
        icon: 'i-lucide-kanban',
        link: '/kanban',
      },
      {
        title: 'Database Creator',
        titleKey: 'nav.databaseCreator',
        icon: 'i-lucide-database',
        link: '/database-creator',
      },
      {
        title: 'Collection Updator',
        titleKey: 'nav.collectionUpdator',
        icon: 'i-lucide-refresh-cw',
        link: '/collection-updator',
      },
      {
        title: 'Array Embedder',
        titleKey: 'nav.arrayEmbedder',
        icon: 'i-lucide-list-plus',
        link: '/array-embedder',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []
