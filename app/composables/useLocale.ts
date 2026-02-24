import en from '~/locales/en'
import es from '~/locales/es'
import fr from '~/locales/fr'
import ar from '~/locales/ar'
import he from '~/locales/he'

export type LocaleCode = 'en' | 'es' | 'fr' | 'ar' | 'he'
export type TranslationKey = keyof typeof en

const messages: Record<LocaleCode, Record<string, string>> = { en, es, fr, ar, he }

export function useLocale() {
  // useCookie must be called inside a composable function (Nuxt instance required)
  const localeCookie = useCookie<LocaleCode>('app_locale', { default: () => 'en' })

  function setLocale(locale: LocaleCode) {
    localeCookie.value = locale
  }

  function t(key: TranslationKey): string {
    const locale = localeCookie.value
    return messages[locale]?.[key] ?? messages.en[key] ?? key
  }

  return {
    locale: computed(() => localeCookie.value),
    setLocale,
    t,
  }
}
