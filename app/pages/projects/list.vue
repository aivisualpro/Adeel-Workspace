<script setup lang="ts">
const columns = [
  { key: 'name', label: 'Project' },
  { key: 'client', label: 'Client' },
  { key: 'status', label: 'Status', type: 'badge' as const },
  { key: 'progress', label: 'Progress', type: 'progress' as const },
  { key: 'budget', label: 'Budget', type: 'currency' as const },
  { key: 'team', label: 'Team Size', type: 'number' as const },
  { key: 'endDate', label: 'Deadline', type: 'date' as const },
]

const formFields = [
  { key: 'name', label: 'Project Name', placeholder: 'Website Redesign' },
  { key: 'client', label: 'Client', placeholder: 'TechVision Inc' },
  { key: 'status', label: 'Status', type: 'select' as const, options: [
    { label: 'In Progress', value: 'In Progress' },
    { label: 'On Track', value: 'On Track' },
    { label: 'At Risk', value: 'At Risk' },
    { label: 'On Hold', value: 'On Hold' },
    { label: 'Completed', value: 'Completed' },
  ] },
  { key: 'progress', label: 'Progress (%)', type: 'number' as const, placeholder: '65' },
  { key: 'budget', label: 'Budget ($)', type: 'number' as const, placeholder: '50000' },
  { key: 'team', label: 'Team Size', type: 'number' as const, placeholder: '5' },
  { key: 'startDate', label: 'Start Date', type: 'date' as const },
  { key: 'endDate', label: 'Deadline', type: 'date' as const },
  { key: 'description', label: 'Description', type: 'textarea' as const, placeholder: 'Project overview...' },
]

