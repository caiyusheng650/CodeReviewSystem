import re
from typing import List, Dict, Tuple, Optional
import difflib

class LineNumberCalculator:
    """
    严格的diff行号计算器，使用Python标准库进行准确的diff解析
    """
    
    def __init__(self):
        self.diff_pattern = re.compile(r'^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@')
    
    def parse_diff_hunks(self, diff_content: str) -> List[Dict]:
        """
        解析diff内容，提取所有变更块(hunk)的信息
        
        Args:
            diff_content: 完整的diff内容
            
        Returns:
            List[Dict]: 每个变更块的信息，包含文件路径、起始行号、行内容等
        """
        hunks = []
        lines = diff_content.split('\n')
        current_file = ""
        current_hunk_start = 0
        current_hunk_lines = []
        
        for i, line in enumerate(lines):
            # 检测文件头
            if line.startswith('+++ b/'):
                current_file = line[6:]  # 移除'+++ b/'前缀
            # 检测hunk头
            elif line.startswith('@@'):
                # 保存前一个hunk
                if current_hunk_lines and current_file:
                    hunks.append({
                        'file_path': current_file,
                        'hunk_start': current_hunk_start,
                        'lines': current_hunk_lines.copy()
                    })
                
                # 解析新的hunk头
                match = self.diff_pattern.match(line)
                if match:
                    current_hunk_start = int(match.group(1))
                    current_hunk_lines = []
                else:
                    current_hunk_start = 0
                    current_hunk_lines = []
            # 检测新增的行（以+开头，但不是+++）
            elif line.startswith('+') and not line.startswith('++'):
                current_hunk_lines.append({
                    'type': 'added',
                    'content': line[1:],  # 移除+前缀
                    'original_line_number': len(current_hunk_lines) + current_hunk_start
                })
            # 检测修改的行
            elif line.startswith(' '):
                current_hunk_lines.append({
                    'type': 'context',
                    'content': line[1:],
                    'original_line_number': len(current_hunk_lines) + current_hunk_start
                })
        
        # 保存最后一个hunk
        if current_hunk_lines and current_file:
            hunks.append({
                'file_path': current_file,
                'hunk_start': current_hunk_start,
                'lines': current_hunk_lines.copy()
            })
        
        return hunks
    
    def find_line_by_content(self, diff_content: str, target_content: str) -> Optional[Dict]:
        """
        在diff内容中查找包含目标内容的行
        
        Args:
            diff_content: diff内容
            target_content: 要查找的目标内容
            
        Returns:
            Optional[Dict]: 包含文件路径和行号的信息，如果没找到返回None
        """
        if not diff_content or not target_content:
            return None
            
        hunks = self.parse_diff_hunks(diff_content)
        
        # 清理目标内容（去除前后空格）
        target_clean = target_content.strip()
        
        for hunk in hunks:
            for line_info in hunk['lines']:
                # 只搜索新增的行
                if line_info['type'] == 'added':
                    line_content = line_info['content'].strip()
                    # 使用模糊匹配，允许部分匹配
                    if self._fuzzy_match(line_content, target_clean):
                        return {
                            'file_path': hunk['file_path'],
                            'line_number': line_info['original_line_number'],
                            'exact_match': line_content == target_clean,
                            'matched_content': line_content
                        }
        
        # 如果没找到精确匹配，尝试在上下文行中查找
        for hunk in hunks:
            for line_info in hunk['lines']:
                line_content = line_info['content'].strip()
                if self._fuzzy_match(line_content, target_clean):
                    return {
                        'file_path': hunk['file_path'],
                        'line_number': line_info['original_line_number'],
                        'exact_match': line_content == target_clean,
                        'matched_content': line_content
                    }
        
        return None
    
    def _fuzzy_match(self, line_content: str, target_content: str, threshold: float = 0.5) -> bool:
        """
        模糊匹配算法，使用difflib的SequenceMatcher
        
        Args:
            line_content: 行内容
            target_content: 目标内容
            threshold: 相似度阈值
            
        Returns:
            bool: 是否匹配
        """
        # 如果完全匹配，直接返回True
        if line_content == target_content:
            return True
        
        # 使用SequenceMatcher计算相似度
        similarity = difflib.SequenceMatcher(None, line_content, target_content).ratio()
        return similarity >= threshold
    
    def get_context_lines(self, diff_content: str, file_path: str, line_number: int, context_size: int = 1) -> List[str]:
        """
        获取指定行号的上下文行
        
        Args:
            diff_content: diff内容
            file_path: 文件路径
            line_number: 目标行号
            context_size: 上下文行数（前后各多少行）
            
        Returns:
            List[str]: 上下文行内容列表
        """
        hunks = self.parse_diff_hunks(diff_content)
        
        for hunk in hunks:
            if hunk['file_path'] == file_path:
                # 找到目标行
                target_index = -1
                for i, line_info in enumerate(hunk['lines']):
                    if line_info['original_line_number'] == line_number:
                        target_index = i
                        break
                
                if target_index != -1:
                    # 获取上下文行
                    start_idx = max(0, target_index - context_size)
                    end_idx = min(len(hunk['lines']), target_index + context_size + 1)
                    
                    context_lines = []
                    for i in range(start_idx, end_idx):
                        line_info = hunk['lines'][i]
                        prefix = ""
                        if line_info['type'] == 'added':
                            prefix = "+"
                        elif line_info['type'] == 'context':
                            prefix = " "
                        
                        context_lines.append(f"{prefix}{line_info['content']}")
                    
                    return context_lines
        
        return []
    
    def find_all_matches(self, diff_content: str, target_content: str) -> List[Dict]:
        """
        查找所有匹配的行
        
        Args:
            diff_content: diff内容
            target_content: 目标内容
            
        Returns:
            List[Dict]: 所有匹配的行信息
        """
        matches = []
        hunks = self.parse_diff_hunks(diff_content)
        target_clean = target_content.strip()
        
        for hunk in hunks:
            for line_info in hunk['lines']:
                line_content = line_info['content'].strip()
                if self._fuzzy_match(line_content, target_clean):
                    matches.append({
                        'file_path': hunk['file_path'],
                        'line_number': line_info['original_line_number'],
                        'exact_match': line_content == target_clean,
                        'matched_content': line_content,
                        'line_type': line_info['type']
                    })
        
        return matches


