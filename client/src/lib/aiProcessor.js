var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Contains marketplace transformation rules
 */
export const marketplaces = {
    amazon: {
        id: 'amazon',
        name: 'Amazon',
        requiredFields: ['sku', 'title', 'description', 'price', 'category'],
        recommendedFields: ['brand', 'image_url', 'bullet_points', 'keywords'],
        categoryMapping: {
            'electronics': 'Electronics',
            'computer': 'Electronics',
            'laptop': 'Electronics',
            'phone': 'Electronics',
            'clothing': 'Apparel',
            'apparel': 'Apparel',
            'clothes': 'Apparel',
            'fashion': 'Apparel',
            'home': 'Home',
            'furniture': 'Home',
            'kitchen': 'Home',
            'beauty': 'Beauty',
            'personal care': 'Beauty',
            'health': 'Health',
            'sports': 'Sports',
            'outdoor': 'Sports',
            'toys': 'Toys',
            'games': 'Toys',
            'books': 'Books',
            'food': 'Grocery',
            'grocery': 'Grocery',
            'pet': 'Pet Supplies',
            'automotive': 'Automotive',
            'tools': 'Tools & Home Improvement',
        },
        fieldTransformations: {
            'title': {
                type: 'standardize',
                params: {
                    maxLength: 200,
                    capitalization: 'title-case'
                }
            },
            'description': {
                type: 'standardize',
                params: {
                    maxLength: 2000,
                    htmlAllowed: false
                }
            },
            'price': {
                type: 'format',
                params: {
                    currency: 'USD',
                    decimalPlaces: 2
                }
            }
        }
    },
    walmart: {
        id: 'walmart',
        name: 'Walmart',
        requiredFields: ['sku', 'productName', 'shortDescription', 'price', 'category'],
        recommendedFields: ['brand', 'imageUrl', 'longDescription', 'shippingWeight'],
        categoryMapping: {
            'electronics': 'Electronics',
            'computer': 'Electronics',
            'laptop': 'Electronics',
            'phone': 'Electronics',
            'clothing': 'Clothing',
            'apparel': 'Clothing',
            'clothes': 'Clothing',
            'fashion': 'Clothing',
            'home': 'Home',
            'furniture': 'Home',
            'kitchen': 'Kitchen & Dining',
            'beauty': 'Beauty',
            'personal care': 'Health & Beauty',
            'health': 'Health & Beauty',
            'sports': 'Sports & Outdoors',
            'outdoor': 'Sports & Outdoors',
            'toys': 'Toys',
            'games': 'Video Games',
            'books': 'Books',
            'food': 'Food',
            'grocery': 'Grocery',
            'pet': 'Pets',
            'automotive': 'Auto & Tires',
            'tools': 'Home Improvement',
        },
        fieldTransformations: {
            'productName': {
                type: 'standardize',
                params: {
                    maxLength: 150,
                    capitalization: 'sentence-case'
                }
            },
            'shortDescription': {
                type: 'standardize',
                params: {
                    maxLength: 1000,
                    htmlAllowed: false
                }
            },
            'price': {
                type: 'format',
                params: {
                    currency: 'USD',
                    decimalPlaces: 2
                }
            }
        }
    },
    meta: {
        id: 'meta',
        name: 'Meta',
        requiredFields: ['id', 'title', 'description', 'price', 'availability', 'image_link'],
        recommendedFields: ['brand', 'condition', 'link', 'gender', 'age_group'],
        categoryMapping: {
            'electronics': 'Electronics',
            'computer': 'Electronics',
            'laptop': 'Electronics',
            'phone': 'Electronics',
            'clothing': 'Clothing & Accessories',
            'apparel': 'Clothing & Accessories',
            'clothes': 'Clothing & Accessories',
            'fashion': 'Clothing & Accessories',
            'home': 'Home & Garden',
            'furniture': 'Home & Garden',
            'kitchen': 'Home & Garden',
            'beauty': 'Health & Beauty',
            'personal care': 'Health & Beauty',
            'health': 'Health & Beauty',
            'sports': 'Sporting Goods',
            'outdoor': 'Sporting Goods',
            'toys': 'Toys & Games',
            'games': 'Toys & Games',
            'books': 'Media',
            'food': 'Food & Beverage',
            'grocery': 'Food & Beverage',
            'pet': 'Pet Supplies',
            'automotive': 'Vehicles & Parts',
            'tools': 'Home & Garden',
        },
        fieldTransformations: {
            'title': {
                type: 'standardize',
                params: {
                    maxLength: 150,
                    capitalization: 'sentence-case'
                }
            },
            'description': {
                type: 'standardize',
                params: {
                    maxLength: 5000,
                    htmlAllowed: false
                }
            },
            'price': {
                type: 'format',
                params: {
                    currency: 'USD',
                    decimalPlaces: 2
                }
            }
        }
    },
    tiktok: {
        id: 'tiktok',
        name: 'TikTok Shop',
        requiredFields: ['id', 'title', 'description', 'price', 'image_url', 'category'],
        recommendedFields: ['inventory', 'condition', 'brand', 'shipping_cost', 'variants'],
        categoryMapping: {
            'electronics': 'Electronics',
            'computer': 'Electronics',
            'laptop': 'Electronics',
            'phone': 'Electronics',
            'clothing': 'Fashion',
            'apparel': 'Fashion',
            'clothes': 'Fashion',
            'fashion': 'Fashion',
            'home': 'Home & Living',
            'furniture': 'Home & Living',
            'kitchen': 'Home & Living',
            'beauty': 'Beauty',
            'personal care': 'Beauty',
            'health': 'Health & Wellness',
            'sports': 'Sports & Outdoors',
            'outdoor': 'Sports & Outdoors',
            'toys': 'Toys & Games',
            'games': 'Toys & Games',
            'books': 'Books & Stationery',
            'food': 'Food & Beverage',
            'grocery': 'Food & Beverage',
            'pet': 'Pet Supplies',
            'automotive': 'Accessories',
            'tools': 'Home & Living',
        },
        fieldTransformations: {
            'title': {
                type: 'standardize',
                params: {
                    maxLength: 100,
                    capitalization: 'title-case'
                }
            },
            'description': {
                type: 'standardize',
                params: {
                    maxLength: 2000,
                    htmlAllowed: false
                }
            },
            'price': {
                type: 'format',
                params: {
                    currency: 'USD',
                    decimalPlaces: 2
                }
            }
        }
    }
};
/**
 * Simulates AI-powered processing of product data for marketplaces
 * In a real application, this would call an AI service like OpenAI
 * @param data Original product data
 * @param marketplace Target marketplace for transformation
 * @returns Processed data and statistics
 */
