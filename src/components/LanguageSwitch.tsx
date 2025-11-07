import { Switch } from 'antd'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitch(){
  const { i18n, t } = useTranslation('common')
  const isArabic = i18n.language?.startsWith('ar')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{t('settings.english')}</span>
      <Switch checked={isArabic} onChange={(chk)=> i18n.changeLanguage(chk?'ar':'en')} />
      <span>{t('settings.arabic')}</span>
    </div>
  )
}