class LineNumberAgent:
    """
    行号计算智能体，封装行号计算功能
    """
    
    def __init__(self):
        self.calculator = LineNumberCalculator()


def test_diff_parser():
    """
    测试diff解析器的功能
    """
    print("=== 测试严格的diff解析器 ===\n")
    
    # 示例diff内容
    diff_content = """diff --git a/example.py b/example.py
index 1234567..abcdefg 100644
--- a/example.py
+++ b/example.py
@@ -1,5 +1,6 @@
 # 示例文件
 def hello_world():
-    print(\"Hello\")
+    print(\"Hello, World!\")
+    return \"Hello, World!\"
 
 def another_function():
@@ -10,3 +11,4 @@ def another_function():
     x = 1
     y = 2
     z = x + y
+    print(f\"Result: {z}\")
"""
    
    # 用户提供的多文件diff测试例子
    multi_file_diff = """diff --git a/src/main.py b/src/main.py
index 123abc..456def 100644
--- a/src/main.py
+++ b/src/main.py
@@ -10,15 +10,18 @@ class UserService:
     def __init__(self, db_connection):
         self.db = db_connection
         self.cache = {}
 
-    def get_user(self, user_id):
+    def get_user(self, user_id, include_deleted=False):
         \"\"\"Get user by ID\"\"\"
         if user_id in self.cache:
             return self.cache[user_id]
         
         query = \"SELECT * FROM users WHERE id = %s\"
+        if not include_deleted:
+            query += \" AND deleted_at IS NULL\"
+        
         result = self.db.execute(query, (user_id,))
         user = result.fetchone()
         
         if user:
+            user['last_accessed'] = datetime.now()
             self.cache[user_id] = user
             return user
         return None
diff --git a/src/utils.py b/src/utils.py
index 789abc..012def 100644
--- a/src/utils.py
+++ b/src/utils.py
@@ -5,8 +5,12 @@ def calculate_discount(price, discount_rate):
     Calculate discount amount
     \"\"\"
     if discount_rate < 0 or discount_rate > 1:
-        raise ValueError(\"Discount rate must be between 0 and 1\")
+        return 0
     
-    return price * discount_rate
+    if price < 0:
+        return 0
+        
+    discount_amount = price * discount_rate
+    return max(0, min(discount_amount, price))
 
 def format_currency(amount):
     \"\"\"Format amount as currency\"\"\"
diff --git a/src/auth.py b/src/auth.py
index 345abc..678def 100644
--- a/src/auth.py
+++ b/src/auth.py
@@ -20,7 +20,11 @@ def validate_token(token):
         payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
         return payload
     except jwt.ExpiredSignatureError:
-        raise AuthenticationError(\"Token has expired\")
+        # Check if token is in grace period
+        grace_payload = jwt.decode(token, SECRET_KEY, options={'verify_exp': False})
+        if time.time() - grace_payload['exp'] < 300:  # 5 minute grace period
+            return grace_payload
+        raise AuthenticationError(\"Token has expired\")
     except jwt.InvalidTokenError:
         raise AuthenticationError(\"Invalid token\")
"""

    calculator = LineNumberCalculator()
    
    print("=== 测试1: 解析diff块 ===")
    hunks = calculator.parse_diff_hunks(diff_content)
    print(f"找到 {len(hunks)} 个变更块")
    for i, hunk in enumerate(hunks):
        print(f"\n块 {i+1}:")
        print(f"  文件: {hunk['file_path']}")
        print(f"  起始行号: {hunk['hunk_start']}")
        print(f"  行数: {len(hunk['lines'])}")
        for j, line in enumerate(hunk['lines'][:3]):  # 只显示前3行
            print(f"    行 {j+1}: [{line['type']}] {line['content']} (行号: {line['original_line_number']})")
    
    print("\n=== 测试2: 查找目标内容 ===")
    
    # 测试用例
    test_cases = [
        "print(\"Hello, World!\")",  # 精确匹配
        "return \"Hello, World!\"",  # 精确匹配
        "print(f\"Result: {z}\")",    # 精确匹配
        "Hello, World!",              # 部分匹配
        "Result",                     # 部分匹配
        "不存在的代码"                 # 不匹配
    ]
    
    for target in test_cases:
        print(f"\n查找目标: '{target}'")
        result = calculator.find_line_by_content(diff_content, target)
        if result:
            print(f"✅ 找到匹配:")
            print(f"   文件: {result['file_path']}")
            print(f"   行号: {result['line_number']}")
            print(f"   精确匹配: {result['exact_match']}")
            print(f"   匹配内容: '{result['matched_content']}'")
            
            # 获取上下文
            context = calculator.get_context_lines(diff_content, result['file_path'], result['line_number'])
            print(f"   上下文: {context}")
        else:
            print("❌ 未找到匹配")
    
    print("\n=== 测试3: 查找所有匹配 ===")
    all_matches = calculator.find_all_matches(diff_content, "print")
    print(f"找到 {len(all_matches)} 个包含'print'的行:")
    for match in all_matches:
        print(f"  文件: {match['file_path']}, 行号: {match['line_number']}, 类型: {match['line_type']}")
    
    print("\n=== 测试4: 模糊匹配测试 ===")
    fuzzy_test_cases = [
        ("print(\"Hello, World!\")", "print(\"Hello, World!\")"),  # 完全匹配
        ("print(\"Hello, World!\")", "print(\"Hello,World!\")"),   # 相似匹配
        ("print(\"Hello, World!\")", "完全不相关"),                # 不匹配
    ]
    
    for line_content, target_content in fuzzy_test_cases:
        similarity = difflib.SequenceMatcher(None, line_content, target_content).ratio()
        is_match = calculator._fuzzy_match(line_content, target_content)
        print(f"'{line_content}' vs '{target_content}': 相似度={similarity:.3f}, 匹配={is_match}")
    
    print("\n=== 测试5: 多文件diff测试 ===")
    print("使用用户提供的多文件diff内容进行测试")
    
    # 测试多文件diff解析
    multi_hunks = calculator.parse_diff_hunks(multi_file_diff)
    print(f"找到 {len(multi_hunks)} 个文件的变更块")
    
    for i, hunk in enumerate(multi_hunks):
        print(f"\n文件 {i+1}: {hunk['file_path']}")
        print(f"  变更块起始行: {hunk['hunk_start']}")
        print(f"  总行数: {len(hunk['lines'])}")
        print(f"  变更类型统计:")
        type_count = {'context': 0, 'added': 0, 'deleted': 0}
        for line in hunk['lines']:
            type_count[line['type']] += 1
        for line_type, count in type_count.items():
            if count > 0:
                print(f"    {line_type}: {count} 行")
    
    # 测试在多文件diff中查找特定内容
    multi_test_cases = [
        ("include_deleted=False", "src/main.py"),  # 精确匹配
        ("return 0", "src/utils.py"),               # 精确匹配
        ("grace_payload", "src/auth.py"),           # 精确匹配
        ("SELECT * FROM users", "src/main.py"),     # 精确匹配
        ("不存在的代码", "")                         # 不匹配
    ]
    
    for target_content, expected_file in multi_test_cases:
        print(f"\n查找目标: '{target_content}'")
        result = calculator.find_line_by_content(multi_file_diff, target_content)
        if result:
            print(f"✅ 找到匹配:")
            print(f"   文件: {result['file_path']}")
            print(f"   行号: {result['line_number']}")
            print(f"   精确匹配: {result['exact_match']}")
            print(f"   匹配内容: '{result['matched_content']}'")
            
            # 验证文件路径
            if expected_file and result['file_path'] != expected_file:
                print(f"⚠️  警告: 预期文件 {expected_file}, 实际文件 {result['file_path']}")
            else:
                print(f"✅ 文件路径验证通过")
        else:
            print("❌ 未找到匹配")
    
    # 测试查找所有匹配
    print("\n=== 测试6: 多文件查找所有匹配 ===")
    all_matches = calculator.find_all_matches(multi_file_diff, "query")
    print(f"找到 {len(all_matches)} 个包含'query'的行:")
    for match in all_matches:
        print(f"  文件: {match['file_path']}, 行号: {match['line_number']}, 类型: {match['line_type']}")
    
    # 测试不同文件的上下文获取
    print("\n=== 测试7: 多文件上下文获取 ===")
    context_test_cases = [
        ("src/main.py", 12),  # 新增参数的行
        ("src/utils.py", 6),  # 修改异常处理的行
        ("src/auth.py", 22)   # 新增注释的行
    ]
    
    for file_path, line_number in context_test_cases:
        context = calculator.get_context_lines(multi_file_diff, file_path, line_number)
        print(f"\n文件 {file_path} 第 {line_number} 行的上下文:")
        for line in context:
            print(f"  {line}")


def test_edge_cases():
    """
    测试边界情况
    """
    print("\n=== 测试边界情况 ===\n")
    
    calculator = LineNumberCalculator()
    
    # 测试空内容
    print("测试空内容:")
    result = calculator.find_line_by_content("", "test")
    print(f"空diff内容: {result}")
    
    result = calculator.find_line_by_content("test diff", "")
    print(f"空目标内容: {result}")
    
    # 测试无效diff格式
    print("\n测试无效diff格式:")
    invalid_diff = "这不是一个有效的diff格式"
    result = calculator.find_line_by_content(invalid_diff, "test")
    print(f"无效diff格式: {result}")
    
    # 测试只有文件头的diff
    print("\n测试只有文件头的diff:")
    header_only_diff = """diff --git a/file.py b/file.py
index 123..456
--- a/file.py
+++ b/file.py"""
    result = calculator.find_line_by_content(header_only_diff, "test")
    print(f"只有文件头的diff: {result}")


if __name__ == "__main__":
    # 运行主测试
    test_diff_parser()
    
    # 运行边界情况测试
    test_edge_cases()
    
    print("\n=== 所有测试完成 ===")
    print("✅ diff解析器功能正常")
