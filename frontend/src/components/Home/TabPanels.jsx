import React from 'react';
import {
  Box, Accordion, AccordionSummary, AccordionDetails, Chip, Typography, useTheme
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import IssueDisplay from './IssueDisplay';

const TabPanels = ({ 
  activeTab, 
  groupedData, 
  filterIssues, 
  searchText, 
  isDarkMode, 
  markedIssues, 
  handleMarkIssue
}) => {
  const theme = useTheme();
  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;
  
  // 从groupedData对象中解构出各个分组数据
  const { groupedByType, groupedByFile, groupedBySeverity, groupedByMarked, groupedByHistorical } = groupedData || {};
  
  const renderTabPanel = (groupedData, tabIndex, defaultExpandedKey = null) => {
    if (activeTab !== tabIndex) return null;

    return (
      <Box sx={{minWidth:'900px'}}>
        {Object.entries(groupedData).map(([groupKey, issues], index) => {
          const filteredIssues = filterIssues(issues, searchText);
          
          if (filteredIssues.length === 0) return null;


          const getDisplayName = (key) => {
            switch (key) {
              case '已标记': return '已标记问题';
              case '未标记': return '未标记问题';
              case '顽固问题': return '顽固问题';
              case '普通问题': return '普通问题';
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
                      label={`${filteredIssues.length}个问题`}
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

  return (
    <>
      {/* 按类型分类标签页 */}
      {renderTabPanel(groupedByType, 0)}
      
      {/* 按文件分类标签页 */}
      {renderTabPanel(groupedByFile, 1)}
      
      {/* 按程度分类标签页 */}
      {renderTabPanel(groupedBySeverity, 2)}
      
      {/* 已标记问题标签页 */}
      {renderTabPanel(groupedByMarked, 4, '已标记')}
      
      {/* 顽固问题标签页 */}
      {renderTabPanel(groupedByHistorical, 3, '顽固问题')}
    </>
  );
};

export default TabPanels;