export function processDataWithAI(data, marketplace) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the marketplace configuration
        const marketplaceConfig = marketplaces[marketplace.toLowerCase()] || marketplaces.amazon;
        const startTime = Date.now();
        // Initialize statistics
        const stats = {
            dataCleaning: 0,
            titleOptimization: 0,
            categoryMapping: 0,
            pricingAnalysis: 0,
            missingDataFilled: 0,
            totalImprovements: 0
        };
        // Process each item
        const transformedData = data.map(item => {
            const transformed = Object.assign({}, item);
            // Find all field keys in the item that might map to required fields
            // This handles different naming conventions in the source data
            marketplaceConfig.requiredFields.forEach(requiredField => {
                const matchingKey = findMatchingKey(item, requiredField);
                // Map keys to the marketplace's expected field names
                if (matchingKey && matchingKey !== requiredField) {
                    transformed[requiredField] = item[matchingKey];
                    delete transformed[matchingKey];
                    stats.dataCleaning++;
                    stats.totalImprovements++;
                }
                // Check if required field is missing and try to fill it
                if (!transformed[requiredField]) {
                    transformed[requiredField] = generateFieldValue(requiredField, item, marketplaceConfig);
                    if (transformed[requiredField]) {
                        stats.missingDataFilled++;
                        stats.totalImprovements++;
                    }
                }
            });
            // Optimize title if it exists
            if (transformed.title || transformed.productName || transformed.name) {
                const titleKey = transformed.title ? 'title' :
                    transformed.productName ? 'productName' : 'name';
                const originalTitle = transformed[titleKey];
                transformed[titleKey] = optimizeTitle(originalTitle, marketplaceConfig);
                if (transformed[titleKey] !== originalTitle) {
                    stats.titleOptimization++;
                    stats.totalImprovements++;
                }
            }
            // Map category if it exists
            if (transformed.category) {
                const originalCategory = transformed.category;
                transformed.category = mapCategory(originalCategory, marketplaceConfig);
                if (transformed.category !== originalCategory) {
                    stats.categoryMapping++;
                    stats.totalImprovements++;
                }
            }
            // Clean and standardize prices
            const priceKey = findMatchingKey(transformed, 'price');
            if (priceKey) {
                const originalPrice = transformed[priceKey];
                transformed[priceKey] = standardizePrice(originalPrice);
                if (transformed[priceKey] !== originalPrice) {
                    stats.pricingAnalysis++;
                    stats.totalImprovements++;
                }
            }
            return transformed;
        });
        const processingTime = Date.now() - startTime;
        return {
            transformedData,
            stats,
            processingTime
        };
    });
}
/**
 * Find a matching key in an object based on a target field name
 * @param obj The object to search
 * @param target The target field to find
 * @returns The matching key or null
 */
function findMatchingKey(obj, target) {
    // First, check for exact match
    if (obj[target] !== undefined) {
        return target;
    }
    // Check for case-insensitive match
    const lowerTarget = target.toLowerCase();
    for (const key of Object.keys(obj)) {
        if (key.toLowerCase() === lowerTarget) {
            return key;
        }
    }
    // Check for likely matches based on content
    const targetWords = target.toLowerCase().split(/[_\s-]+/);
    for (const key of Object.keys(obj)) {
        const keyWords = key.toLowerCase().split(/[_\s-]+/);
        // If the key contains the target or vice versa
        if (targetWords.some(word => keyWords.includes(word)) ||
            keyWords.some(word => targetWords.includes(word))) {
            return key;
        }
        // Special field mappings
        if ((target === 'title' && (key === 'name' || key === 'productName')) ||
            (target === 'description' && (key === 'details' || key === 'shortDescription' || key === 'longDescription')) ||
            (target === 'image_url' && (key === 'imageUrl' || key === 'image' || key === 'img'))) {
            return key;
        }
    }
    return null;
}
/**
 * Generate a value for a missing required field based on other data
 * @param field The field to generate a value for
 * @param item The data item
 * @param marketplaceConfig The marketplace configuration
 * @returns The generated value or empty string
 */
