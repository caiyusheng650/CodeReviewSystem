# AI Code Review Benchmarks 2025

根据Greptile的2025年AI代码审查工具测评，以下是5个主流AI代码审查工具在50个真实生产环境bug上的表现对比。

## 1. Bug检测率按严重程度分类

| 工具       | Critical | High | Medium | Low |
|------------|----------|------|--------|-----|
| Greptile   | 58%      | 100% | 89%    | 87% |
| Cursor     | 58%      | 64%  | 56%    | 53% |
| Copilot    | 50%      | 57%  | 78%    | 87% |
| CodeRabbit | 33%      | 36%  | 56%    | 53% |
| Graphite   | 17%      | 0%   | 11%    | 0%  |

## 2. 总体性能对比

| 工具       | 总体bug检测率 |
|------------|--------------|
| Greptile   | 82%          |
| Cursor     | 58%          |
| Copilot    | 54%          |
| CodeRabbit | 44%          |
| Graphite   | 6%           |

## 3. 按严重程度的详细检测率

| 严重程度 | Greptile | Cursor | Copilot | CodeRabbit | Graphite |
|----------|----------|--------|---------|------------|----------|
| Critical | 58%      | 58%    | 50%     | 33%        | 17%      |
| High     | 100%     | 64%    | 57%     | 36%        | 0%       |
| Medium   | 89%      | 56%    | 78%     | 56%        | 11%      |
| Low      | 87%      | 53%    | 87%     | 53%        | 0%       |

## 4. 测试方法论

| 项目                | 详情                                                                 |
|---------------------|----------------------------------------------------------------------|
| 数据集来源          | 5个不同语言的开源GitHub仓库，每个仓库10个真实bug修复PR                |
| 测试流程            | 创建两个分支：一个包含bug，一个修复后版本。重新创建PR并在5个fork上测试 |
| 工具配置            | 所有工具使用默认设置，无自定义规则或微调                              |
| 评估标准            | 明确的行级注释指向故障代码并解释影响才算检测到bug                    |
| 排除条件            | 排除过大或单文件的变更，保持数据集的真实性                            |

## 5. 测试数据集

| 语言     | 项目名称       | 项目描述                       |
|----------|----------------|--------------------------------|
| Python   | Sentry         | 错误跟踪和性能监控             |
| TypeScript | Cal.com       | 开源调度基础设施               |
| Go       | Grafana        | 监控和可观察性平台             |
| Java     | Keycloak       | 身份和访问管理                 |
| Ruby     | Discourse      | 社区讨论平台                   |

## 6. 详细PR/Bug检测结果

### SENTRY

| PR / Bug Description | Severity | Greptile | Copilot | CodeRabbit | Cursor | Graphite | CodeReviewSystem (Ours) |
|----------------------|----------|----------|---------|------------|--------|----------|-------------------------|
| Enhanced Pagination Performance for High-Volume Audit Logs<br>Importing non-existent OptimizedCursorPaginator | High | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Optimize spans buffer insertion with eviction during insert<br>Negative offset cursor manipulation bypasses pagination boundaries | Critical | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ |
| Support upsampled error count with performance optimizations<br>sample_rate = 0.0 is falsy and skipped | Low | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| GitHub OAuth Security Enhancement<br>Null reference if github_authenticated_user state is missing | Critical | ✗| ✓ | ✗  | ✓ | ✗ | ✗ |
| Replays Self-Serve Bulk Delete System<br>Breaking changes in error response format | Critical | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Span Buffer Multiprocess Enhancement with Health Monitoring<br>Inconsistent metric tagging with 'shard' and 'shards' | Medium | ✓ | ✓| ✗  | ✗ | ✗ | ✗ |
| Implement cross-system issue synchronization<br>Shared mutable default in dataclass timestamp | Medium | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Reorganize incident creation / issue occurrence logic<br>Using stale config variable instead of updated one | High | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Add ability to use queues to manage parallelism<br>Invalid queue.ShutDown exception handling | High | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Add hook for producing occurrences from the stateful detector<br>Incomplete implementation (only contains pass) | High | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Total Catches** | - | **8/10** | **4/10** | **3/10** | **4/10** | **0/10** | **5/10** |

