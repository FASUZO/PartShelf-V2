import time
import subprocess

print("等待服务器启动...")
time.sleep(3)

print("运行API测试...")
result = subprocess.run(["python", "test_api.py"], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("错误:", result.stderr)
