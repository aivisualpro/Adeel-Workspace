<script setup lang="ts">
import { accounts, mails } from '@/components/mail/data/mails'

const { setHeader } = usePageHeader()
setHeader({ titleKey: 'email.title', icon: 'i-lucide-mail', descriptionKey: 'email.description' })
</script>

<template>
  <div class="-m-4 lg:-m-6">
    <MailLayout
      :accounts="accounts"
      :mails="mails"
      :nav-collapsed-size="4"
    />
  </div>
</template>
