import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Download, FileSpreadsheet, Info, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger, } from "@/components/ui/hover-card";
// Define marketplace-specific template structures
const templateFields = {
    amazon: [
        { name: 'sku', required: true, description: 'Unique identifier for your product' },
        { name: 'product-id', required: true, description: 'Amazon identifier (ASIN, UPC, EAN, etc.)' },
        { name: 'product-id-type', required: true, description: 'Type of ID (1=ASIN, 2=ISBN, 3=UPC, 4=EAN)' },
        { name: 'product_category', required: true, description: 'Amazon category classification' },
        { name: 'brand', required: true, description: 'Brand name of the product' },
        { name: 'item_name', required: true, description: 'Product title' },
        { name: 'manufacturer', required: false, description: 'Manufacturer name if different from brand' },
        { name: 'part_number', required: false, description: 'Manufacturer part number' },
        { name: 'standard_price', required: true, description: 'Product selling price' },
        { name: 'quantity', required: true, description: 'Available inventory quantity' },
        { name: 'main_image_url', required: true, description: 'Primary product image URL' },
        { name: 'other_image_url1', required: false, description: 'Additional product image URL' },
        { name: 'other_image_url2', required: false, description: 'Additional product image URL' },
        { name: 'other_image_url3', required: false, description: 'Additional product image URL' },
        { name: 'description', required: true, description: 'Detailed product description' },
        { name: 'bullet_point1', required: false, description: 'Feature bullet point 1' },
        { name: 'bullet_point2', required: false, description: 'Feature bullet point 2' },
        { name: 'bullet_point3', required: false, description: 'Feature bullet point 3' },
        { name: 'bullet_point4', required: false, description: 'Feature bullet point 4' },
        { name: 'bullet_point5', required: false, description: 'Feature bullet point 5' },
        { name: 'search_terms', required: false, description: 'Keywords to improve search visibility' },
        { name: 'item_dimensions', required: false, description: 'Product dimensions in specified unit' },
        { name: 'item_weight', required: false, description: 'Product weight in specified unit' },
        { name: 'fulfillment_center_id', required: false, description: 'For FBA: fulfillment center ID' },
    ],
    walmart: [
        { name: 'sku', required: true, description: 'Unique SKU for your product' },
        { name: 'product_name', required: true, description: 'Product title (max 200 chars)' },
        { name: 'brand', required: true, description: 'Brand name' },
        { name: 'price', required: true, description: 'Regular selling price' },
        { name: 'primary_image_url', required: true, description: 'Main product image URL' },
        { name: 'shelf_description', required: true, description: 'Short product description' },
        { name: 'long_description', required: true, description: 'Detailed product description' },
        { name: 'GTIN', required: true, description: 'Global Trade Item Number (UPC, EAN, etc.)' },
        { name: 'category', required: true, description: 'Walmart category ID or path' },
        { name: 'subcategory', required: false, description: 'Walmart subcategory' },
        { name: 'attributes', required: false, description: 'Product attributes in JSON format' },
        { name: 'additional_image_urls', required: false, description: 'Additional image URLs (comma separated)' },
        { name: 'shipping_weight', required: true, description: 'Product shipping weight with unit' },
        { name: 'tax_code', required: false, description: 'Walmart tax category code' },
        { name: 'height', required: false, description: 'Product height with unit' },
        { name: 'width', required: false, description: 'Product width with unit' },
        { name: 'length', required: false, description: 'Product length with unit' },
        { name: 'color', required: false, description: 'Product color' },
        { name: 'size', required: false, description: 'Product size' },
        { name: 'model_number', required: false, description: 'Manufacturer model number' },
    ],
    meta: [
        { name: 'id', required: true, description: 'Unique product ID in your catalog' },
        { name: 'title', required: true, description: 'Product name/title' },
        { name: 'description', required: true, description: 'Product description' },
        { name: 'availability', required: true, description: 'in stock or out of stock' },
        { name: 'condition', required: true, description: 'new, refurbished, or used' },
        { name: 'price', required: true, description: 'Price with currency (e.g., 19.99 USD)' },
        { name: 'link', required: true, description: 'URL to product page on your website' },
        { name: 'image_link', required: true, description: 'URL to product image' },
        { name: 'brand', required: true, description: 'Brand name' },
        { name: 'google_product_category', required: false, description: 'Google product category ID' },
        { name: 'fb_product_category', required: false, description: 'Facebook product category ID' },
        { name: 'color', required: false, description: 'Product color' },
        { name: 'size', required: false, description: 'Product size' },
        { name: 'gender', required: false, description: 'Target gender (male, female, unisex)' },
        { name: 'age_group', required: false, description: 'Target age group' },
        { name: 'material', required: false, description: 'Product material' },
        { name: 'pattern', required: false, description: 'Product pattern' },
        { name: 'shipping', required: false, description: 'Shipping details (country:price:region)' },
        { name: 'tax', required: false, description: 'Tax details (country:rate:region:tax_ship)' },
        { name: 'additional_image_link', required: false, description: 'Additional image URLs (comma separated)' },
    ],
    tiktok: [
        { name: 'product_id', required: true, description: 'Unique identifier for your product' },
        { name: 'title', required: true, description: 'Product name/title' },
        { name: 'description', required: true, description: 'Product description' },
        { name: 'availability', required: true, description: 'in stock or out of stock' },
        { name: 'price', required: true, description: 'Price with currency (e.g., 19.99 USD)' },
        { name: 'main_image', required: true, description: 'Primary product image URL' },
        { name: 'additional_images', required: false, description: 'Additional image URLs (comma-separated)' },
        { name: 'condition', required: true, description: 'Product condition: new, refurbished, used' },
        { name: 'brand', required: true, description: 'Brand name' },
        { name: 'shop_category', required: true, description: 'TikTok Shop category' },
        { name: 'shipping_weight', required: false, description: 'Product shipping weight' },
        { name: 'color', required: false, description: 'Product color' },
        { name: 'size', required: false, description: 'Product size' },
        { name: 'sale_price', required: false, description: 'Sale price with currency if on sale' },
        { name: 'sale_start_date', required: false, description: 'Start date of sale' },
        { name: 'sale_end_date', required: false, description: 'End date of sale' },
        { name: 'gtin', required: false, description: 'Global Trade Item Number' },
        { name: 'mpn', required: false, description: 'Manufacturer Part Number' },
        { name: 'inventory', required: true, description: 'Available inventory quantity' },
        { name: 'shipping_time', required: false, description: 'Shipping time details' },
    ],
    catch: [
        { name: 'sku', required: true, description: 'Unique identifier for your product' },
        { name: 'title', required: true, description: 'Product name/title' },
        { name: 'description', required: true, description: 'Product description' },
        { name: 'price', required: true, description: 'Current selling price' },
        { name: 'rrp', required: false, description: 'Recommended retail price' },
        { name: 'brand', required: true, description: 'Brand name' },
        { name: 'category', required: true, description: 'Catch marketplace category' },
        { name: 'stock', required: true, description: 'Available inventory quantity' },
        { name: 'barcode', required: false, description: 'Product barcode (EAN, UPC, etc.)' },
        { name: 'image_url', required: true, description: 'Primary product image URL' },
        { name: 'additional_image_urls', required: false, description: 'Additional image URLs (comma separated)' },
        { name: 'weight', required: true, description: 'Product weight in kg' },
        { name: 'length', required: true, description: 'Product length in cm' },
        { name: 'width', required: true, description: 'Product width in cm' },
        { name: 'height', required: true, description: 'Product height in cm' },
        { name: 'color', required: false, description: 'Product color' },
        { name: 'size', required: false, description: 'Product size' },
        { name: 'features', required: false, description: 'Product features in JSON format' },
        { name: 'warranty', required: false, description: 'Warranty information' },
        { name: 'shipping_time', required: false, description: 'Shipping time in days' },
    ],
    reebelo: [
        { name: 'sku', required: true, description: 'Unique identifier for your product' },
        { name: 'title', required: true, description: 'Product name/title' },
        { name: 'description', required: true, description: 'Product description' },
        { name: 'brand', required: true, description: 'Brand name' },
        { name: 'model', required: true, description: 'Product model name/number' },
        { name: 'category', required: true, description: 'Product category' },
        { name: 'price', required: true, description: 'Current selling price' },
        { name: 'condition', required: true, description: 'Product condition (New, Refurbished, Used)' },
        { name: 'condition_description', required: false, description: 'Detailed condition information' },
        { name: 'stock', required: true, description: 'Available inventory quantity' },
        { name: 'color', required: false, description: 'Product color' },
        { name: 'storage', required: false, description: 'Storage capacity (for electronics)' },
        { name: 'connectivity', required: false, description: 'Connectivity type (e.g., WiFi, Cellular)' },
        { name: 'image_url', required: true, description: 'Primary product image URL' },
        { name: 'additional_image_urls', required: false, description: 'Additional image URLs (comma separated)' },
        { name: 'warranty_period', required: false, description: 'Warranty period in months' },
        { name: 'gtin', required: false, description: 'Global Trade Item Number' },
        { name: 'mpn', required: false, description: 'Manufacturer Part Number' },
        { name: 'shipping_weight', required: false, description: 'Product shipping weight' },
        { name: 'country_of_origin', required: false, description: 'Country where product was manufactured' },
    ]
};
// Mock data for sample rows
const sampleRows = {
    amazon: [
        {
            sku: 'IPHONE-14-BLK-128',
            'product-id': 'B0BN93L1RJ',
            'product-id-type': '1',
            brand: 'Apple',
            item_name: 'Apple iPhone 14 128GB Black Unlocked Smartphone',
            standard_price: '799.00',
            quantity: '50',
            main_image_url: 'https://example.com/images/iphone14_black.jpg',
            description: 'Latest iPhone model with A15 Bionic chip, 6.1" Super Retina XDR display, and 12MP camera system.',
        },
        {
            sku: 'AIRPODS-PRO-2',
            'product-id': 'B0BDJTQRHF',
            'product-id-type': '1',
            brand: 'Apple',
            item_name: 'Apple AirPods Pro (2nd Generation) with MagSafe Case',
            standard_price: '249.00',
            quantity: '100',
            main_image_url: 'https://example.com/images/airpods_pro_2.jpg',
            description: 'Active Noise Cancellation, Transparency mode, Personalized Spatial Audio with dynamic head tracking.',
        }
    ],
    walmart: [
        {
            sku: 'TV-SAMSUNG-55-Q70A',
            product_name: 'Samsung 55" Class Q70A QLED 4K Smart TV (2021)',
            brand: 'Samsung',
            price: '899.99',
            primary_image_url: 'https://example.com/images/samsung_q70a_55.jpg',
            shelf_description: '4K QLED Smart TV with Quantum HDR',
            GTIN: '887276453569',
            category: 'Electronics/TVs',
        },
        {
            sku: 'KITCHEN-MIXER-RED',
            product_name: 'KitchenAid Artisan Series 5 Quart Tilt-Head Stand Mixer, Empire Red',
            brand: 'KitchenAid',
            price: '399.99',
            primary_image_url: 'https://example.com/images/kitchenaid_red.jpg',
            shelf_description: '5 Quart Tilt-Head Stand Mixer with 10 speeds',
            GTIN: '883049319827',
            category: 'Home/Kitchen Appliances',
        }
    ],
    meta: [
        {
            id: 'SHOE-NIKE-AIR-9',
            title: 'Nike Air Jordan 1 Mid',
            description: 'Iconic basketball shoes with premium leather upper and Air-Sole cushioning',
            availability: 'in stock',
            condition: 'new',
            price: '120.00 USD',
            link: 'https://example.com/products/nike-air-jordan-1-mid',
            image_link: 'https://example.com/images/nike_air_jordan_1.jpg',
            brand: 'Nike',
        },
        {
            id: 'HOODIE-CHAMPION-L-GRAY',
            title: 'Champion Reverse Weave Hoodie',
            description: 'Classic pullover hoodie with signature Reverse Weave fabric that minimizes shrinkage',
            availability: 'in stock',
            condition: 'new',
            price: '60.00 USD',
            link: 'https://example.com/products/champion-reverse-weave-hoodie',
            image_link: 'https://example.com/images/champion_hoodie.jpg',
            brand: 'Champion',
        }
    ],
    tiktok: [
        {
            product_id: 'MAKEUP-PALETTE-101',
            title: 'Shimmer Eyes Eyeshadow Palette',
            description: '15 highly pigmented shimmer shades for creating stunning eye looks',
            availability: 'in stock',
            price: '25.99 USD',
            main_image: 'https://example.com/images/shimmer_eyes_palette.jpg',
            condition: 'new',
            brand: 'Beauty Glow',
            shop_category: 'Beauty/Makeup/Eyes',
            inventory: '200',
        },
        {
            product_id: 'WATER-BOTTLE-INSULATED',
            title: 'Stainless Steel Insulated Water Bottle 24oz',
            description: 'Double-wall vacuum insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours',
            availability: 'in stock',
            price: '29.99 USD',
            main_image: 'https://example.com/images/insulated_bottle.jpg',
            condition: 'new',
            brand: 'HydroKeep',
            shop_category: 'Sports & Outdoors/Hydration',
            inventory: '150',
        }
    ],
    catch: [
        {
            sku: 'DRONE-MINI-PRO',
            title: 'Mini Pro Drone with 4K Camera',
            description: 'Compact drone with 4K camera, 30 minutes flight time, and obstacle avoidance',
            price: '599.00',
            rrp: '699.00',
            brand: 'DroneX',
            category: 'Electronics/Drones & Accessories',
            stock: '25',
            image_url: 'https://example.com/images/mini_pro_drone.jpg',
            weight: '0.35',
        },
        {
            sku: 'COFFEE-MACHINE-DELUXE',
            title: 'Deluxe Espresso Coffee Machine',
            description: 'Professional-grade espresso machine with built-in grinder and milk frother',
            price: '449.00',
            rrp: '549.00',
            brand: 'BrewMaster',
            category: 'Home/Kitchen/Coffee Machines',
            stock: '15',
            image_url: 'https://example.com/images/deluxe_coffee_machine.jpg',
            weight: '9.2',
        }
    ],
    reebelo: [
        {
            sku: 'MACBOOK-AIR-M2-256',
            title: 'Apple MacBook Air M2 13" (2022) 256GB Space Gray',
            description: 'M2 chip with 8-core CPU and 8-core GPU, 8GB unified memory, 256GB SSD storage',
            brand: 'Apple',
            model: 'MacBook Air M2',
            category: 'Laptops/MacBooks',
            price: '999.00',
            condition: 'Refurbished',
            condition_description: 'Like new, minor cosmetic imperfections possible. Battery health >95%',
            stock: '10',
            color: 'Space Gray',
            storage: '256GB',
            image_url: 'https://example.com/images/macbook_air_m2_gray.jpg',
        },
        {
            sku: 'PIXEL-7-PRO-128-BLK',
            title: 'Google Pixel 7 Pro 128GB Obsidian',
            description: 'Google Tensor G2 processor, 6.7" QHD+ LTPO display, 50MP camera system',
            brand: 'Google',
            model: 'Pixel 7 Pro',
            category: 'Phones/Android',
            price: '799.00',
            condition: 'Refurbished',
            condition_description: 'Very good condition. Minor scratches possible. Battery health >90%',
            stock: '15',
            color: 'Obsidian',
            storage: '128GB',
            image_url: 'https://example.com/images/pixel_7_pro_obsidian.jpg',
        }
    ]
};
export function TemplatePreview({ marketplaceType, children, className, trigger }) {
    const [activeTab, setActiveTab] = useState("table");
    const marketplace = marketplaceType.toLowerCase();
    const fields = templateFields[marketplace] || [];
    const samples = sampleRows[marketplace] || [];
    // Get required fields for the marketplace
    const requiredFields = fields.filter(field => field.required).map(field => field.name);
    return (<Dialog>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4"/>
          Preview Template
        </Button>}
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {marketplace.charAt(0).toUpperCase() + marketplace.slice(1)} Template Structure
            <Badge className="ml-2 text-xs" variant="outline">
              {fields.length} Fields
            </Badge>
            <Badge className="ml-2 text-xs" variant="outline">
              {requiredFields.length} Required
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Preview the structure and sample data for {marketplace.charAt(0).toUpperCase() + marketplace.slice(1)} marketplace template
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="table" onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="sample">Sample Data</TabsTrigger>
              <TabsTrigger value="excel">Excel Preview</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4"/>
              Download Template
            </Button>
          </div>
          
          <TabsContent value="table" className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-4">
                <h3 className="text-xl font-semibold text-white">Field Specifications</h3>
                <p className="text-gray-300 text-sm">
                  The table below shows all required and optional fields for the {marketplace} template
                </p>
              </div>
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[250px]">Field Name</TableHead>
                      <TableHead className="w-[100px] text-center">Required</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => (<TableRow key={field.name}>
                        <TableCell className="font-medium">{field.name}</TableCell>
                        <TableCell className="text-center">
                          {field.required ? (<Check className="h-5 w-5 text-green-500 mx-auto"/>) : (<X className="h-5 w-5 text-gray-300 mx-auto"/>)}
                        </TableCell>
                        <TableCell>{field.description}</TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sample">
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-4">
                <h3 className="text-xl font-semibold text-white">Sample Entries</h3>
                <p className="text-gray-300 text-sm">
                  Example of how your data should look for {marketplace} marketplace
                </p>
              </div>
              <div className="max-h-[500px] overflow-auto p-4">
                <div className="grid grid-cols-1 gap-6">
                  {samples.map((sample, index) => (<div key={index} className="border rounded-lg p-4 bg-card">
                      <h4 className="font-medium mb-3 pb-2 border-b">Sample Item #{index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        {Object.entries(sample).map(([key, value]) => (<div key={key} className="flex flex-col">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-muted-foreground mr-2">{key}:</span>
                              {requiredFields.includes(key) && (<HoverCard>
                                  <HoverCardTrigger>
                                    <Info className="h-3 w-3 text-primary cursor-help"/>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="text-xs">
                                    Required field
                                  </HoverCardContent>
                                </HoverCard>)}
                            </div>
                            <span className="text-sm truncate text-ellipsis overflow-hidden">{value}</span>
                          </div>))}
                      </div>
                    </div>))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="excel">
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-white">Excel Preview</h3>
                  <p className="text-gray-300 text-sm">
                    Preview of how the template would appear in a spreadsheet
                  </p>
                </div>
                <FileSpreadsheet className="h-10 w-10 text-white opacity-75"/>
              </div>
              <div className="bg-white overflow-x-auto">
                <table className="min-w-full border-collapse border-spacing-0">
                  <thead>
                    <tr className="bg-green-100">
                      {fields.slice(0, 10).map((field, i) => (<th key={i} className="border border-gray-300 px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {field.name}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((sample, rowIndex) => (<tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        {fields.slice(0, 10).map((field, colIndex) => (<td key={colIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '150px' }}>
                            {sample[field.name] || ''}
                          </td>))}
                      </tr>))}
                    {/* Add an empty row at the end */}
                    <tr className="bg-gray-50">
                      {fields.slice(0, 10).map((_, i) => (<td key={i} className="border border-gray-300 px-4 py-2">&nbsp;</td>))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-2 bg-gray-100 border-t text-xs text-gray-500 flex items-center">
                <Info className="h-3 w-3 mr-1"/>
                {fields.length > 10 && `${fields.length - 10} more fields are available in the full template`}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {children}
      </DialogContent>
    </Dialog>);
}
export default TemplatePreview;