function generateFieldValue(field, item, marketplaceConfig) {
    // In a real app, this would use OpenAI to generate content
    // Here we use simple logic for demonstration
    switch (field) {
        case 'sku':
        case 'id':
            // Generate a unique ID based on other fields
            return `GEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        case 'title':
        case 'productName':
            // Try to generate from other fields
            if (item.name)
                return item.name;
            if (item.productName)
                return item.productName;
            if (item.sku)
                return `Product ${item.sku}`;
            return 'New Product';
        case 'description':
        case 'shortDescription':
            // Try to generate from title
            if (item.title)
                return `${item.title}. High quality product.`;
            if (item.name)
                return `${item.name}. High quality product.`;
            return 'Product description not available.';
        case 'price':
            // Default price if missing
            return '19.99';
        case 'category':
            // Try to guess from title or description
            if (item.title) {
                const title = item.title.toLowerCase();
                for (const [keyword, category] of Object.entries(marketplaceConfig.categoryMapping)) {
                    if (title.includes(keyword)) {
                        return category;
                    }
                }
            }
            return 'Uncategorized';
        case 'image_url':
        case 'imageUrl':
            // Placeholder image
            return 'https://via.placeholder.com/300';
        default:
            return '';
    }
}
/**
 * Optimize a product title for marketplace requirements
 * @param title The original title
 * @param marketplaceConfig The marketplace configuration
 * @returns The optimized title
 */
function optimizeTitle(title, marketplaceConfig) {
    var _a, _b, _c;
    if (!title)
        return '';
    const titleTransformation = marketplaceConfig.fieldTransformations.title || {
        type: 'standardize',
        params: { maxLength: 150, capitalization: 'title-case' }
    };
    let optimized = title.trim();
    // Remove excessive punctuation and spacing
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.replace(/[!?;]+/g, '.');
    optimized = optimized.replace(/\.{2,}/g, '.');
    // Capitalization based on marketplace preferences
    if (((_a = titleTransformation.params) === null || _a === void 0 ? void 0 : _a.capitalization) === 'title-case') {
        optimized = toTitleCase(optimized);
    }
    else if (((_b = titleTransformation.params) === null || _b === void 0 ? void 0 : _b.capitalization) === 'sentence-case') {
        optimized = toSentenceCase(optimized);
    }
    // Enforce length limits
    const maxLength = ((_c = titleTransformation.params) === null || _c === void 0 ? void 0 : _c.maxLength) || 150;
    if (optimized.length > maxLength) {
        optimized = optimized.substring(0, maxLength);
        // Don't cut in the middle of a word
        if (optimized.charAt(optimized.length - 1) !== ' ' && optimized.includes(' ')) {
            optimized = optimized.substring(0, optimized.lastIndexOf(' '));
        }
    }
    return optimized;
}
/**
 * Map a product category to the marketplace's category taxonomy
 * @param category The original category
 * @param marketplaceConfig The marketplace configuration
 * @returns The mapped category
 */
function mapCategory(category, marketplaceConfig) {
    if (!category)
        return 'Uncategorized';
    const lowerCategory = category.toLowerCase();
    // Direct match in mapping
    for (const [keyword, mappedCategory] of Object.entries(marketplaceConfig.categoryMapping)) {
        if (lowerCategory === keyword) {
            return mappedCategory;
        }
    }
    // Partial match in mapping
    for (const [keyword, mappedCategory] of Object.entries(marketplaceConfig.categoryMapping)) {
        if (lowerCategory.includes(keyword)) {
            return mappedCategory;
        }
    }
    // No match found
    return category;
}
/**
 * Standardize a price value
 * @param price The original price
 * @returns The standardized price
 */
function standardizePrice(price) {
    if (typeof price === 'number') {
        return price.toFixed(2);
    }
    if (typeof price === 'string') {
        // Remove any non-numeric characters except decimal point
        const cleaned = price.replace(/[^0-9.]/g, '');
        // Try to parse as a number
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
            return parsed.toFixed(2);
        }
    }
    return (price === null || price === void 0 ? void 0 : price.toString()) || '0.00';
}
/**
 * Convert text to Title Case
 * @param text The text to convert
 * @returns Text in Title Case
 */
function toTitleCase(text) {
    // Words that shouldn't be capitalized in titles
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of'];
    return text.replace(/\w\S*/g, (word, index) => {
        // Always capitalize the first word
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
        }
        // Don't capitalize minor words unless they're the first
        if (minorWords.includes(word.toLowerCase())) {
            return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
}
/**
 * Convert text to Sentence case
 * @param text The text to convert
 * @returns Text in Sentence case
 */
function toSentenceCase(text) {
    return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
}
