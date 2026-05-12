<script setup lang="ts">
import { ConfigProvider } from 'reka-ui'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const colorMode = useColorMode()
// Force dark mode permanently across the whole app
colorMode.preference = 'dark'

const { locale } = useLocale()

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: '#09090b' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/logo-180.png' },
    { rel: 'manifest', href: '/manifest.json' },
  ],
  htmlAttrs: {
    lang: computed(() => locale.value || 'en'),
    dir: 'ltr',
  },
  bodyAttrs: {
    class: 'dark',
  },
})

const title = 'Adeel Workspace'
const description = 'Adeel Workspace — A comprehensive enterprise resource planning and CRM platform.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: 'https://adeelworkspace.com',
  ogImage: 'https://adeelworkspace.com/social-card.png',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: 'https://adeelworkspace.com/social-card.png',
  twitterCard: 'summary_large_image',
})

const router = useRouter()

defineShortcuts({
  'G-H': () => router.push('/database-creator'),
  'G-A': () => router.push('/array-embedder'),
})
</script>

<template>
  <Body class="overscroll-none antialiased bg-background text-foreground dark">
    <ConfigProvider dir="ltr">
      <div id="app" vaul-drawer-wrapper class="relative">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>

      <Toaster theme="dark" />
    </ConfigProvider>
  </Body>
</template>