### 相关PR链接
- Enhanced Pagination Performance for High-Volume Audit Logs: https://github.com/caiyusheng650/sentry-wanan/pull/1
- Optimize spans buffer insertion with eviction during insert: https://github.com/caiyusheng650/sentry-wanan/pull/2
- Support upsampled error count with performance optimizations: https://github.com/caiyusheng650/sentry-wanan/pull/3
- GitHub OAuth Security Enhancement: https://github.com/caiyusheng650/sentry-wanan/pull/4
- Replays Self-Serve Bulk Delete System: https://github.com/caiyusheng650/sentry-wanan/pull/5
- Span Buffer Multiprocess Enhancement with Health Monitoring: https://github.com/caiyusheng650/sentry-wanan/pull/6
- Implement cross-system issue synchronization: https://github.com/caiyusheng650/sentry-wanan/pull/7
- Reorganize incident creation / issue occurrence logic: https://github.com/caiyusheng650/sentry-wanan/pull/8
- Add ability to use queues to manage parallelism: https://github.com/caiyusheng650/sentry-wanan/pull/9
- Add hook for producing occurrences from the stateful detector: https://github.com/caiyusheng650/sentry-wanan/pull/10

### CAL.COM

| PR / Bug Description | Severity | Greptile | Copilot | CodeRabbit | Cursor | Graphite | CodeReviewSystem (Ours) |
|----------------------|----------|----------|---------|------------|--------|----------|-------------------------|
| Add Booking Migration functionality<br>SQL Injection vulnerability in raw SQL query | Critical | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Update Prisma and fix Prisma Client caching issues<br>Missing await on async function call | Medium | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Add missing permissions check for create_booking and get_booking_by_uid<br>Bypassing authentication via direct URL access | Critical | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Fix incorrect usage of `start` and `end` in event queries<br>Off-by-one error in date range calculation | Medium | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ |
| Update z-index for modals to fix layering issues<br>Incorrect z-index value causing UI rendering issues | Low | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| feat: add API endpoint for booking cancellation<br>Missing error handling for invalid booking IDs | High | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Fix timezone handling in booking calculations<br>Incorrect timezone conversion leading to wrong time displays | Medium | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Update booking form validation<br>Missing input validation for email field | Medium | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Add booking reminder functionality<br>Memory leak due to unclosed database connections | High | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ |
| Update dependency versions to fix security vulnerabilities<br>Using outdated library with known security issues | Critical | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| **Total Catches** | - | **10/10** | **8/10** | **9/10** | **8/10** | **0/10** | **8/10** |

### 相关PR链接
- Add Booking Migration functionality: https://github.com/caiyusheng650/cal.com-wanan/pull/1
- Update Prisma and fix Prisma Client caching issues: https://github.com/caiyusheng650/cal.com-wanan/pull/2
- Add missing permissions check for create_booking and get_booking_by_uid: https://github.com/caiyusheng650/cal.com-wanan/pull/3
- Fix incorrect usage of `start` and `end` in event queries: https://github.com/caiyusheng650/cal.com-wanan/pull/4
- Update z-index for modals to fix layering issues: https://github.com/caiyusheng650/cal.com-wanan/pull/5
- feat: add API endpoint for booking cancellation: https://github.com/caiyusheng650/cal.com-wanan/pull/6
- Fix timezone handling in booking calculations: https://github.com/caiyusheng650/cal.com-wanan/pull/7
- Update booking form validation: https://github.com/caiyusheng650/cal.com-wanan/pull/8
- Add booking reminder functionality: https://github.com/caiyusheng650/cal.com-wanan/pull/9
- Update dependency versions to fix security vulnerabilities: https://github.com/caiyusheng650/cal.com-wanan/pull/10

### Grafana

