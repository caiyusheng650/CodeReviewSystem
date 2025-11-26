/**
 * 代理相关的工具函数
 */

/**
 * 获取代理头像颜色
 * @param {string} agent - 代理名称
 * @param {object} theme - Material-UI主题对象
 * @returns {string} 颜色值
 */
export const getAgentColor = (agent, theme) => {
  const agentColors = {
    'user': theme.palette.primary.main,
    'ReputationAssessmentAgent': theme.palette.secondary.main,
    'CodeReviewAgent': theme.palette.success.main,
    'ReviewTaskDispatcherAgent': theme.palette.info.main,
    'MaintainabilityReviewAgent': theme.palette.warning.main,
    'LogicErrorReviewAgent': '#e91e63', // 粉色
    'StaticAnalysisReviewAgent': '#9c27b0', // 紫色
    'PerformanceOptimizationReviewAgent': '#ff9800', // 橙色
    'MemorySafetyReviewAgent': '#2196f3', // 蓝色
    'ArchitectureReviewAgent': '#4caf50', // 绿色
    'SecurityVulnerabilityReviewAgent': '#f44336', // 红色
    'FinalReviewAggregatorAgent': '#607d8b', // 蓝灰色
    'default': theme.palette.grey[500]
  };
  return agentColors[agent] || agentColors.default;
};

/**
 * 获取代理显示名称
 * @param {string} agent - 代理名称
 * @param {function} t - 翻译函数
 * @returns {string} 显示名称
 */
export const getAgentDisplayName = (agent, t) => {
  const agentNames = {
    'user': t('common.user'),
    'ReputationAssessmentAgent': t('tabPanels.reputationAssessmentAgent'),
    'CodeReviewAgent': t('tabPanels.codeReviewAgent'),
    'ReviewTaskDispatcherAgent': t('tabPanels.reviewTaskDispatcherAgent'),
    'MaintainabilityReviewAgent': t('tabPanels.maintainabilityReviewAgent'),
    'LogicErrorReviewAgent': t('tabPanels.logicErrorReviewAgent'),
    'StaticAnalysisReviewAgent': t('tabPanels.staticAnalysisReviewAgent'),
    'PerformanceOptimizationReviewAgent': t('tabPanels.performanceOptimizationReviewAgent'),
    'MemorySafetyReviewAgent': t('tabPanels.memorySafetyReviewAgent'),
    'ArchitectureReviewAgent': t('tabPanels.architectureReviewAgent'),
    'SecurityVulnerabilityReviewAgent': t('tabPanels.securityVulnerabilityReviewAgent'),
    'FinalReviewAggregatorAgent': t('tabPanels.finalReviewAggregatorAgent'),
    'default': t('tabPanels.unknownAgent')
  };
  return agentNames[agent] || agentNames.default;
};

/**
 * 检测是否为Markdown内容
 * @param {string} text - 待检测的文本
 * @returns {boolean} 是否为Markdown
 */
export const isMarkdownContent = (text) => {
  if (typeof text !== 'string') return false;
  
  // Markdown常见标记
  const markdownPatterns = [
    /^#+\s/,                    // 标题
    /\*\*[^*]+\*\*/,            // 粗体
    /\*[^*]+\*/,                // 斜体
    /\[.+\]\(.+\)/,            // 链接
    /^-\s/,                     // 列表
    /\d+\.\s/,                  // 有序列表
    /```[\s\S]*```/,           // 代码块
    /`[^`]+`/,                  // 行内代码
    />\s/,                      // 引用
    /\|.*\|.*\|/                // 表格
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
};

/**
 * 渲染Markdown内容的样式配置
 * @param {boolean} isDarkMode - 是否为暗色模式
 * @returns {object} 样式对象
 */
export const getMarkdownStyles = (isDarkMode) => ({
  fontFamily: 'inherit',
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    margin: '8px 0 4px 0',
    fontWeight: 'bold'
  },
  '& h1': { fontSize: '1.4rem' },
  '& h2': { fontSize: '1.3rem' },
  '& h3': { fontSize: '1.2rem' },
  '& h4': { fontSize: '1.1rem' },
  '& h5, & h6': { fontSize: '1rem' },
  '& p': { margin: '4px 0', lineHeight: 1.5 },
  '& ul, & ol': { margin: '4px 0', paddingLeft: '20px' },
  '& li': { margin: '2px 0' },
  '& blockquote': {
    borderLeft: '4px solid',
    borderColor: 'primary.main',
    paddingLeft: '12px',
    margin: '8px 0',
    fontStyle: 'italic',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  },
  '& code': {
    fontFamily: 'monospace',
    backgroundColor: 'transparent',
    borderRadius: '3px',
    fontSize: '0.85em'
  },
  '& pre': {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    margin: '8px 0'
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    margin: '8px 0'
  },
  '& th, & td': {
    border: '1px solid',
    borderColor: 'divider',
    padding: '8px',
    textAlign: 'left'
  },
  '& th': {
    backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
    fontWeight: 'bold'
  },
  '& a': {
    color: 'primary.main',
    textDecoration: 'none'
  },
  '& a:hover': {
    textDecoration: 'underline'
  }
});