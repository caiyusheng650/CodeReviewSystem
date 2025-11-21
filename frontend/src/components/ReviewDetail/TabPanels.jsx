import React from 'react';
import {
  Box, Accordion, AccordionSummary, AccordionDetails, Chip, Typography, useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import IssueDisplay from './IssueDisplay';
import ChatHistoryPanel from './ChatHistoryPanel';

const TabPanels = ({ 
  activeTab, 
  groupedData, 
  filterIssues, 
  searchText, 
  isDarkMode, 
  markedIssues, 
  handleMarkIssue,
  chatHistory,
  chatHistoryLoading
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;
  
  // 从groupedData对象中解构出各个分组数据
  const { groupedByType, groupedByFile, groupedBySeverity, groupedByMarked, groupedByHistorical } = groupedData || {};
  
  const renderTabPanel = (groupedData, tabIndex, defaultExpandedKey = null) => {
    if (activeTab !== tabIndex) return null;

    return (
      <Box sx={{minWidth:'900px', width: '100%'}}>
        {Object.entries(groupedData).map(([groupKey, issues], index) => {
          const filteredIssues = filterIssues(issues, searchText);
          
          if (filteredIssues.length === 0) return null;


          const getDisplayName = (key) => {
            switch (key) {
              case '已标记': return t('tabPanels.markedIssues');
              case '未标记': return t('tabPanels.unmarkedIssues');
              case '顽固问题': return t('tabPanels.persistentIssues');
              case '普通问题': return t('tabPanels.normalIssues');
              default: return key;
            }
          };

          return (
            <Accordion key={index} sx={{ mb: 2 }} defaultExpanded={groupKey === defaultExpandedKey}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  
                  <Typography variant="h6" sx={{ flex: 1 }}>
                    {getDisplayName(groupKey)}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={t('tabPanels.issuesCount', { count: filteredIssues.length })}
                      color="default"
                      size="small"
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {filteredIssues.map((issue, idx) => (
                    <IssueDisplay
                      key={idx}
                      issue={issue}
                      isDarkMode={isDarkMode}
                      markedIssues={markedIssues}
                      handleMarkIssue={handleMarkIssue}
                      SeverityMap={SeverityMap}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  // 渲染聊天历史标签页
  const renderChatHistoryPanel = () => {
    if (activeTab !== 5) return null;
    
    return (
      <ChatHistoryPanel 
        chatHistory={chatHistory} 
        isDarkMode={isDarkMode}
        chatHistoryLoading={chatHistoryLoading}
      />
    );
  };

  return (
    <div sx={{minWidth:'1700px'}}>
      {/* 按类型分类标签页 */}
      {renderTabPanel(groupedByType, 0)}
      
      {/* 按文件分类标签页 */}
      {renderTabPanel(groupedByFile, 1)}
      
      {/* 按程度分类标签页 */}
      {renderTabPanel(groupedBySeverity, 2)}
      
      {/* 顽固问题标签页 */}
      {renderTabPanel(groupedByHistorical, 3, '顽固问题')}
      
      {/* 已标记问题标签页 */}
      {renderTabPanel(groupedByMarked, 4, '已标记')}
      
      {/* 聊天历史标签页 */}
      {renderChatHistoryPanel()}
    </div>
  );
};

export default TabPanels;