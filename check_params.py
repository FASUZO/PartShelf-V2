import sqlite3

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 检查有 other 字段的器件
cursor.execute('SELECT id, name, other FROM parts WHERE other IS NOT NULL AND other != "" LIMIT 10')
rows = cursor.fetchall()

print("有 other 字段的器件:")
for row in rows:
    print(f"ID: {row[0]}, Name: {row[1]}, Other: {row[2][:100] if row[2] else 'NULL'}")

# 检查总数
cursor.execute('SELECT COUNT(*) FROM parts')
total = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM parts WHERE other IS NOT NULL AND other != ""')
with_other = cursor.fetchone()[0]

print(f"\n总器件数: {total}")
print(f"有参数数据的器件数: {with_other}")

conn.close()
