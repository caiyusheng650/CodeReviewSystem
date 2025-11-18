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
    def build_prompt(
        code_diff: str,
        pr_comments: list,
        developer_reputation_score: int,
        developer_reputation_history: list,
        repository_readme: str
    ) -> str:
        """构建审查提示词"""
        comments_preview = pr_comments[:20]
        history_preview = developer_reputation_history[:10]
        
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
            },
            "repository_readme_excerpt": repository_readme[:4000],
            "pr_comments": comments_preview,
            "code_diff": code_diff[:40000],
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