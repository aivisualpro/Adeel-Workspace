export interface ProjectStage {
  id: string
  name: string
  color: string
}

export interface Project {
  id: string
  name: string
  icon: string
  stages: ProjectStage[]
}

export const projects: Project[] = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    icon: 'lucide:globe',
    stages: [
      { id: 'stg-1-1', name: 'Discovery', color: '#6366f1' },
      { id: 'stg-1-2', name: 'Wireframes', color: '#8b5cf6' },
      { id: 'stg-1-3', name: 'Design', color: '#a855f7' },
      { id: 'stg-1-4', name: 'Development', color: '#d946ef' },
      { id: 'stg-1-5', name: 'QA & Testing', color: '#ec4899' },
      { id: 'stg-1-6', name: 'Launch', color: '#f43f5e' },
    ],
  },
  {
    id: 'proj-2',
    name: 'Mobile App v3.0',
    icon: 'lucide:smartphone',
    stages: [
      { id: 'stg-2-1', name: 'Planning', color: '#0ea5e9' },
      { id: 'stg-2-2', name: 'Prototype', color: '#06b6d4' },
      { id: 'stg-2-3', name: 'Development', color: '#14b8a6' },
      { id: 'stg-2-4', name: 'Testing', color: '#10b981' },
      { id: 'stg-2-5', name: 'Release', color: '#22c55e' },
    ],
  },
  {
    id: 'proj-3',
    name: 'CRM Integration',
    icon: 'lucide:database',
    stages: [
      { id: 'stg-3-1', name: 'Requirements', color: '#f59e0b' },
      { id: 'stg-3-2', name: 'API Design', color: '#f97316' },
      { id: 'stg-3-3', name: 'Implementation', color: '#ef4444' },
      { id: 'stg-3-4', name: 'Deployment', color: '#dc2626' },
    ],
  },
  {
    id: 'proj-4',
    name: 'Marketing Campaign',
    icon: 'lucide:megaphone',
    stages: [
      { id: 'stg-4-1', name: 'Strategy', color: '#8b5cf6' },
      { id: 'stg-4-2', name: 'Content Creation', color: '#a855f7' },
      { id: 'stg-4-3', name: 'Review', color: '#c084fc' },
      { id: 'stg-4-4', name: 'Execution', color: '#d8b4fe' },
    ],
  },
  {
    id: 'proj-5',
    name: 'Data Migration',
    icon: 'lucide:hard-drive',
    stages: [
      { id: 'stg-5-1', name: 'Assessment', color: '#64748b' },
      { id: 'stg-5-2', name: 'Mapping', color: '#475569' },
      { id: 'stg-5-3', name: 'Migration', color: '#334155' },
      { id: 'stg-5-4', name: 'Validation', color: '#1e293b' },
    ],
  },
  {
    id: 'proj-6',
    name: 'Enterprise Cloud Migration',
    icon: 'lucide:cloud',
    stages: [
      { id: 'stg-6-1', name: 'Assessment', color: '#0ea5e9' },
      { id: 'stg-6-2', name: 'Architecture', color: '#0284c7' },
      { id: 'stg-6-3', name: 'Migration', color: '#0369a1' },
      { id: 'stg-6-4', name: 'Optimization', color: '#075985' },
    ],
  },
  {
    id: 'proj-7',
    name: 'ERP Implementation',
    icon: 'lucide:blocks',
    stages: [
      { id: 'stg-7-1', name: 'Analysis', color: '#dc2626' },
      { id: 'stg-7-2', name: 'Configuration', color: '#ef4444' },
      { id: 'stg-7-3', name: 'Training', color: '#f87171' },
      { id: 'stg-7-4', name: 'Go-Live', color: '#fca5a5' },
    ],
  },
  {
    id: 'proj-8',
    name: 'Security Audit',
    icon: 'lucide:shield-check',
    stages: [
      { id: 'stg-8-1', name: 'Scanning', color: '#16a34a' },
      { id: 'stg-8-2', name: 'Analysis', color: '#15803d' },
      { id: 'stg-8-3', name: 'Remediation', color: '#166534' },
    ],
  },
  {
    id: 'proj-9',
    name: 'Data Analytics Dashboard',
    icon: 'lucide:bar-chart-3',
    stages: [
      { id: 'stg-9-1', name: 'Data Modeling', color: '#7c3aed' },
      { id: 'stg-9-2', name: 'Visualization', color: '#6d28d9' },
      { id: 'stg-9-3', name: 'Integration', color: '#5b21b6' },
      { id: 'stg-9-4', name: 'Deployment', color: '#4c1d95' },
    ],
  },
  {
    id: 'proj-10',
    name: 'API Integration Platform',
    icon: 'lucide:plug',
    stages: [
      { id: 'stg-10-1', name: 'Design', color: '#0891b2' },
      { id: 'stg-10-2', name: 'Development', color: '#0e7490' },
      { id: 'stg-10-3', name: 'Testing', color: '#155e75' },
      { id: 'stg-10-4', name: 'Documentation', color: '#164e63' },
    ],
  },
  {
    id: 'proj-11',
    name: 'AI Chatbot Development',
    icon: 'lucide:bot',
    stages: [
      { id: 'stg-11-1', name: 'Training Data', color: '#ea580c' },
      { id: 'stg-11-2', name: 'Model Training', color: '#c2410c' },
      { id: 'stg-11-3', name: 'Fine-Tuning', color: '#9a3412' },
      { id: 'stg-11-4', name: 'Deployment', color: '#7c2d12' },
    ],
  },
  {
    id: 'proj-12',
    name: 'E-Commerce Platform',
    icon: 'lucide:shopping-bag',
    stages: [
      { id: 'stg-12-1', name: 'Product Catalog', color: '#db2777' },
      { id: 'stg-12-2', name: 'Payment Gateway', color: '#be185d' },
      { id: 'stg-12-3', name: 'Shipping Logic', color: '#9d174d' },
      { id: 'stg-12-4', name: 'Launch', color: '#831843' },
    ],
  },
  {
    id: 'proj-13',
    name: 'DevOps Pipeline',
    icon: 'lucide:git-branch',
    stages: [
      { id: 'stg-13-1', name: 'CI Setup', color: '#65a30d' },
      { id: 'stg-13-2', name: 'CD Pipeline', color: '#4d7c0f' },
      { id: 'stg-13-3', name: 'Monitoring', color: '#3f6212' },
    ],
  },
  {
    id: 'proj-14',
    name: 'Customer Portal',
    icon: 'lucide:user-circle',
    stages: [
      { id: 'stg-14-1', name: 'UX Research', color: '#2563eb' },
      { id: 'stg-14-2', name: 'Frontend', color: '#1d4ed8' },
      { id: 'stg-14-3', name: 'Backend', color: '#1e40af' },
      { id: 'stg-14-4', name: 'Launch', color: '#1e3a8a' },
    ],
  },
  {
    id: 'proj-15',
    name: 'Inventory Management System',
    icon: 'lucide:warehouse',
    stages: [
      { id: 'stg-15-1', name: 'Requirements', color: '#ca8a04' },
      { id: 'stg-15-2', name: 'Development', color: '#a16207' },
      { id: 'stg-15-3', name: 'Testing', color: '#854d0e' },
      { id: 'stg-15-4', name: 'Rollout', color: '#713f12' },
    ],
  },
  {
    id: 'proj-16',
    name: 'Payment Processing Engine',
    icon: 'lucide:credit-card',
    stages: [
      { id: 'stg-16-1', name: 'Compliance', color: '#059669' },
      { id: 'stg-16-2', name: 'Integration', color: '#047857' },
      { id: 'stg-16-3', name: 'Security Review', color: '#065f46' },
      { id: 'stg-16-4', name: 'Go-Live', color: '#064e3b' },
    ],
  },
  {
    id: 'proj-17',
    name: 'Social Media Automation',
    icon: 'lucide:share-2',
    stages: [
      { id: 'stg-17-1', name: 'Platform Setup', color: '#e11d48' },
      { id: 'stg-17-2', name: 'Content Pipeline', color: '#be123c' },
      { id: 'stg-17-3', name: 'Analytics', color: '#9f1239' },
    ],
  },
  {
    id: 'proj-18',
    name: 'Email Marketing System',
    icon: 'lucide:mail',
    stages: [
      { id: 'stg-18-1', name: 'Template Design', color: '#7c3aed' },
      { id: 'stg-18-2', name: 'Automation Rules', color: '#6d28d9' },
      { id: 'stg-18-3', name: 'A/B Testing', color: '#5b21b6' },
      { id: 'stg-18-4', name: 'Deployment', color: '#4c1d95' },
    ],
  },
  {
    id: 'proj-19',
    name: 'HR Portal Revamp',
    icon: 'lucide:users',
    stages: [
      { id: 'stg-19-1', name: 'Discovery', color: '#0284c7' },
      { id: 'stg-19-2', name: 'Design', color: '#0369a1' },
      { id: 'stg-19-3', name: 'Development', color: '#075985' },
      { id: 'stg-19-4', name: 'UAT', color: '#0c4a6e' },
    ],
  },
  {
    id: 'proj-20',
    name: 'Microservices Architecture',
    icon: 'lucide:boxes',
    stages: [
      { id: 'stg-20-1', name: 'Service Design', color: '#dc2626' },
      { id: 'stg-20-2', name: 'API Gateway', color: '#b91c1c' },
      { id: 'stg-20-3', name: 'Migration', color: '#991b1b' },
      { id: 'stg-20-4', name: 'Testing', color: '#7f1d1d' },
    ],
  },
  {
    id: 'proj-21',
    name: 'Compliance System',
    icon: 'lucide:scale',
    stages: [
      { id: 'stg-21-1', name: 'Audit', color: '#4f46e5' },
      { id: 'stg-21-2', name: 'Implementation', color: '#4338ca' },
      { id: 'stg-21-3', name: 'Verification', color: '#3730a3' },
    ],
  },
  {
    id: 'proj-22',
    name: 'Document Management',
    icon: 'lucide:file-stack',
    stages: [
      { id: 'stg-22-1', name: 'Classification', color: '#d97706' },
      { id: 'stg-22-2', name: 'Digitization', color: '#b45309' },
      { id: 'stg-22-3', name: 'Search Engine', color: '#92400e' },
      { id: 'stg-22-4', name: 'Deployment', color: '#78350f' },
    ],
  },
  {
    id: 'proj-23',
    name: 'Business Intelligence Suite',
    icon: 'lucide:brain',
    stages: [
      { id: 'stg-23-1', name: 'Data Warehouse', color: '#059669' },
      { id: 'stg-23-2', name: 'ETL Pipeline', color: '#047857' },
      { id: 'stg-23-3', name: 'Dashboards', color: '#065f46' },
      { id: 'stg-23-4', name: 'Training', color: '#064e3b' },
    ],
  },
  {
    id: 'proj-24',
    name: 'IoT Sensor Network',
    icon: 'lucide:cpu',
    stages: [
      { id: 'stg-24-1', name: 'Hardware Setup', color: '#7c3aed' },
      { id: 'stg-24-2', name: 'Firmware', color: '#6d28d9' },
      { id: 'stg-24-3', name: 'Cloud Backend', color: '#5b21b6' },
      { id: 'stg-24-4', name: 'Monitoring', color: '#4c1d95' },
    ],
  },
  {
    id: 'proj-25',
    name: 'Video Streaming Platform',
    icon: 'lucide:video',
    stages: [
      { id: 'stg-25-1', name: 'Encoding Pipeline', color: '#e11d48' },
      { id: 'stg-25-2', name: 'CDN Setup', color: '#be123c' },
      { id: 'stg-25-3', name: 'Player UI', color: '#9f1239' },
      { id: 'stg-25-4', name: 'Launch', color: '#881337' },
    ],
  },
  {
    id: 'proj-26',
    name: 'Vendor Management Portal',
    icon: 'lucide:truck',
    stages: [
      { id: 'stg-26-1', name: 'Onboarding Flow', color: '#0891b2' },
      { id: 'stg-26-2', name: 'Procurement', color: '#0e7490' },
      { id: 'stg-26-3', name: 'Reporting', color: '#155e75' },
    ],
  },
  {
    id: 'proj-27',
    name: 'Real-Time Chat System',
    icon: 'lucide:message-circle',
    stages: [
      { id: 'stg-27-1', name: 'WebSocket Server', color: '#16a34a' },
      { id: 'stg-27-2', name: 'Chat UI', color: '#15803d' },
      { id: 'stg-27-3', name: 'File Sharing', color: '#166534' },
      { id: 'stg-27-4', name: 'Notifications', color: '#14532d' },
    ],
  },
  {
    id: 'proj-28',
    name: 'Reporting Engine',
    icon: 'lucide:file-bar-chart',
    stages: [
      { id: 'stg-28-1', name: 'Template System', color: '#ca8a04' },
      { id: 'stg-28-2', name: 'Data Sources', color: '#a16207' },
      { id: 'stg-28-3', name: 'PDF Export', color: '#854d0e' },
    ],
  },
  {
    id: 'proj-29',
    name: 'Single Sign-On (SSO)',
    icon: 'lucide:key-round',
    stages: [
      { id: 'stg-29-1', name: 'SAML Setup', color: '#4f46e5' },
      { id: 'stg-29-2', name: 'OAuth Flow', color: '#4338ca' },
      { id: 'stg-29-3', name: 'Directory Sync', color: '#3730a3' },
      { id: 'stg-29-4', name: 'Testing', color: '#312e81' },
    ],
  },
  {
    id: 'proj-30',
    name: 'Mobile Push Notifications',
    icon: 'lucide:bell-ring',
    stages: [
      { id: 'stg-30-1', name: 'Service Config', color: '#ea580c' },
      { id: 'stg-30-2', name: 'SDK Integration', color: '#c2410c' },
      { id: 'stg-30-3', name: 'Testing', color: '#9a3412' },
    ],
  },
  {
    id: 'proj-31',
    name: 'Search Engine Optimization',
    icon: 'lucide:search',
    stages: [
      { id: 'stg-31-1', name: 'Technical Audit', color: '#2563eb' },
      { id: 'stg-31-2', name: 'Content Strategy', color: '#1d4ed8' },
      { id: 'stg-31-3', name: 'Link Building', color: '#1e40af' },
    ],
  },
  {
    id: 'proj-32',
    name: 'Disaster Recovery Plan',
    icon: 'lucide:shield-alert',
    stages: [
      { id: 'stg-32-1', name: 'Risk Assessment', color: '#dc2626' },
      { id: 'stg-32-2', name: 'Backup Strategy', color: '#b91c1c' },
      { id: 'stg-32-3', name: 'Failover Setup', color: '#991b1b' },
      { id: 'stg-32-4', name: 'DR Drills', color: '#7f1d1d' },
    ],
  },
  {
    id: 'proj-33',
    name: 'Localization & i18n',
    icon: 'lucide:languages',
    stages: [
      { id: 'stg-33-1', name: 'String Extraction', color: '#0d9488' },
      { id: 'stg-33-2', name: 'Translation', color: '#0f766e' },
      { id: 'stg-33-3', name: 'RTL Support', color: '#115e59' },
      { id: 'stg-33-4', name: 'QA Review', color: '#134e4a' },
    ],
  },
  {
    id: 'proj-34',
    name: 'Performance Optimization',
    icon: 'lucide:gauge',
    stages: [
      { id: 'stg-34-1', name: 'Profiling', color: '#65a30d' },
      { id: 'stg-34-2', name: 'Caching Layer', color: '#4d7c0f' },
      { id: 'stg-34-3', name: 'CDN & Assets', color: '#3f6212' },
      { id: 'stg-34-4', name: 'Load Testing', color: '#365314' },
    ],
  },
  {
    id: 'proj-35',
    name: 'Accessibility Compliance',
    icon: 'lucide:accessibility',
    stages: [
      { id: 'stg-35-1', name: 'WCAG Audit', color: '#db2777' },
      { id: 'stg-35-2', name: 'Remediation', color: '#be185d' },
      { id: 'stg-35-3', name: 'Screen Reader QA', color: '#9d174d' },
      { id: 'stg-35-4', name: 'Certification', color: '#831843' },
    ],
  },
]

