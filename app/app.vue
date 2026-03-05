<script setup lang="ts">

import { ConfigProvider } from 'reka-ui'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const colorMode = useColorMode()
const color = computed(() => colorMode.value === 'dark' ? '#09090b' : '#ffffff')
const { theme, direction: savedDirection } = useAppSettings()
const { locale } = useLocale()

// SSR-safe direction: read from cookie (works on both server and client)
const dir = computed(() => savedDirection.value === 'rtl' ? 'rtl' : 'ltr')

// Sync the DOM <html dir="..."> attribute on client side
const textDirection = useTextDirection()
onMounted(() => {
  textDirection.value = dir.value
})
watch(dir, (newDir) => {
  textDirection.value = newDir
})

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/logo-180.png' },
    { rel: 'manifest', href: '/manifest.json' },
  ],
  htmlAttrs: {
    lang: computed(() => locale.value || 'en'),
    dir: computed(() => dir.value),
  },
  bodyAttrs: {
    class: computed(() => `color-${theme.value?.color || 'default'} theme-${theme.value?.type || 'default'}`),
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
  'G-H': () => router.push('/projects/list'),
})
</script>

<template>
  <Body class="overscroll-none antialiased bg-background text-foreground">
    <ConfigProvider :dir="dir">
      <div id="app" vaul-drawer-wrapper class="relative">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>

      <Toaster :theme="colorMode.preference as any || 'system'" />
    </ConfigProvider>
  </Body>
</template>
