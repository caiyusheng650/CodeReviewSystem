/**
 * 日期时间格式化工具函数
 * 提供统一的日期时间格式化方法
 */

/**
 * 格式化日期时间为指定格式
 * @param {string|Date} date - 日期时间字符串或Date对象
 * @param {Object} options - 格式化选项
 * @param {boolean} options.showTime - 是否显示时间（默认：true）
 * @param {boolean} options.showYear - 是否显示年份（默认：true）
 * @param {Function} t - 翻译函数
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (date, options = {}, t) => {
  const { showTime = true, showYear = true } = options
  
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return t ? t('dateUtils.invalidDate') : '无效日期'
  }
  
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  const hours = dateObj.getHours()
  const minutes = dateObj.getMinutes()
  const seconds = dateObj.getSeconds()
  
  // 格式化时间部分
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  
  // 格式化日期部分
  let dateStr = ''
  if (showYear) {
    dateStr = t ? `${year}${t('dateUtils.year')} ${month}${t('dateUtils.month')} ${day}${t('dateUtils.day')}` : `${year}年${month}月${day}日`
  } else {
    dateStr = t ? `${month}${t('dateUtils.month')} ${day}${t('dateUtils.day')}` : `${month}月${day}日`
  }
  
  // 组合日期和时间
  if (showTime) {
    return `${dateStr} ${timeStr}`
  } else {
    return dateStr
  }
}

/**
 * 格式化相对时间（如：刚刚、5分钟前、3天前等）
 * @param {string|Date} date - 日期时间字符串或Date对象
 * @param {Function} t - 翻译函数
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (date, t) => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return t ? t('dateUtils.invalidDate') : '无效日期'
  }
  
  const now = new Date()
  const diffInSeconds = Math.floor((now - dateObj) / 1000)
  
  if (diffInSeconds < 60) {
    return t ? t('dateUtils.justNow') : '刚刚'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return t ? t('dateUtils.minutesAgo', { minutes }) : `${minutes}分钟前`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return t ? t('dateUtils.hoursAgo', { hours }) : `${hours}小时前`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return t ? t('dateUtils.daysAgo', { days }) : `${days}天前`
  } else {
    // 超过30天，显示具体日期
    return formatDateTime(dateObj, { showYear: true, showTime: false }, t)
  }
}

/**
 * 智能格式化时间（根据时间远近选择显示方式）
 * @param {string|Date} date - 日期时间字符串或Date对象
 * @param {Function} t - 翻译函数
 * @returns {string} 格式化后的时间字符串
 */
export const formatSmartTime = (date, t) => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return t ? t('dateUtils.invalidDate') : '无效日期'
  }
  
  const now = new Date()
  const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24))
  
  // 如果是今天，显示相对时间
  if (diffInDays === 0) {
    return formatRelativeTime(dateObj, t)
  }
  // 如果是昨天，显示"昨天"
  else if (diffInDays === 1) {
    return t ? t('dateUtils.yesterday') : '昨天'
  }
  // 如果是7天内，显示相对时间
  else if (diffInDays < 7) {
    return t ? t('dateUtils.daysAgo', { days: diffInDays }) : `${diffInDays}天前`
  }
  // 如果是今年内，显示月日
  else if (dateObj.getFullYear() === now.getFullYear()) {
    return formatDateTime(dateObj, { showYear: false, showTime: false }, t)
  }
  // 其他情况显示完整日期
  else {
    return formatDateTime(dateObj, { showYear: true, showTime: false }, t)
  }
}

// 向后兼容的导出
const formatChineseDateTime = (date, options = {}) => formatDateTime(date, options)

export default {
  formatDateTime,
  formatRelativeTime,
  formatSmartTime,
  // 向后兼容
  formatChineseDateTime
}