// Map task IDs to projects and stages for demo data
// Tasks are distributed across all 35 projects
export const taskProjectMap: Record<string, { projectId: string, stageId: string }> = {
  // Project 1: Website Redesign
  'TASK-8782': { projectId: 'proj-1', stageId: 'stg-1-4' },
  'TASK-7878': { projectId: 'proj-1', stageId: 'stg-1-1' },
  'TASK-7839': { projectId: 'proj-1', stageId: 'stg-1-3' },
  // Project 2: Mobile App v3.0
  'TASK-5562': { projectId: 'proj-2', stageId: 'stg-2-2' },
  'TASK-8686': { projectId: 'proj-2', stageId: 'stg-2-3' },
  'TASK-1280': { projectId: 'proj-2', stageId: 'stg-2-5' },
  // Project 3: CRM Integration
  'TASK-7262': { projectId: 'proj-3', stageId: 'stg-3-2' },
  'TASK-1138': { projectId: 'proj-3', stageId: 'stg-3-3' },
  'TASK-7184': { projectId: 'proj-3', stageId: 'stg-3-1' },
  // Project 4: Marketing Campaign
  'TASK-5160': { projectId: 'proj-4', stageId: 'stg-4-1' },
  'TASK-5618': { projectId: 'proj-4', stageId: 'stg-4-3' },
  'TASK-6699': { projectId: 'proj-4', stageId: 'stg-4-4' },
  // Project 5: Data Migration
  'TASK-2858': { projectId: 'proj-5', stageId: 'stg-5-2' },
  'TASK-9864': { projectId: 'proj-5', stageId: 'stg-5-3' },
  // Project 6: Enterprise Cloud Migration
  'TASK-8404': { projectId: 'proj-6', stageId: 'stg-6-1' },
  'TASK-5365': { projectId: 'proj-6', stageId: 'stg-6-2' },
  'TASK-1780': { projectId: 'proj-6', stageId: 'stg-6-3' },
  // Project 7: ERP Implementation
  'TASK-6938': { projectId: 'proj-7', stageId: 'stg-7-1' },
  'TASK-9885': { projectId: 'proj-7', stageId: 'stg-7-2' },
  'TASK-3216': { projectId: 'proj-7', stageId: 'stg-7-4' },
  // Project 8: Security Audit
  'TASK-9285': { projectId: 'proj-8', stageId: 'stg-8-1' },
  'TASK-1024': { projectId: 'proj-8', stageId: 'stg-8-2' },
  // Project 9: Data Analytics Dashboard
  'TASK-7068': { projectId: 'proj-9', stageId: 'stg-9-1' },
  'TASK-6502': { projectId: 'proj-9', stageId: 'stg-9-3' },
  'TASK-5326': { projectId: 'proj-9', stageId: 'stg-9-4' },
  // Project 10: API Integration Platform
  'TASK-6274': { projectId: 'proj-10', stageId: 'stg-10-1' },
  'TASK-1571': { projectId: 'proj-10', stageId: 'stg-10-2' },
  'TASK-9518': { projectId: 'proj-10', stageId: 'stg-10-3' },
  // Project 11: AI Chatbot Development
  'TASK-5581': { projectId: 'proj-11', stageId: 'stg-11-1' },
  'TASK-2197': { projectId: 'proj-11', stageId: 'stg-11-2' },
  'TASK-8484': { projectId: 'proj-11', stageId: 'stg-11-4' },
  // Project 12: E-Commerce Platform
  'TASK-9892': { projectId: 'proj-12', stageId: 'stg-12-1' },
  'TASK-9616': { projectId: 'proj-12', stageId: 'stg-12-2' },
  'TASK-9744': { projectId: 'proj-12', stageId: 'stg-12-3' },
  // Project 13: DevOps Pipeline
  'TASK-1376': { projectId: 'proj-13', stageId: 'stg-13-1' },
  'TASK-7382': { projectId: 'proj-13', stageId: 'stg-13-2' },
  // Project 14: Customer Portal
  'TASK-2290': { projectId: 'proj-14', stageId: 'stg-14-1' },
  'TASK-1533': { projectId: 'proj-14', stageId: 'stg-14-2' },
  'TASK-4920': { projectId: 'proj-14', stageId: 'stg-14-4' },
  // Project 15: Inventory Management System
  'TASK-5168': { projectId: 'proj-15', stageId: 'stg-15-1' },
  'TASK-7103': { projectId: 'proj-15', stageId: 'stg-15-2' },
  'TASK-4314': { projectId: 'proj-15', stageId: 'stg-15-3' },
  // Project 16: Payment Processing Engine
  'TASK-3415': { projectId: 'proj-16', stageId: 'stg-16-1' },
  'TASK-8339': { projectId: 'proj-16', stageId: 'stg-16-2' },
  // Project 17: Social Media Automation
  'TASK-6995': { projectId: 'proj-17', stageId: 'stg-17-1' },
  'TASK-8053': { projectId: 'proj-17', stageId: 'stg-17-2' },
  'TASK-4336': { projectId: 'proj-17', stageId: 'stg-17-3' },
  // Project 18: Email Marketing System
  'TASK-8790': { projectId: 'proj-18', stageId: 'stg-18-1' },
  'TASK-8980': { projectId: 'proj-18', stageId: 'stg-18-2' },
  'TASK-7342': { projectId: 'proj-18', stageId: 'stg-18-4' },
  // Project 19: HR Portal Revamp
  'TASK-5608': { projectId: 'proj-19', stageId: 'stg-19-1' },
  'TASK-1606': { projectId: 'proj-19', stageId: 'stg-19-3' },
  // Project 20: Microservices Architecture
  'TASK-7872': { projectId: 'proj-20', stageId: 'stg-20-1' },
  'TASK-4167': { projectId: 'proj-20', stageId: 'stg-20-2' },
  'TASK-9581': { projectId: 'proj-20', stageId: 'stg-20-4' },
  // Project 21: Compliance System
  'TASK-8806': { projectId: 'proj-21', stageId: 'stg-21-1' },
  'TASK-6542': { projectId: 'proj-21', stageId: 'stg-21-2' },
  // Project 22: Document Management
  'TASK-6806': { projectId: 'proj-22', stageId: 'stg-22-1' },
  'TASK-9549': { projectId: 'proj-22', stageId: 'stg-22-3' },
  'TASK-1075': { projectId: 'proj-22', stageId: 'stg-22-4' },
  // Project 23: Business Intelligence Suite
  'TASK-1427': { projectId: 'proj-23', stageId: 'stg-23-1' },
  'TASK-1907': { projectId: 'proj-23', stageId: 'stg-23-2' },
  'TASK-4309': { projectId: 'proj-23', stageId: 'stg-23-3' },
  // Project 24: IoT Sensor Network
  'TASK-3973': { projectId: 'proj-24', stageId: 'stg-24-1' },
  'TASK-7962': { projectId: 'proj-24', stageId: 'stg-24-2' },
  // Project 25: Video Streaming Platform
  'TASK-3360': { projectId: 'proj-25', stageId: 'stg-25-1' },
  'TASK-9887': { projectId: 'proj-25', stageId: 'stg-25-3' },
  'TASK-3649': { projectId: 'proj-25', stageId: 'stg-25-4' },
  // Project 26: Vendor Management Portal
  'TASK-3586': { projectId: 'proj-26', stageId: 'stg-26-1' },
  'TASK-5150': { projectId: 'proj-26', stageId: 'stg-26-2' },
  // Project 27: Real-Time Chat System
  'TASK-3652': { projectId: 'proj-27', stageId: 'stg-27-1' },
  'TASK-6884': { projectId: 'proj-27', stageId: 'stg-27-2' },
  'TASK-1591': { projectId: 'proj-27', stageId: 'stg-27-4' },
  // Project 28: Reporting Engine
  'TASK-3802': { projectId: 'proj-28', stageId: 'stg-28-1' },
  'TASK-7253': { projectId: 'proj-28', stageId: 'stg-28-2' },
  // Project 29: Single Sign-On (SSO)
  'TASK-9739': { projectId: 'proj-29', stageId: 'stg-29-1' },
  'TASK-4424': { projectId: 'proj-29', stageId: 'stg-29-2' },
  'TASK-3922': { projectId: 'proj-29', stageId: 'stg-29-4' },
  // Project 30: Mobile Push Notifications
  'TASK-4921': { projectId: 'proj-30', stageId: 'stg-30-1' },
  'TASK-5814': { projectId: 'proj-30', stageId: 'stg-30-2' },
  // Project 31: Search Engine Optimization
  'TASK-2645': { projectId: 'proj-31', stageId: 'stg-31-1' },
  'TASK-4535': { projectId: 'proj-31', stageId: 'stg-31-2' },
  'TASK-4463': { projectId: 'proj-31', stageId: 'stg-31-3' },
  // Project 32: Disaster Recovery Plan
  'TASK-9745': { projectId: 'proj-32', stageId: 'stg-32-1' },
  'TASK-2080': { projectId: 'proj-32', stageId: 'stg-32-2' },
  // Project 33: Localization & i18n
  'TASK-3838': { projectId: 'proj-33', stageId: 'stg-33-1' },
  'TASK-1340': { projectId: 'proj-33', stageId: 'stg-33-2' },
  'TASK-6665': { projectId: 'proj-33', stageId: 'stg-33-3' },
  // Project 34: Performance Optimization
  'TASK-7585': { projectId: 'proj-34', stageId: 'stg-34-1' },
  'TASK-6319': { projectId: 'proj-34', stageId: 'stg-34-2' },
  'TASK-4369': { projectId: 'proj-34', stageId: 'stg-34-3' },
  // Project 35: Accessibility Compliance
  'TASK-9035': { projectId: 'proj-35', stageId: 'stg-35-1' },
  'TASK-3970': { projectId: 'proj-35', stageId: 'stg-35-2' },
  'TASK-4473': { projectId: 'proj-35', stageId: 'stg-35-3' },
  // Remaining tasks distributed across projects
  'TASK-4136': { projectId: 'proj-6', stageId: 'stg-6-4' },
  'TASK-3939': { projectId: 'proj-7', stageId: 'stg-7-3' },
  'TASK-2007': { projectId: 'proj-8', stageId: 'stg-8-3' },
  'TASK-7516': { projectId: 'proj-9', stageId: 'stg-9-2' },
  'TASK-6906': { projectId: 'proj-10', stageId: 'stg-10-4' },
  'TASK-5207': { projectId: 'proj-11', stageId: 'stg-11-3' },
  // Additional tasks for Website Redesign / Discovery
  'TASK-2001': { projectId: 'proj-1', stageId: 'stg-1-1' },
  'TASK-2002': { projectId: 'proj-1', stageId: 'stg-1-1' },
  'TASK-2003': { projectId: 'proj-1', stageId: 'stg-1-1' },
  'TASK-2004': { projectId: 'proj-1', stageId: 'stg-1-1' },
  'TASK-2005': { projectId: 'proj-1', stageId: 'stg-1-1' },
}
