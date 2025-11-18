"""
数据库索引初始化脚本
为代码审查系统创建必要的数据库索引以优化查询性能
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils.database import database


async def create_indexes():
    """创建所有必要的数据库索引"""
    
    # 为codereviews集合创建索引
    codereviews_collection = database["codereviews"]
    
    # GitHub Action ID索引 - 用于快速查找
    await codereviews_collection.create_index("github_action_id", unique=True)
    print("✓ 创建GitHub Action ID唯一索引")
    
    # 状态索引 - 用于按状态筛选
    await codereviews_collection.create_index("status")
    print("✓ 创建状态索引")
    
    # 创建者索引 - 用于按用户筛选
    await codereviews_collection.create_index("created_by")
    print("✓ 创建者索引")
    
    # 仓库信息索引 - 用于按仓库筛选
    await codereviews_collection.create_index("repo_owner")
    await codereviews_collection.create_index("repo_name")
    await codereviews_collection.create_index([("repo_owner", 1), ("repo_name", 1)])
    print("✓ 创建仓库信息索引")
    
    # 创建时间索引 - 用于时间排序和范围查询
    await codereviews_collection.create_index("created_at")
    await codereviews_collection.create_index("updated_at")
    print("✓ 创建时间索引")
    
    # 复合索引 - 常用查询组合
    await codereviews_collection.create_index([
        ("created_by", 1), 
        ("status", 1), 
        ("created_at", -1)
    ])
    await codereviews_collection.create_index([
        ("repo_owner", 1), 
        ("repo_name", 1), 
        ("created_at", -1)
    ])
    print("✓ 创建复合索引")
    
    # 为其他集合创建基础索引
    users_collection = database["users"]
    await users_collection.create_index("username", unique=True)
    await users_collection.create_index("email", unique=True)
    print("✓ 为users集合创建索引")
    
    apikeys_collection = database["apikeys"]
    await apikeys_collection.create_index("api_key", unique=True)
    await apikeys_collection.create_index("created_by")
    await apikeys_collection.create_index("status")
    print("✓ 为apikeys集合创建索引")
    
    programmers_collection = database["programmers"]
    await programmers_collection.create_index("username", unique=True)
    await programmers_collection.create_index("reputation_score")
    await programmers_collection.create_index("updated_at")
    print("✓ 为programmers集合创建索引")
    
    print("\n🎉 所有数据库索引创建完成！")


async def drop_indexes():
    """删除所有索引（谨慎使用）"""
    
    try:
        # 删除codereviews集合的所有索引
        codereviews_collection = database["codereviews"]
        await codereviews_collection.drop_indexes()
        print("✓ 删除codereviews集合的所有索引")
        
        # 删除其他集合的索引
        users_collection = database["users"]
        await users_collection.drop_indexes()
        print("✓ 删除users集合的所有索引")
        
        apikeys_collection = database["apikeys"]
        await apikeys_collection.drop_indexes()
        print("✓ 删除apikeys集合的所有索引")
        
        programmers_collection = database["programmers"]
        await programmers_collection.drop_indexes()
        print("✓ 删除programmers集合的所有索引")
        
        print("\n🗑️ 所有数据库索引已删除！")
        
    except Exception as e:
        print(f"❌ 删除索引时出错: {e}")


async def check_indexes():
    """检查当前数据库索引状态"""
    
    collections_to_check = [
        ("codereviews", database["codereviews"]),
        ("users", database["users"]),
        ("apikeys", database["apikeys"]),
        ("programmers", database["programmers"])
    ]
    
    print("\n📊 数据库索引状态:")
    print("=" * 50)
    
    for collection_name, collection in collections_to_check:
        try:
            indexes = collection.list_indexes()
            index_list = await indexes.to_list(length=100)
            
            print(f"\n🏷️ {collection_name} 集合:")
            if not index_list:
                print("   (无索引)")
            else:
                for index in index_list:
                    index_name = index.get("name", "unnamed")
                    key_fields = list(index.get("key", {}).keys())
                    unique = index.get("unique", False)
                    unique_text = " [UNIQUE]" if unique else ""
                    print(f"   - {index_name}: {key_fields}{unique_text}")
        except Exception as e:
            print(f"   ❌ 检查索引时出错: {e}")


if __name__ == "__main__":
    import asyncio
    
    async def main():
        print("🔧 数据库索引管理工具")
        print("1. 创建索引")
        print("2. 删除索引")
        print("3. 检查索引状态")
        
        choice = input("\n请选择操作 (1/2/3): ").strip()
        
        if choice == "1":
            await create_indexes()
        elif choice == "2":
            await drop_indexes()
        elif choice == "3":
            await check_indexes()
        else:
            print("❌ 无效选择")
    
    asyncio.run(main())