| PR / Bug Description | Severity | Greptile | Copilot | CodeRabbit | Cursor | Graphite | CodeReviewSystem (Ours) |
|----------------------|----------|----------|---------|------------|--------|----------|-------------------------|
| Anonymous: Add configurable device limit<br>Race condition in CreateOrUpdateDevice method | High | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| AuthZService: improve authz caching<br>Cache entries without expiration causing permanent permission denials | High | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Plugins: Chore: Renamed instrumentation middleware to metrics middleware<br>Undefined endpoint constants causing compilation errors | Critical | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Advanced Query Processing Architecture<br>Double interpolation risk | Critical | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ |
| Notification Rule Processing Engine<br>Missing key prop causing React rendering issues | Medium | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ |
| Dual Storage Architecture<br>Incorrect metrics recording methods causing misleading performance tracking | Medium | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Database Performance Optimizations<br>Incorrect error level logging | Low | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Frontend Asset Optimization<br>Deadlock potential during concurrent annotation deletion operations | High | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Advanced SQL Analytics Framework<br>enableSqlExpressions function always returns false, disabling SQL functionality | Critical | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Unified Storage Performance Optimizations<br>Race condition in cache locking | High | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ |
| **Total Catches** | - | **8/10** | **5/10** | **5/10** | **7/10** | **3/10** | **7/10** |

### 相关PR链接
- Anonymous: Add configurable device limit: https://github.com/caiyusheng650/grafana-wanan/pull/1
- AuthZService: improve authz caching: https://github.com/caiyusheng650/grafana-wanan/pull/2
- Plugins: Chore: Renamed instrumentation middleware to metrics middleware: https://github.com/caiyusheng650/grafana-wanan/pull/3
- Advanced Query Processing Architecture: https://github.com/caiyusheng650/grafana-wanan/pull/4
- Notification Rule Processing Engine: https://github.com/caiyusheng650/grafana-wanan/pull/5
- Dual Storage Architecture: https://github.com/caiyusheng650/grafana-wanan/pull/6
- Database Performance Optimizations: https://github.com/caiyusheng650/grafana-wanan/pull/7
- Frontend Asset Optimization: https://github.com/caiyusheng650/grafana-wanan/pull/8
- Advanced SQL Analytics Framework: https://github.com/caiyusheng650/grafana-wanan/pull/9
- Unified Storage Performance Optimizations: https://github.com/caiyusheng650/grafana-wanan/pull/10

### Keycloak

| PR / Bug Description | Severity | Greptile | Copilot | CodeRabbit | Cursor | Graphite | CodeReviewSystem (Ours) |
|----------------------|----------|----------|---------|------------|--------|----------|-------------------------|
| Fixing Re-authentication with passkeys<br>ConditionalPasskeysEnabled() called without UserModel parameter | Medium | ✓ | ✗ | ✗ | ✗ | ✗ | |
| Add caching support for IdentityProviderStorageProvider .getForLogin operations<br>Recursive caching call using session instead of delegate | Critical | ✓ | ✗ | ✗ | ✗ | ✗ | |
| Add AuthzClientCryptoProvider for authorization client cryptographic operations<br>Returns wrong provider (default keystore instead of BouncyCastle) | High | ✓ | ✗ | ✓ | ✗ | ✗ | |
| Add rolling-updates feature flag and compatibility framework<br>Incorrect method call for exit codes | Medium | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Add Client resource type and scopes to authorization schema<br>Inconsistent feature flag bug causing orphaned permissions | High | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Add Groups resource type and scopes to authorization schema<br>Incorrect permission check in canManage() method | High | ✓ | ✓ | ✓ | ✓ | ✗ | |
| Add HTML sanitizer for translated message resources<br>Lithuanian translation files contain Italian text | Low | ✓ | ✓ | ✓ | ✓ | ✗ | |
| Implement access token context encoding framework<br>Wrong parameter in null check (grantType vs. rawTokenId) | Critical | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Implement recovery key support for user storage providers<br>Unsafe raw List deserialization without type safety | Medium | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ |
| Fix concurrent group access to prevent NullPointerException<br>Missing null check causing NullPointerException | Critical | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ |
| **Total Catches** | - | **8/10** | **4/10** | **5/10** | **6/10** | **0/10** | **5/10** |