const seedData = [
  { id: 'pj1', name: 'Website Redesign', client: 'CloudNine Tech', status: 'In Progress', progress: 65, budget: 35000, team: 4, startDate: '2026-01-15', endDate: '2026-04-15' },
  { id: 'pj2', name: 'Mobile App v3.0', client: 'BrightPath', status: 'On Track', progress: 42, budget: 120000, team: 6, startDate: '2026-01-10', endDate: '2026-06-15' },
  { id: 'pj3', name: 'CRM Integration', client: 'Meridian Corp', status: 'At Risk', progress: 35, budget: 95000, team: 5, startDate: '2025-11-01', endDate: '2026-03-31' },
  { id: 'pj4', name: 'Marketing Campaign', client: 'Apex Group', status: 'In Progress', progress: 70, budget: 28000, team: 3, startDate: '2026-01-20', endDate: '2026-03-30' },
  { id: 'pj5', name: 'Data Migration', client: 'DataFlow AI', status: 'Completed', progress: 100, budget: 48000, team: 4, startDate: '2025-10-01', endDate: '2026-01-20' },
  { id: 'pj6', name: 'Enterprise Cloud Migration', client: 'TechVision Inc', status: 'In Progress', progress: 68, budget: 185000, team: 8, startDate: '2025-11-01', endDate: '2026-04-30' },
  { id: 'pj7', name: 'ERP Implementation', client: 'Meridian Corp', status: 'At Risk', progress: 35, budget: 340000, team: 12, startDate: '2025-09-01', endDate: '2026-03-31' },
  { id: 'pj8', name: 'Security Audit', client: 'Apex Group', status: 'In Progress', progress: 85, budget: 48000, team: 3, startDate: '2026-01-15', endDate: '2026-02-28' },
  { id: 'pj9', name: 'Data Analytics Dashboard', client: 'DataFlow AI', status: 'Completed', progress: 100, budget: 95000, team: 5, startDate: '2025-10-01', endDate: '2026-01-20' },
  { id: 'pj10', name: 'API Integration Platform', client: 'GlobalSoft', status: 'On Track', progress: 55, budget: 72000, team: 4, startDate: '2025-12-15', endDate: '2026-05-01' },
  { id: 'pj11', name: 'AI Chatbot Development', client: 'BlueOcean AI', status: 'In Progress', progress: 72, budget: 65000, team: 4, startDate: '2025-11-15', endDate: '2026-03-15' },
  { id: 'pj12', name: 'E-Commerce Platform', client: 'ShopVerse', status: 'On Track', progress: 48, budget: 150000, team: 7, startDate: '2026-01-01', endDate: '2026-06-30' },
  { id: 'pj13', name: 'DevOps Pipeline', client: 'InfraCore', status: 'In Progress', progress: 60, budget: 42000, team: 3, startDate: '2026-01-10', endDate: '2026-03-20' },
  { id: 'pj14', name: 'Customer Portal', client: 'ClientFirst', status: 'On Track', progress: 38, budget: 88000, team: 5, startDate: '2026-01-20', endDate: '2026-05-15' },
  { id: 'pj15', name: 'Inventory Management System', client: 'LogiTrack', status: 'In Progress', progress: 55, budget: 78000, team: 4, startDate: '2025-12-01', endDate: '2026-04-01' },
  { id: 'pj16', name: 'Payment Processing Engine', client: 'FinSecure', status: 'At Risk', progress: 30, budget: 120000, team: 6, startDate: '2025-11-15', endDate: '2026-03-01' },
  { id: 'pj17', name: 'Social Media Automation', client: 'BuzzMetrics', status: 'On Track', progress: 62, budget: 35000, team: 3, startDate: '2026-01-05', endDate: '2026-03-25' },
  { id: 'pj18', name: 'Email Marketing System', client: 'MailPulse', status: 'In Progress', progress: 50, budget: 42000, team: 3, startDate: '2026-01-15', endDate: '2026-04-10' },
  { id: 'pj19', name: 'HR Portal Revamp', client: 'PeopleFirst HR', status: 'On Hold', progress: 20, budget: 65000, team: 4, startDate: '2026-02-01', endDate: '2026-05-30' },
  { id: 'pj20', name: 'Microservices Architecture', client: 'ScaleTech', status: 'In Progress', progress: 45, budget: 180000, team: 8, startDate: '2025-10-15', endDate: '2026-04-15' },
  { id: 'pj21', name: 'Compliance System', client: 'RegGuard', status: 'In Progress', progress: 75, budget: 55000, team: 3, startDate: '2025-12-01', endDate: '2026-02-28' },
  { id: 'pj22', name: 'Document Management', client: 'DocuVault', status: 'On Track', progress: 40, budget: 62000, team: 4, startDate: '2026-01-10', endDate: '2026-04-20' },
  { id: 'pj23', name: 'Business Intelligence Suite', client: 'InsightPro', status: 'In Progress', progress: 58, budget: 135000, team: 6, startDate: '2025-11-01', endDate: '2026-05-01' },
  { id: 'pj24', name: 'IoT Sensor Network', client: 'SmartEdge IoT', status: 'At Risk', progress: 25, budget: 210000, team: 9, startDate: '2025-10-01', endDate: '2026-06-01' },
  { id: 'pj25', name: 'Video Streaming Platform', client: 'StreamLine', status: 'On Track', progress: 52, budget: 175000, team: 7, startDate: '2025-12-15', endDate: '2026-06-15' },
  { id: 'pj26', name: 'Vendor Management Portal', client: 'SupplyHub', status: 'In Progress', progress: 65, budget: 45000, team: 3, startDate: '2026-01-05', endDate: '2026-03-15' },
  { id: 'pj27', name: 'Real-Time Chat System', client: 'Chatify', status: 'On Track', progress: 48, budget: 58000, team: 4, startDate: '2026-01-20', endDate: '2026-04-30' },
  { id: 'pj28', name: 'Reporting Engine', client: 'ReportIQ', status: 'In Progress', progress: 70, budget: 38000, team: 3, startDate: '2025-12-10', endDate: '2026-03-10' },
  { id: 'pj29', name: 'Single Sign-On (SSO)', client: 'AuthSecure', status: 'In Progress', progress: 80, budget: 52000, team: 3, startDate: '2025-12-01', endDate: '2026-02-20' },
  { id: 'pj30', name: 'Mobile Push Notifications', client: 'NotifyPro', status: 'On Track', progress: 55, budget: 28000, team: 2, startDate: '2026-01-15', endDate: '2026-03-10' },
  { id: 'pj31', name: 'Search Engine Optimization', client: 'RankBoost', status: 'In Progress', progress: 45, budget: 22000, team: 2, startDate: '2026-01-10', endDate: '2026-04-10' },
  { id: 'pj32', name: 'Disaster Recovery Plan', client: 'SafeNet Corp', status: 'At Risk', progress: 30, budget: 95000, team: 5, startDate: '2025-11-15', endDate: '2026-03-15' },
  { id: 'pj33', name: 'Localization & i18n', client: 'GlobeConnect', status: 'On Track', progress: 60, budget: 32000, team: 3, startDate: '2026-01-20', endDate: '2026-03-20' },
  { id: 'pj34', name: 'Performance Optimization', client: 'SpeedCore', status: 'In Progress', progress: 50, budget: 40000, team: 3, startDate: '2026-01-05', endDate: '2026-03-25' },
  { id: 'pj35', name: 'Accessibility Compliance', client: 'IncludeAll', status: 'On Track', progress: 35, budget: 28000, team: 2, startDate: '2026-02-01', endDate: '2026-04-15' },
]
</script>

<template>
  <ErpCrudPage store-key="proj-list" title="Projects" description="Enterprise project management with progress tracking and budget control." icon="i-lucide-folder-kanban" entity-name="Project" :columns="columns" :form-fields="formFields" :initial-data="seedData" />
</template>
