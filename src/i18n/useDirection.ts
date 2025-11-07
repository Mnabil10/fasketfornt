import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DirectionType } from 'antd/es/config-provider'
import arEG from 'antd/locale/ar_EG'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import 'dayjs/locale/en'

export function useDirection(){
  const { i18n } = useTranslation()
  const isArabic = i18n.language?.startsWith('ar')
  const direction: DirectionType = isArabic ? 'rtl' : 'ltr'
  const locale = isArabic ? arEG : enUS
  useEffect(()=>{
    document.documentElement.lang = isArabic ? 'ar' : 'en'
    document.documentElement.dir = direction
    dayjs.locale(isArabic ? 'ar' : 'en')
  }, [isArabic, direction])
  return useMemo(()=>({ direction, locale, isArabic }), [direction, locale, isArabic])
}
