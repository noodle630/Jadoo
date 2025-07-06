import openai
import os
from typing import Dict, List, Optional
import json

class CategoryGuesser:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Cache for category mappings to avoid repeated API calls
        self.category_cache = {}
        
        # Marketplace category taxonomies
        self.marketplace_taxonomies = {
            'amazon': {
                'Electronics': ['Cell Phones', 'Computers', 'Audio', 'TV & Video', 'Cameras'],
                'Home & Garden': ['Kitchen', 'Furniture', 'Tools', 'Garden'],
                'Clothing': ['Men', 'Women', 'Kids', 'Shoes', 'Accessories'],
                'Sports': ['Exercise', 'Outdoor', 'Team Sports', 'Fitness'],
                'Books': ['Fiction', 'Non-Fiction', 'Educational', 'Children'],
                'Toys': ['Games', 'Educational', 'Action Figures', 'Building Sets'],
                'Health': ['Personal Care', 'Medical', 'Supplements', 'Fitness'],
                'Automotive': ['Parts', 'Accessories', 'Tools', 'Maintenance']
            },
            'walmart': {
                'Electronics': ['Cell Phones', 'Computers', 'Audio', 'TV & Video'],
                'Home': ['Kitchen', 'Furniture', 'Tools', 'Garden'],
                'Clothing': ['Men', 'Women', 'Kids', 'Shoes'],
                'Sports': ['Exercise', 'Outdoor', 'Team Sports'],
                'Books': ['Fiction', 'Non-Fiction', 'Educational'],
                'Toys': ['Games', 'Educational', 'Action Figures'],
                'Health': ['Personal Care', 'Medical', 'Supplements'],
                'Automotive': ['Parts', 'Accessories', 'Tools']
            }
        }
    
    def guess_category(self, product_data: Dict, marketplace: str = 'amazon') -> str:
        """
        Guess the product category using GPT based on product information.
        
        Args:
            product_data: Dictionary containing product info (title, brand, description, etc.)
            marketplace: Target marketplace ('amazon', 'walmart', etc.)
            
        Returns:
            str: Predicted category path (e.g., "Electronics > Cell Phones")
        """
        # Create a cache key
        cache_key = f"{marketplace}_{product_data.get('title', '')}_{product_data.get('brand', '')}"
        
        if cache_key in self.category_cache:
            return self.category_cache[cache_key]
        
        # Build the prompt
        prompt = self._build_category_prompt(product_data, marketplace)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a product categorization expert. Analyze the product information and return ONLY the most specific category path from the provided taxonomy. Do not include any explanations or additional text."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=50,
                temperature=0.1
            )
            
            category = response.choices[0].message.content.strip()
            
            # Cache the result
            self.category_cache[cache_key] = category
            
            return category
            
        except Exception as e:
            print(f"Error guessing category: {e}")
            # Fallback to a default category
            return "Electronics > Cell Phones"
    
    def _build_category_prompt(self, product_data: Dict, marketplace: str) -> str:
        """Build the prompt for category guessing."""
        
        title = product_data.get('title', '')
        brand = product_data.get('brand', '')
        description = product_data.get('description', '')
        
        taxonomy = self.marketplace_taxonomies.get(marketplace, self.marketplace_taxonomies['amazon'])
        
        taxonomy_text = ""
        for main_category, subcategories in taxonomy.items():
            taxonomy_text += f"{main_category}: {', '.join(subcategories)}\n"
        
        prompt = f"""Based on this product information:
Title: {title}
Brand: {brand}
Description: {description}

What is the most specific category for this product in {marketplace.title()} taxonomy?

Available categories:
{taxonomy_text}

Return only the category path in format: "Main Category > Subcategory"
Example: "Electronics > Cell Phones" or "Home & Garden > Kitchen"

Category:"""
        
        return prompt
    
    def batch_guess_categories(self, products: List[Dict], marketplace: str = 'amazon') -> List[str]:
        """
        Guess categories for multiple products in batch.
        
        Args:
            products: List of product dictionaries
            marketplace: Target marketplace
            
        Returns:
            List[str]: List of predicted categories
        """
        categories = []
        
        for product in products:
            category = self.guess_category(product, marketplace)
            categories.append(category)
        
        return categories
    
    def get_category_confidence(self, product_data: Dict, predicted_category: str, marketplace: str = 'amazon') -> float:
        """
        Get confidence score for a predicted category.
        
        Args:
            product_data: Product information
            predicted_category: The predicted category
            marketplace: Target marketplace
            
        Returns:
            float: Confidence score between 0 and 1
        """
        # Simple confidence scoring based on keyword matching
        title = product_data.get('title', '').lower()
        description = product_data.get('description', '').lower()
        
        category_keywords = predicted_category.lower().split(' > ')
        
        confidence = 0.0
        total_keywords = len(category_keywords)
        
        for keyword in category_keywords:
            if keyword in title or keyword in description:
                confidence += 1.0
        
        return confidence / total_keywords if total_keywords > 0 else 0.0

# Example usage
if __name__ == "__main__":
    guesser = CategoryGuesser()
    
    # Test product
    test_product = {
        'title': 'iPhone 14 Pro Max 256GB',
        'brand': 'Apple',
        'description': 'Latest iPhone with advanced camera system and A16 chip'
    }
    
    category = guesser.guess_category(test_product, 'amazon')
    confidence = guesser.get_category_confidence(test_product, category, 'amazon')
    
    print(f"Predicted category: {category}")
    print(f"Confidence: {confidence:.2f}") 