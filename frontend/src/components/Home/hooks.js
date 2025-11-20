import { useState, useEffect } from 'react';
import { codeReviewAPI } from '../../services/api/codeReviewAPI';
import { groupIssues } from './utils';

export const useHomeData = (authUser, propUser) => {
  const [user, setUser] = useState(propUser || authUser);
  const [latestReview, setLatestReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parsedFinalResult, setParsedFinalResult] = useState([]);
  const [markedIssues, setMarkedIssues] = useState([]);
  const [groupedData, setGroupedData] = useState({
    groupedByFile: {},
    groupedByType: {},
    groupedBySeverity: {},
    groupedByMarked: {},
    groupedByHistorical: {}
  });

  // 获取最近审查记录
  useEffect(() => {
    setUser(propUser || authUser);

    const fetchLatestReview = async () => {
      try {
        setLoading(true);
        setError(null);
        // 使用基础信息API获取最近审查记录（不包含diff_content等大字段）
        let review = await codeReviewAPI.getLatestReviewBase();
        setLatestReview(review);
      } catch (err) {
        if (err.response?.status === 404) {
          setLatestReview(null);
        } else {
          setError('获取最近审查记录失败：' + (err.response?.data?.message || err.message));
        }
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchLatestReview();
    }
  }, [propUser, authUser]);

  // 从final_result解析JSON数据并分组
  useEffect(() => {
    if (latestReview?.final_result) {
      try {
        const resultArr = Object.values(latestReview.final_result);
        setParsedFinalResult(resultArr);

        resultArr.forEach((item, index) => {
          item.index = index;
        });

        // 获取标记的问题列表
        if (latestReview.marked_issues) {
          setMarkedIssues(latestReview.marked_issues);
        }

        // 分组数据
        const grouped = groupIssues(resultArr, latestReview.marked_issues || []);
        setGroupedData(grouped);
      } catch (err) {
        setError('解析审查结果失败：' + err.message);
      }
    }
  }, [latestReview]);

  // 标记问题
  const handleMarkIssue = async (issueId, marked) => {
    if (!latestReview) return;
    
    try {
      const response = await codeReviewAPI.markIssue(latestReview._id, issueId, marked);
      
      // 更新本地标记状态
      setMarkedIssues(response.marked_issues);
      
      // 更新latestReview中的标记状态
      setLatestReview({
        ...latestReview,
        marked_issues: response.marked_issues
      });
      
      // 重新分组数据
      const resultArr = Object.values(latestReview.final_result);
      const grouped = groupIssues(resultArr, response.marked_issues);
      setGroupedData(grouped);
      
    } catch (err) {
      console.error('标记问题失败：', err);
      setError('标记问题失败：' + (err.response?.data?.message || err.message));
    }
  };

  return {
    user,
    latestReview,
    loading,
    error,
    parsedFinalResult,
    markedIssues,
    groupedData,
    handleMarkIssue,
    setError
  };
};