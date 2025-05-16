MARKETPLACES = {
    "amazon": {
        "name": "Amazon Seller Central",
        "columns": ["item_sku", "external_product_id", "external_product_id_type", "item_name", "brand_name", "manufacturer"],
        "endpoint": "/transform-to-amazon",
        "color": "#ff9900",
        "hover_color": "#e88a00"
    },
    "walmart": {
        "name": "Walmart Marketplace",
        "columns": ["sku", "productIdType", "productId", "productName", "brand", "price"],
        "endpoint": "/transform-to-walmart",
        "color": "#0071ce",
        "hover_color": "#004c91"
    },
    "reebelo": {
        "name": "Reebelo Marketplace",
        "columns": ["Reebelo ID", "Your SKU", "Product Title", "Price"],
        "endpoint": "/transform-to-reebelo",
        "color": "#4052b5",
        "hover_color": "#2e3b82"
    },
    "catch": {
        "name": "Catch Marketplace",
        "columns": ["internal-sku", "title", "brand", "price"],
        "endpoint": "/transform-to-catch",
        "color": "#00aaa7",
        "hover_color": "#008e8c"
    },
    "meta": {
        "name": "Meta (Facebook)",
        "columns": ["id", "title", "description", "price"],
        "endpoint": "/transform-to-meta",
        "color": "#1877f2",
        "hover_color": "#0e5fcb"
    },
    "tiktok": {
        "name": "TikTok Shop",
        "columns": ["sku_id", "title", "price", "image_link"],
        "endpoint": "/transform-to-tiktok",
        "color": "#000000",
        "hover_color": "#333333"
    }
}
