import openai
import os
import re
from typing import Dict, List, Optional, Tuple
import json
import time

class ProductIDEnricher:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Cache for product ID lookups
        self.id_cache = {}
        
        # Mock database of common products (in real implementation, this would be a proper database)
        self.mock_product_db = {
            'iphone': {
                '14 pro max': {'upc': '194253043123', 'gtin': '0194253043123', 'asin': 'B0BDJ6ZPYM'},
                '14 pro': {'upc': '194253043116', 'gtin': '0194253043116', 'asin': 'B0BDJ6ZPYM'},
                '14': {'upc': '194253043109', 'gtin': '0194253043109', 'asin': 'B0BDJ6ZPYM'},
            },
            'samsung': {
                'galaxy s23': {'upc': '887276456789', 'gtin': '0887276456789', 'asin': 'B0BS5G7Y9M'},
                'galaxy s22': {'upc': '887276456772', 'gtin': '0887276456772', 'asin': 'B09V3HN1KC'},
            },
            'macbook': {
                'pro 14': {'upc': '194253043092', 'gtin': '0194253043092', 'asin': 'B0BDJ6ZPYM'},
                'air 13': {'upc': '194253043085', 'gtin': '0194253043085', 'asin': 'B0BDJ6ZPYM'},
            }
        }
    
    def enrich_product_ids(self, product_data: Dict) -> Dict:
        """
        Enrich product data with missing UPC, GTIN, and ASIN identifiers.
        
        Args:
            product_data: Dictionary containing product information
            
        Returns:
            Dict: Product data with enriched identifiers
        """
        enriched_data = product_data.copy()
        
        # Check what IDs are missing
        missing_ids = []
        if not product_data.get('upc'):
            missing_ids.append('upc')
        if not product_data.get('gtin'):
            missing_ids.append('gtin')
        if not product_data.get('asin'):
            missing_ids.append('asin')
        
        if not missing_ids:
            return enriched_data
        
        # Try to find existing IDs first
        found_ids = self._lookup_existing_ids(product_data)
        
        # Update with found IDs
        for id_type, value in found_ids.items():
            if value:
                enriched_data[id_type] = value
        
        # Use GPT to generate missing IDs if needed
        if missing_ids:
            generated_ids = self._generate_missing_ids(product_data, missing_ids)
            for id_type, value in generated_ids.items():
                if value and not enriched_data.get(id_type):
                    enriched_data[id_type] = value
        
        return enriched_data
    
    def _lookup_existing_ids(self, product_data: Dict) -> Dict[str, Optional[str]]:
        """
        Look up existing product IDs from mock database.
        
        Args:
            product_data: Product information
            
        Returns:
            Dict: Found IDs
        """
        title = product_data.get('title', '').lower()
        brand = product_data.get('brand', '').lower()
        
        found_ids = {}
        
        # Simple keyword matching for mock lookup
        for brand_key, models in self.mock_product_db.items():
            if brand_key in brand or brand_key in title:
                for model_key, ids in models.items():
                    if model_key in title:
                        found_ids.update(ids)
                        break
        
        return found_ids
    
    def _generate_missing_ids(self, product_data: Dict, missing_ids: List[str]) -> Dict[str, str]:
        """
        Use GPT to generate missing product IDs.
        
        Args:
            product_data: Product information
            missing_ids: List of missing ID types to generate
            
        Returns:
            Dict: Generated IDs
        """
        # Create a cache key
        cache_key = f"{product_data.get('title', '')}_{product_data.get('brand', '')}_{','.join(missing_ids)}"
        
        if cache_key in self.id_cache:
            return self.id_cache[cache_key]
        
        prompt = self._build_id_generation_prompt(product_data, missing_ids)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a product identifier expert. Generate realistic product IDs based on the product information. Return only valid IDs in the specified format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=100,
                temperature=0.1
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Parse the generated IDs
            generated_ids = self._parse_generated_ids(result_text, missing_ids)
            
            # Cache the result
            self.id_cache[cache_key] = generated_ids
            
            return generated_ids
            
        except Exception as e:
            print(f"Error generating product IDs: {e}")
            return {}
    
    def _build_id_generation_prompt(self, product_data: Dict, missing_ids: List[str]) -> str:
        """Build the prompt for ID generation."""
        
        title = product_data.get('title', '')
        brand = product_data.get('brand', '')
        description = product_data.get('description', '')
        
        id_requirements = {
            'upc': '12-digit UPC code (e.g., 123456789012)',
            'gtin': '13-digit GTIN code (e.g., 0123456789012)',
            'asin': '10-character Amazon ASIN (e.g., B0BDJ6ZPYM)'
        }
        
        requirements_text = ""
        for id_type in missing_ids:
            requirements_text += f"- {id_type.upper()}: {id_requirements.get(id_type, 'standard format')}\n"
        
        prompt = f"""Generate the following product identifiers for this product:

Product Information:
Title: {title}
Brand: {brand}
Description: {description}

Required identifiers:
{requirements_text}

Return the identifiers in this exact format:
UPC: 123456789012
GTIN: 0123456789012
ASIN: B0BDJ6ZPYM

Only include the identifiers that were requested:"""
        
        return prompt
    
    def _parse_generated_ids(self, result_text: str, missing_ids: List[str]) -> Dict[str, str]:
        """Parse generated IDs from GPT response."""
        
        generated_ids = {}
        
        lines = result_text.split('\n')
        for line in lines:
            line = line.strip()
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                
                if key in missing_ids and self._validate_id_format(key, value):
                    generated_ids[key] = value
        
        return generated_ids
    
    def _validate_id_format(self, id_type: str, value: str) -> bool:
        """Validate the format of generated IDs."""
        
        if id_type == 'upc':
            # UPC should be 12 digits
            return bool(re.match(r'^\d{12}$', value))
        elif id_type == 'gtin':
            # GTIN should be 13 digits
            return bool(re.match(r'^\d{13}$', value))
        elif id_type == 'asin':
            # ASIN should be 10 characters, alphanumeric
            return bool(re.match(r'^[A-Z0-9]{10}$', value))
        
        return True
    
    def batch_enrich_products(self, products: List[Dict]) -> List[Dict]:
        """
        Enrich multiple products with missing identifiers.
        
        Args:
            products: List of product dictionaries
            
        Returns:
            List[Dict]: List of enriched product dictionaries
        """
        enriched_products = []
        
        for product in products:
            enriched_product = self.enrich_product_ids(product)
            enriched_products.append(enriched_product)
        
        return enriched_products
    
    def get_enrichment_confidence(self, product_data: Dict, enriched_data: Dict) -> float:
        """
        Get confidence score for the enrichment process.
        
        Args:
            product_data: Original product data
            enriched_data: Enriched product data
            
        Returns:
            float: Confidence score between 0 and 1
        """
        # Simple confidence scoring based on how many IDs were found vs generated
        original_ids = sum(1 for key in ['upc', 'gtin', 'asin'] if product_data.get(key))
        enriched_ids = sum(1 for key in ['upc', 'gtin', 'asin'] if enriched_data.get(key))
        
        if original_ids == 3:  # All IDs were already present
            return 1.0
        
        found_ids = enriched_ids - original_ids
        total_missing = 3 - original_ids
        
        if total_missing == 0:
            return 1.0
        
        return found_ids / total_missing

# Example usage
if __name__ == "__main__":
    enricher = ProductIDEnricher()
    
    # Test product
    test_product = {
        'title': 'iPhone 14 Pro Max 256GB',
        'brand': 'Apple',
        'description': 'Latest iPhone with advanced camera system and A16 chip'
    }
    
    enriched_product = enricher.enrich_product_ids(test_product)
    confidence = enricher.get_enrichment_confidence(test_product, enriched_product)
    
    print("Original product:", test_product)
    print("Enriched product:", enriched_product)
    print(f"Enrichment confidence: {confidence:.2f}") 