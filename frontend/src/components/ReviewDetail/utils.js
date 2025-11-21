// 过滤问题（根据搜索框）
export const filterIssues = (issues, searchText) => {
  if (!searchText.trim()) return issues;
  const text = searchText.toLowerCase();
  return issues.filter(item =>
    item.file?.toLowerCase().includes(text) ||
    item.description?.toLowerCase().includes(text) ||
    item.suggestion?.toLowerCase().includes(text) ||
    item.bug_type?.toLowerCase().includes(text) 
  );
};

// 导出审查报告
export const handleExportReport = (latestReview) => {
  if (!latestReview) return;
  const content = JSON.stringify(latestReview, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PR-${latestReview.pr_number}-审查报告.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 分组问题数据
export const groupIssues = (resultArr, markedIssues = [], t = null) => {
  // 默认翻译函数，如果没有提供翻译函数，则返回原字符串
  const translate = (key, fallback) => {
    return t ? t(key) : fallback;
  };

  // 按文件分组
  const groupedByFile = resultArr.reduce((acc, item) => {
    const key = item.file || translate('utils.unknownFile', '未知文件');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // 按问题类型分组
  const groupedByType = resultArr.reduce((acc, item) => {
    const key = item.bug_type || translate('utils.unknownType', '未知类型');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // 按严重程度分组
  const groupedBySeverity = resultArr.reduce((acc, item) => {
    const key = item.severity || translate('utils.unknownSeverity', '未知程度');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // 按标记分组
  const groupedByMarked = resultArr.reduce((acc, item, index) => {
    const isMarked = markedIssues.includes(index.toString());
    const key = isMarked ? translate('utils.marked', '已标记') : translate('utils.unmarked', '未标记');
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...item, index });
    return acc;
  }, {});

  // 按顽固问题分组
  const groupedByHistorical = resultArr.reduce((acc, item, index) => {
    const isHistorical = item.historical_mention;
    const key = isHistorical ? translate('utils.persistentIssue', '顽固问题') : translate('utils.normalIssue', '普通问题');
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...item, index });
    return acc;
  }, {});

  return {
    groupedByFile,
    groupedByType,
    groupedBySeverity,
    groupedByMarked,
    groupedByHistorical
  };
};