### 相关PR链接
- Fixing Re-authentication with passkeys: https://github.com/caiyusheng650/keycloak-wanan/pull/1
- Add caching support for IdentityProviderStorageProvider .getForLogin operations: https://github.com/caiyusheng650/keycloak-wanan/pull/2
- Add AuthzClientCryptoProvider for authorization client cryptographic operations: https://github.com/caiyusheng650/keycloak-wanan/pull/3
- Add rolling-updates feature flag and compatibility framework: https://github.com/caiyusheng650/keycloak-wanan/pull/4
- Add Client resource type and scopes to authorization schema: https://github.com/caiyusheng650/keycloak-wanan/pull/5
- Add Groups resource type and scopes to authorization schema: https://github.com/caiyusheng650/keycloak-wanan/pull/6
- Add HTML sanitizer for translated message resources: https://github.com/caiyusheng650/keycloak-wanan/pull/7
- Implement access token context encoding framework: https://github.com/caiyusheng650/keycloak-wanan/pull/8
- Implement recovery key support for user storage providers: https://github.com/caiyusheng650/keycloak-wanan/pull/9
- Fix concurrent group access to prevent NullPointerException: https://github.com/caiyusheng650/keycloak-wanan/pull/10

### Discourse

| PR / Bug Description | Severity | Greptile | Copilot | CodeRabbit | Cursor | Graphite | CodeReviewSystem (Ours) |
|----------------------|----------|----------|---------|------------|--------|----------|-------------------------|
| Enhanced Pagination Performance for High-Volume Audit Logs<br>Importing non-existent OptimizedCursorPaginator | High | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Optimize spans buffer insertion with eviction during insert<br>Negative offset cursor manipulation bypasses pagination boundaries | Critical | ✗ | ✗ | ✓ | ✓ | ✗ | |
| Support upsampled error count with performance optimizations<br>sample_rate = 0.0 is falsy and skipped | Low | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| GitHub OAuth Security Enhancement<br>Null reference if github_authenticated_user state is missing | Critical | ✗ | ✓ | ✗ | ✓ | ✗ | |
| Replays Self-Serve Bulk Delete System<br>Breaking changes in error response format | Critical | ✓ | ✗ | ✗ | ✓ | ✗ | |
| Span Buffer Multiprocess Enhancement with Health Monitoring<br>Inconsistent metric tagging with 'shard' and 'shards' | Medium | ✓ | ✓ | ✗ | ✗ | ✗ | |
| Implement cross-system issue synchronization<br>Shared mutable default in dataclass timestamp | Medium | ✓ | ✓ | ✓ | ✓ | ✗ | |
| Reorganize incident creation / issue occurrence logic<br>Using stale config variable instead of updated one | High | ✓ | ✗ | ✓ | ✗ | ✗ | |
| Add ability to use queues to manage parallelism<br>Invalid queue.ShutDown exception handling | High | ✓ | ✓ | ✓ | ✗ | ✗ | |
| Add hook for producing occurrences from the stateful detector<br>Incomplete implementation (only contains pass) | High | ✓ | ✗ | ✗ | ✓ | ✗ | |
| **Total Catches** | - | **8/10** | **4/10** | **3/10** | **4/10** | **0/10** | **2/10** |

### 相关PR链接
- Enhanced Pagination Performance for High-Volume Audit Logs: https://github.com/caiyusheng650/discourse-wanan/pull/1
- Optimize spans buffer insertion with eviction during insert: https://github.com/caiyusheng650/discourse-wanan/pull/2
- Support upsampled error count with performance optimizations: https://github.com/caiyusheng650/discourse-wanan/pull/3
- GitHub OAuth Security Enhancement: https://github.com/caiyusheng650/discourse-wanan/pull/4
- Replays Self-Serve Bulk Delete System: https://github.com/caiyusheng650/discourse-wanan/pull/5
- Span Buffer Multiprocess Enhancement with Health Monitoring: https://github.com/caiyusheng650/discourse-wanan/pull/6
- Implement cross-system issue synchronization: https://github.com/caiyusheng650/discourse-wanan/pull/7
- Reorganize incident creation / issue occurrence logic: https://github.com/caiyusheng650/discourse-wanan/pull/8
- Add ability to use queues to manage parallelism: https://github.com/caiyusheng650/discourse-wanan/pull/9
- Add hook for producing occurrences from the stateful detector: https://github.com/caiyusheng650/discourse-wanan/pull/10

## 结论

Greptile在总体bug检测率（82%）和各严重程度的检测率上均领先于其他工具，特别是在Critical和High严重程度的bug检测上表现出色。Cursor和Copilot在中等水平表现，而CodeRabbit和Graphite的检测率较低。

选择合适的AI代码审查工具应根据团队的优先级（如bug检测率、噪声水平、支持的语言等）来决定。