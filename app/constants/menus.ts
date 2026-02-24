import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    headingKey: 'nav.general',
    items: [
      {
        title: 'Dashboard',
        titleKey: 'nav.dashboard',
        icon: 'i-lucide-layout-dashboard',
        link: '/',
      },
      {
        title: 'Email',
        titleKey: 'nav.email',
        icon: 'i-lucide-mail',
        link: '/email',
      },
    ],
  },
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
      {
        title: 'Tasks',
        titleKey: 'nav.tasks',
        icon: 'i-lucide-calendar-check-2',
        link: '/tasks',
      },
      {
        title: 'Timesheets',
        titleKey: 'nav.timesheets',
        icon: 'i-lucide-timer',
        link: '/projects/timesheets',
      },
      {
        title: 'Milestones',
        titleKey: 'nav.milestones',
        icon: 'i-lucide-flag',
        link: '/projects/milestones',
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
      {
        title: 'Gantt Chart',
        titleKey: 'nav.ganttChart',
        icon: 'i-lucide-gantt-chart',
        link: '/gantt',
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
  {
    heading: 'Inventory & Warehouse',
    headingKey: 'nav.inventoryWarehouse',
    items: [
      {
        title: 'Stock Overview',
        titleKey: 'nav.stockOverview',
        icon: 'i-lucide-warehouse',
        link: '/inventory/stock',
      },
      {
        title: 'Transfers',
        titleKey: 'nav.transfers',
        icon: 'i-lucide-arrow-left-right',
        link: '/inventory/transfers',
      },
      {
        title: 'Purchase Orders',
        titleKey: 'nav.purchaseOrders',
        icon: 'i-lucide-clipboard-list',
        link: '/inventory/purchase-orders',
      },
      {
        title: 'Vendors',
        titleKey: 'nav.vendors',
        icon: 'i-lucide-truck',
        link: '/inventory/vendors',
      },
    ],
  },
  {
    heading: 'HR & Workforce',
    headingKey: 'nav.hrWorkforce',
    items: [
      {
        title: 'Employees',
        titleKey: 'nav.employees',
        icon: 'i-lucide-user-round-check',
        link: '/hr/employees',
      },
      {
        title: 'Attendance',
        titleKey: 'nav.attendance',
        icon: 'i-lucide-clock',
        link: '/hr/attendance',
      },
      {
        title: 'Payroll',
        titleKey: 'nav.payroll',
        icon: 'i-lucide-banknote',
        link: '/hr/payroll',
      },
      {
        title: 'Recruitment',
        titleKey: 'nav.recruitment',
        icon: 'i-lucide-briefcase',
        link: '/hr/recruitment',
      },
      {
        title: 'Leave Mgmt',
        titleKey: 'nav.leaveMgmt',
        icon: 'i-lucide-calendar-off',
        link: '/hr/leaves',
      },
    ],
  },
  {
    heading: 'Finance & Accounting',
    headingKey: 'nav.financeAccounting',
    items: [
      {
        title: 'Accounts',
        titleKey: 'nav.accounts',
        icon: 'i-lucide-wallet',
        link: '/finance/accounts',
      },
      {
        title: 'Transactions',
        titleKey: 'nav.transactions',
        icon: 'i-lucide-arrow-right-left',
        link: '/finance/transactions',
      },
      {
        title: 'Expenses',
        titleKey: 'nav.expenses',
        icon: 'i-lucide-credit-card',
        link: '/finance/expenses',
      },
      {
        title: 'Tax Management',
        titleKey: 'nav.taxManagement',
        icon: 'i-lucide-percent',
        link: '/finance/taxes',
      },
      {
        title: 'Balance Sheet',
        titleKey: 'nav.balanceSheet',
        icon: 'i-lucide-landmark',
        link: '/finance/balance-sheet',
      },
      {
        title: 'Income Statement',
        titleKey: 'nav.incomeStatement',
        icon: 'i-lucide-receipt',
        link: '/finance/income-statement',
      },
      {
        title: 'Financial Ratios',
        titleKey: 'nav.financialRatios',
        icon: 'i-lucide-chart-no-axes-combined',
        link: '/finance/ratios',
      },
      {
        title: 'Business Health',
        titleKey: 'nav.businessHealth',
        icon: 'i-lucide-heart-pulse',
        link: '/finance/business-health',
      },
    ],
  },

  {
    heading: 'Support',
    headingKey: 'nav.support',
    items: [
      {
        title: 'Tickets',
        titleKey: 'nav.tickets',
        icon: 'i-lucide-ticket',
        link: '/support/tickets',
      },
      {
        title: 'Knowledge Base',
        titleKey: 'nav.knowledgeBase',
        icon: 'i-lucide-book-open',
        link: '/support/knowledge-base',
      },
      {
        title: 'Live Chat',
        titleKey: 'nav.liveChat',
        icon: 'i-lucide-message-circle',
        link: '/support/chat',
      },
    ],
  },
  {
    heading: 'Marketing',
    headingKey: 'nav.marketing',
    items: [
      {
        title: 'Campaigns',
        titleKey: 'nav.campaigns',
        icon: 'i-lucide-megaphone',
        link: '/marketing/campaigns',
      },
      {
        title: 'Email Blasts',
        titleKey: 'nav.emailBlasts',
        icon: 'i-lucide-mails',
        link: '/marketing/email-blasts',
      },
      {
        title: 'Analytics',
        titleKey: 'nav.analytics',
        icon: 'i-lucide-bar-chart-3',
        link: '/marketing/analytics',
      },
    ],
  },
  {
    heading: 'Reports',
    headingKey: 'nav.reports',
    items: [
      {
        title: 'Sales Reports',
        titleKey: 'nav.salesReports',
        icon: 'i-lucide-trending-up',
        link: '/reports/sales',
      },
      {
        title: 'Financial Reports',
        titleKey: 'nav.financialReports',
        icon: 'i-lucide-pie-chart',
        link: '/reports/financial',
      },
      {
        title: 'HR Reports',
        titleKey: 'nav.hrReports',
        icon: 'i-lucide-file-bar-chart',
        link: '/reports/hr',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = [
  {
    title: 'Help & Support',
    titleKey: 'nav.helpSupport',
    icon: 'i-lucide-circle-help',
    link: '/docs',
  },
  {
    title: 'Feedback',
    titleKey: 'nav.feedback',
    icon: 'i-lucide-send',
    link: '/docs',
  },
]
