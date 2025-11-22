# review/utils.py
# 工具函数模块

import json
import codecs
from typing import Tuple, Any

class JSONParser:
    """JSON解析工具类"""
    
    @staticmethod
    def try_parse_json(txt: str) -> Tuple[bool, Any]:
        """尝试解析JSON，支持多种格式"""
        if not isinstance(txt, str):
            return False, None
        
        # 解析方法列表
        parse_methods = [
            lambda x: json.loads(x),  # 标准JSON
            lambda x: json.loads(codecs.decode(x, "unicode_escape")),  # Unicode转义
            lambda x: json.loads(x.replace('\\"', '"').replace('\\\\n', '\\n').replace('\\n', '\n').replace('\\t', '\t'))  # 转义字符处理
        ]
        
        for parse_method in parse_methods:
            try:
                return True, parse_method(txt)
            except Exception:
                continue
        return False, None
    
    @staticmethod
    def normalize_content(content: str) -> str:
        """规范化内容"""
        ok, parsed = JSONParser.try_parse_json(content)
        if ok:
            return json.dumps(parsed, ensure_ascii=False, indent=2)
        
        try:
            return codecs.decode(content, "unicode_escape")
        except Exception:
            return content

class ContentAnalyzer:
    """内容分析工具类"""
    
    @staticmethod
    def should_mark_as_final(content: str, agent_name: str) -> bool:
        """判断是否应该标记为final状态"""
        if (content.startswith("{") or content.startswith("[")) and len(content) > 200:
            return True
        if "final" in agent_name.lower() or "aggregator" in agent_name.lower():
            return True
        return False
    
    @staticmethod
    def analyze_historical_comments(pr_comments: list) -> dict:
        """分析历史评论，识别重复提及但未修复的问题"""
        historical_issues = {}
        
        # 分析评论内容，识别重复问题
        for comment in pr_comments:
            body = comment.get('body', '').lower()
            
            # 识别常见问题类型
            issue_types = {
                'memory_leak': ['内存泄漏', 'memory leak', 'leak'],
                'security': ['安全', 'security', 'vulnerability', '漏洞'],
                'performance': ['性能', 'performance', 'slow', '慢'],
                'logic': ['逻辑', 'logic', '错误', 'bug'],
                'maintainability': ['维护', 'maintainability', '可读性', 'readability']
            }
            
            for issue_type, keywords in issue_types.items():
                if any(keyword in body for keyword in keywords):
                    if issue_type not in historical_issues:
                        historical_issues[issue_type] = {
                            'count': 0,
                            'comments': [],
                            'first_mentioned': comment.get('created_at', 'unknown')
                        }
                    historical_issues[issue_type]['count'] += 1
                    historical_issues[issue_type]['comments'].append({
                        'body': comment.get('body', ''),
                        'line': comment.get('line', None),
                        'file': comment.get('path', '')
                    })
        
        # 过滤出重复提及的问题（出现2次以上）
        repeated_issues = {}
        for issue_type, data in historical_issues.items():
            if data['count'] >= 2:  # 至少出现2次
                repeated_issues[issue_type] = data
        
        return repeated_issues
    
    @staticmethod
    def build_prompt(
        code_diff: str,
        pr_comments: list,
        developer_reputation_score: int,
        developer_reputation_history: list,
        repository_readme: str
    ) -> str:
        """构建审查提示词"""
        comments_preview = pr_comments
        history_preview = developer_reputation_history
        
        # 分析历史评论，识别重复问题
        historical_issues = ContentAnalyzer.analyze_historical_comments(pr_comments)
        
        if developer_reputation_score >= 80:
            rep_label = "high"
        elif developer_reputation_score >= 60:
            rep_label = "medium"
        else:
            rep_label = "low"

        payload = {
            "metadata": {
                "developer_reputation_label": rep_label,
                "developer_reputation_history": history_preview,
                "historical_issues_analysis": historical_issues
            },
            "repository_readme_excerpt": repository_readme,
            "pr_comments": comments_preview,
            "code_diff": code_diff,
        }
        return json.dumps(payload, ensure_ascii=False, indent=2)

class ResultFormatter:
    """结果格式化工具类"""
    
    @staticmethod
    def format_final_result(final_result: str) -> str:
        """格式化最终结果"""
        if not isinstance(final_result, str) or not final_result:
            return final_result
        
        ok, parsed = JSONParser.try_parse_json(final_result)
        if ok:
            return json.dumps(parsed, ensure_ascii=False, indent=2)
        else:
            # 尝试简单清理
            return final_result.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')