import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 导入语言资源
import en from './locales/en.json'
import zh from './locales/zh.json'

const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  }
}

i18n
  .use(LanguageDetector) // 检测用户语言
  .use(initReactI18next) // 将i18n实例传递给react-i18next
  .init({
    resources,
    fallbackLng: 'zh', // 默认语言
    lng: localStorage.getItem('i18nextLng') || 'zh', // 从localStorage获取语言设置
    debug: false, // 开发模式下开启调试
    interpolation: {
      escapeValue: false // React已经安全地处理了XSS
    },
    detection: {
      order: ['localStorage', 'navigator'], // 检测顺序
      caches: ['localStorage'] // 缓存到localStorage
    }
  })

export default i18n