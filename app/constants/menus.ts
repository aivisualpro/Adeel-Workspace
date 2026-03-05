import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'Project Management',
    headingKey: 'nav.projectManagement',
    items: [
      {
        title: 'Projects',
        titleKey: 'nav.projects',
        icon: 'i-lucide-folder-kanban',
        link: '/projects/list',
      },
    ],
  },
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
    ],
  },
  {
    heading: 'CRM',
    headingKey: 'nav.crm',
    items: [
      {
        title: 'Contacts',
        titleKey: 'nav.contacts',
        icon: 'i-lucide-contact',
        link: '/crm/contacts',
      },
      {
        title: 'Leads',
        titleKey: 'nav.leads',
        icon: 'i-lucide-magnet',
        link: '/crm/leads',
      },
      {
        title: 'Deals Pipeline',
        titleKey: 'nav.dealsPipeline',
        icon: 'i-lucide-handshake',
        link: '/crm/deals',
      },
      {
        title: 'Companies',
        titleKey: 'nav.companies',
        icon: 'i-lucide-building-2',
        link: '/crm/companies',
      },
      {
        title: 'Activities',
        titleKey: 'nav.activities',
        icon: 'i-lucide-activity',
        link: '/crm/activities',
      },
    ],
  },
  {
    heading: 'Sales & Commerce',
    headingKey: 'nav.salesCommerce',
    items: [
      {
        title: 'Quotes',
        titleKey: 'nav.quotes',
        icon: 'i-lucide-file-text',
        link: '/sales/quotes',
      },
      {
        title: 'Invoices',
        titleKey: 'nav.invoices',
        icon: 'i-lucide-receipt',
        link: '/sales/invoices',
      },
      {
        title: 'Orders',
        titleKey: 'nav.orders',
        icon: 'i-lucide-shopping-cart',
        link: '/sales/orders',
      },
      {
        title: 'Products',
        titleKey: 'nav.products',
        icon: 'i-lucide-package',
        link: '/sales/products',
      },
      {
        title: 'Customers',
        titleKey: 'nav.customers',
        icon: 'i-lucide-users',
        link: '/sales/customers',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []
