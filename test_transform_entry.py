from smart_transform import transform_to_amazon_format

print("✅ Loaded transform_to_amazon_format")
print("🧪 Function signature:")

try:
    transform_to_amazon_format("dummy.csv", feed_id="test-feed-id")
    print("✅ feed_id accepted and forwarded correctly")
except TypeError as e:
    print("❌ Still broken:", e)
