"""
订阅系统测试运行器
可以独立运行，不依赖pytest
"""
import sys
import os

# 添加项目根目录到path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    print("\n" + "="*70)
    print("  订阅系统测试套件 - Subscription System Test Suite")
    print("="*70)

    print("\n📋 测试场景覆盖:")
    print("  1. 首次购买 (First Purchase)")
    print("  2. 续费 (Renewal) - 同等级")
    print("  3. 升级 (Upgrade) - 低等级 → 高等级")
    print("  4. 降级 (Downgrade) - 高等级 → 低等级")
    print("  5. 自动续费 (Auto-Renewal)")
    print("  6. 积分包 (Points Package)")
    print()

    # 运行场景测试
    print("\n" + "-"*70)
    print("运行场景测试...")
    print("-"*70)

    from test_subscription_scenarios import run_all_tests as run_scenario_tests
    run_scenario_tests()

    # 运行集成测试
    print("\n" + "-"*70)
    print("运行集成测试...")
    print("-"*70)

    from test_subscription_integration import run_integration_tests
    run_integration_tests()

    print("\n" + "="*70)
    print("  🎉 所有测试完成！All Tests Completed!")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
