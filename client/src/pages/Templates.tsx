import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  Download,
  Eye,
  ChevronDown,
  PlusSquare,
  BarChart,
  Tag,
  Grid3X3,
  Smartphone
} from "lucide-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  sample: any;
}

export default function Templates() {
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({
    amazon: "all",
    walmart: "all",
    meta: "all",
    catch: "all",
    tiktok: "all",
    reebelo: "all"
  });
  
  const [previewTemplate, setPreviewTemplate] = useState<TemplateOption | null>(null);
  
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });
  
  // Platform specific category options
  const categoryOptions = {
    amazon: [
      { value: "all", label: "All Categories" },
      { value: "electronics", label: "Electronics" },
      { value: "fashion", label: "Fashion" },
      { value: "home", label: "Home & Kitchen" },
      { value: "beauty", label: "Beauty & Personal Care" },
    ],
    walmart: [
      { value: "all", label: "All Categories" },
      { value: "electronics", label: "Electronics" },
      { value: "apparel", label: "Apparel" },
      { value: "groceries", label: "Groceries" },
      { value: "home", label: "Home" },
    ],
    meta: [
      { value: "all", label: "All Categories" },
      { value: "ecommerce", label: "eCommerce" },
      { value: "travel", label: "Travel" },
      { value: "auto", label: "Automotive" },
      { value: "realEstate", label: "Real Estate" },
    ],
    catch: [
      { value: "all", label: "All Categories" },
      { value: "electronics", label: "Electronics" },
      { value: "homeLiving", label: "Home & Living" },
      { value: "beauty", label: "Health & Beauty" },
      { value: "sports", label: "Sports & Outdoors" },
    ],
    tiktok: [
      { value: "all", label: "All Categories" },
      { value: "apparel", label: "Apparel & Accessories" },
      { value: "beauty", label: "Beauty" },
      { value: "electronics", label: "Electronics" },
      { value: "food", label: "Food & Grocery" },
    ],
    reebelo: [
      { value: "all", label: "All Categories" },
      { value: "phones", label: "Phones" },
      { value: "laptops", label: "Laptops" },
      { value: "tablets", label: "Tablets" },
      { value: "wearables", label: "Wearables" },
    ],
  };
  
  // Platform icons
  const platformIcons = {
    amazon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14.009 19.492c-3.038 1.617-6.097 2.486-9.119 2.486-4.086 0-7.807-1.506-10.649-4.013-.206-.172-.034-.427.225-.304 3.038 1.721 6.806 2.76 10.67 2.76 2.609 0 5.497-.529 8.149-1.617.426-.163.771.265.346.628l-1.506 1.506zM14.934 18.244c-.403-.494-2.654-.244-3.673-.122-.309.04-.355-.225-.081-.409.426-.286 1.191-.815 1.637-1.11.16-.101.32.4.32.132-.8.95-.017 2.244.21 3.015.077.253-.94.34-.32.153-.933-.781-2.215-1.506-2.215-4.013 0-3.38 2.295-6.097 5.415-6.097 2.761 0 4.219 1.326 4.219 3.214 0 2.194-1.453 3.827-3.4 3.827-.669 0-1.301-.356-1.129-1.326l.309-1.355c.264-1.059-.563-1.925-1.364-1.925-1.09 0-1.968 1.13-1.968 2.796 0 1.019.345 1.719 1.06 1.719.471 0 .878-.254 1.046-.571.168-.317.471-1.772.487-1.869.16-1.009.595-1.506 1.396-1.506 1.608 0 2.772 1.671 2.772 4.088 0 1.396-.435 2.499-1.12 3.331-.22.272-.531.224-.691.162l-.31-.162zM18.025 4.013C16.519 2.904 14.364 2.245 12.41 2.245c-2.761 0-5.252 1.022-7.14 2.724-.19.173-.02.41.21.225 1.034-.61 2.123-1.144 3.245-1.429 1.596-.407 3.41-.468 5.08-.203.326.05.669.128 1.006.212.326.081.669.175 1.006.285.326.97.645.204.961.326.153.56.287.115.421.174.065.3.128.56.188.085h.003c.084.42.14.126.06.203l-.425.366z"></path></svg>,
    walmart: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.4 2.4h19.2v19.2H2.4V2.4zm10.08 13.764c1.013 0 1.535-.649 1.535-1.535 0-1.05-.875-1.318-1.673-1.51-.483-.126-.847-.252-.847-.521 0-.252.203-.414.539-.414.431 0 .686.288.686.703h1.39c.028-1.14-.948-1.78-2.04-1.78-1.02 0-1.95.617-1.95 1.639 0 .988.858 1.263 1.612 1.427.47.113.895.232.895.575 0 .234-.218.469-.575.469-.486 0-.757-.252-.757-.757H10.09c0 1.222.889 1.703 2.389 1.703zm-4.097-2.66h1.129c.324 0 .559.146.559.543 0 .378-.228.575-.598.575h-1.09v-1.119zm0-1.868h1.03c.31 0 .534.16.534.495 0 .361-.253.495-.534.495h-1.03V11.64zm-1.408 3.99h2.648c.998 0 1.913-.501 1.913-1.51 0-.688-.268-1.046-.723-1.28.218-.18.541-.562.541-1.16 0-.927-.628-1.52-1.857-1.52H6.975v5.47zm7.5-5.47v5.47h1.408v-1.82h.539c1.19 0 1.93-.612 1.93-1.822 0-1.2-.718-1.83-1.913-1.83h-1.961zm1.408 1.139h.495c.378 0 .631.2.631.633 0 .431-.288.631-.598.631h-.535V11.3z"></path></svg>,
    meta: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.001 2c5.523 0 10 4.477 10 10s-4.477 10-10 10c-4.96 0-9.121-3.61-9.88-8.342-.092-.575-.115-1.09-.12-1.635V12c0-5.523 4.477-10 10-10zm0 1.5c-4.69 0-8.5 3.809-8.5 8.5v.069a8.52 8.52 0 0 1 .117 1.367c.646 3.993 4.126 7.054 8.38 7.064 4.687-.001 8.494-3.826 8.5-8.519-.007-4.699-3.814-8.481-8.5-8.481zm-5.002 8.734c.136.616.354 1.192.645 1.723.231.421.55.645.92.645.55 0 .974-.336 1.935-1.437l.937-1.067 1.281 1.067c.969 1.102 1.394 1.437 1.944 1.437.3 0 .558-.141.771-.37l-.141-.172a2.4 2.4 0 0 1-.166-.24 1.415 1.415 0 0 1-.156-.309c-.124-.348-.196-.753-.196-1.177 0-.612.123-1.158.318-1.59a3.12 3.12 0 0 1 .196-.353c.088-.126.188-.246.304-.345l-.138-.162a1.017 1.017 0 0 0-.779-.37c-.55 0-.975.336-1.944 1.438l-1.278 1.067-.934-1.067c-.957-1.102-1.381-1.437-1.932-1.437a1.029 1.029 0 0 0-.92.645c-.294.535-.513 1.115-.65 1.735-.057.259-.086.527-.089.796.003.265.031.531.087.786z"></path></svg>,
    catch: <Grid3X3 size={20} />,
    tiktok: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258c-.623-.412-1.11-.933-1.448-1.55a5.273 5.273 0 0 1-.494-1.885H16.9v11.458a2.92 2.92 0 0 1-.187 1.025 2.943 2.943 0 0 1-4.072 1.35 2.941 2.941 0 0 1 .89-5.415c.188 0 .376.02.559.06v-3.076c-.184-.013-.37-.012-.555.002a6.005 6.005 0 0 0-1.726.347 6.033 6.033 0 0 0-2.929 2.078 6.027 6.027 0 0 0-1.2 3.604 6.017 6.017 0 0 0 .376 2.123 6.03 6.03 0 0 0 3.312 3.512c1.359.54 2.91.544 4.272.01 1.196-.471 2.19-1.313 2.85-2.41.511-.846.798-1.796.844-2.771V8.257a9.507 9.507 0 0 0 2.306.868c.715.155 1.445.21 2.169.165V6.23a5.259 5.259 0 0 1-1.092-.118 5.07 5.07 0 0 1-2.125-.975l.019.024z"></path></svg>,
    reebelo: <Smartphone size={20} />
  };
  
  // Template preview samples
  const templateSamples = {
    amazon: [
      { sku: "ABC123", "product-id": "XYZ456", "product-id-type": "UPC", brand: "Sample Brand", item_name: "Sample Product", standard_price: "19.99", quantity: "100", main_image_url: "https://example.com/image.jpg", description: "This is a sample product description." }
    ],
    walmart: [
      { sku: "WM-123", productName: "Sample Walmart Product", price: "24.99", productCategory: "Electronics", brand: "Sample", upc: "123456789012", shortDescription: "A sample product for Walmart" }
    ],
    meta: [
      { id: "FB-123", title: "Sample Meta Product", description: "Meta product description", availability: "in stock", condition: "new", price: "29.99 USD", link: "https://example.com/product", image_link: "https://example.com/image.jpg" }
    ],
    catch: [
      { sku: "CATCH-123", name: "Sample Catch Product", description: "Product for Catch marketplace", price: "39.99", brand: "Sample", stock: "50", category: "Electronics" }
    ],
    tiktok: [
      { sku: "TT-123", title: "Sample TikTok Product", description: "Great product for TikTok", price: "19.99", inventory: "15", image_url: "https://example.com/tiktok.jpg" }
    ],
    reebelo: [
      { sku: "RB-123", title: "Sample Reebelo Device", brand: "SampleTech", model: "X5", condition: "Refurbished", price: "199.99", stock: "10" }
    ]
  };
  
  // Template field requirements
  const templateFields = {
    amazon: [
      { name: "sku", required: true, description: "Unique product identifier" },
      { name: "product-id", required: true, description: "UPC, EAN, ISBN, or ASIN" },
      { name: "product-id-type", required: true, description: "Type of product ID (UPC, EAN, ISBN, ASIN)" },
      { name: "brand", required: true, description: "Brand name" },
      { name: "item_name", required: true, description: "Product title" },
      { name: "standard_price", required: true, description: "Product price" },
      { name: "quantity", required: true, description: "Available quantity" },
      { name: "main_image_url", required: true, description: "URL to main product image" },
      { name: "description", required: false, description: "Product description" }
    ],
    walmart: [
      { name: "sku", required: true, description: "Unique product identifier" },
      { name: "productName", required: true, description: "Product title" },
      { name: "price", required: true, description: "Product price" },
      { name: "productCategory", required: true, description: "Product category" },
      { name: "brand", required: true, description: "Brand name" },
      { name: "upc", required: true, description: "Universal Product Code" },
      { name: "shortDescription", required: false, description: "Short product description" }
    ],
    meta: [
      { name: "id", required: true, description: "Unique product identifier" },
      { name: "title", required: true, description: "Product title" },
      { name: "description", required: true, description: "Product description" },
      { name: "availability", required: true, description: "Stock status (in stock, out of stock)" },
      { name: "condition", required: true, description: "Product condition (new, used, refurbished)" },
      { name: "price", required: true, description: "Product price with currency" },
      { name: "link", required: true, description: "URL to product page" },
      { name: "image_link", required: true, description: "URL to product image" }
    ],
    tiktok: [
      { name: "sku", required: true, description: "Unique product identifier" },
      { name: "title", required: true, description: "Product title" },
      { name: "description", required: true, description: "Product description" },
      { name: "price", required: true, description: "Product price" },
      { name: "inventory", required: true, description: "Available quantity" },
      { name: "image_url", required: true, description: "URL to product image" }
    ],
    catch: [
      { name: "sku", required: true, description: "Unique product identifier" },
      { name: "name", required: true, description: "Product name" },
      { name: "description", required: true, description: "Product description" },
      { name: "price", required: true, description: "Product price" },
      { name: "brand", required: true, description: "Brand name" },
      { name: "stock", required: true, description: "Available stock" },
      { name: "category", required: true, description: "Product category" }
    ],
    reebelo: [
      { name: "sku", required: true, description: "Unique product identifier" },
      { name: "title", required: true, description: "Product title" },
      { name: "brand", required: true, description: "Brand name" },
      { name: "model", required: true, description: "Model number/name" },
      { name: "condition", required: true, description: "Product condition" },
      { name: "price", required: true, description: "Product price" },
      { name: "stock", required: true, description: "Available quantity" }
    ]
  };
  
  function handleCategoryChange(platform: string, category: string) {
    setSelectedCategories({
      ...selectedCategories,
      [platform]: category
    });
  }
  
  function handlePreview(platform: string) {
    const template = {
      id: platform,
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      category: selectedCategories[platform],
      icon: platformIcons[platform as keyof typeof platformIcons],
      sample: templateSamples[platform as keyof typeof templateSamples]
    };
    
    setPreviewTemplate(template);
  }
  
  function handleDownload(platform: string) {
    // In a real app, this would generate and download a CSV template
    // For now, we'll just simulate with an alert
    alert(`Downloading ${platform} template for ${selectedCategories[platform]} category`);
  }
  
  function closePreviewDialog() {
    setPreviewTemplate(null);
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Marketplace Templates</h1>
          <Button variant="outline" className="flex items-center gap-2">
            <PlusSquare size={16} />
            <span>Create Custom Template</span>
          </Button>
        </div>
        
        <p className="text-slate-400 mb-8">
          Download marketplace-ready templates pre-configured for different product categories. Our AI-powered system will automatically transform your data to match the required format.
        </p>
        
        <div className="space-y-4">
          {/* Amazon Template */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-amber-900/20 flex items-center justify-center text-amber-500">
                    {platformIcons.amazon}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Amazon</h3>
                    <p className="text-sm text-slate-400">Inventory Loader Format</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={selectedCategories.amazon} onValueChange={(value) => handleCategoryChange("amazon", value)}>
                    <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categoryOptions.amazon.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handlePreview("amazon")}
                        >
                          <Eye size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Preview Template</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDownload("amazon")}
                        >
                          <Download size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download Template</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    SKU
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    UPC/EAN
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Brand
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Price
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Quantity
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <BarChart className="h-3 w-3 mr-1" />
                    9 Required Fields
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Walmart Template */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-blue-900/20 flex items-center justify-center text-blue-500">
                    {platformIcons.walmart}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Walmart</h3>
                    <p className="text-sm text-slate-400">Marketplace Catalog Format</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={selectedCategories.walmart} onValueChange={(value) => handleCategoryChange("walmart", value)}>
                    <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categoryOptions.walmart.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handlePreview("walmart")}
                        >
                          <Eye size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Preview Template</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDownload("walmart")}
                        >
                          <Download size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download Template</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    SKU
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    UPC
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Brand
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Price
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Category
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <BarChart className="h-3 w-3 mr-1" />
                    7 Required Fields
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Meta Template */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-blue-900/20 flex items-center justify-center text-blue-500">
                    {platformIcons.meta}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Meta (Facebook)</h3>
                    <p className="text-sm text-slate-400">Product Catalog Format</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={selectedCategories.meta} onValueChange={(value) => handleCategoryChange("meta", value)}>
                    <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categoryOptions.meta.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handlePreview("meta")}
                        >
                          <Eye size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Preview Template</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDownload("meta")}
                        >
                          <Download size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download Template</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    ID
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Title
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Description
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Price
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <Tag className="h-3 w-3 mr-1" />
                    Availability
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300">
                    <BarChart className="h-3 w-3 mr-1" />
                    8 Required Fields
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Other platform templates (TikTok, Catch, Reebelo) can be added in the same format */}
          
        </div>
      </div>
      
      {/* Template Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={closePreviewDialog}>
          <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-6 w-6 flex items-center justify-center text-slate-300">
                  {previewTemplate.icon}
                </div>
                <span>{previewTemplate.name} Template</span>
                <Badge variant="outline" className="ml-2">
                  {categoryOptions[previewTemplate.id as keyof typeof categoryOptions].find(
                    cat => cat.value === previewTemplate.category
                  )?.label || "All Categories"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Required fields and example data for {previewTemplate.name} marketplace.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields">Required Fields</TabsTrigger>
                <TabsTrigger value="sample">Sample Data</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fields" className="p-1">
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="text-left p-3 font-semibold text-slate-300">Field</th>
                        <th className="text-left p-3 font-semibold text-slate-300">Required</th>
                        <th className="text-left p-3 font-semibold text-slate-300">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateFields[previewTemplate.id as keyof typeof templateFields].map((field, i) => (
                        <tr key={i} className="border-t border-slate-800">
                          <td className="p-3 text-slate-300 font-mono">{field.name}</td>
                          <td className="p-3">
                            {field.required ? (
                              <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-800 text-slate-400">
                                Optional
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">{field.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              
              <TabsContent value="sample" className="p-1">
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800">
                        {Object.keys(previewTemplate.sample[0]).map((key, i) => (
                          <th key={i} className="text-left p-3 font-semibold text-slate-300 font-mono">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewTemplate.sample.map((item, i) => (
                        <tr key={i} className="border-t border-slate-800">
                          {Object.values(item).map((val, j) => (
                            <td key={j} className="p-3 text-slate-400 font-mono text-xs truncate max-w-[160px]">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-sm text-slate-400">
                  <p className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Download this template to get started with your product feed.</span>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={closePreviewDialog}>
                Close
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                onClick={() => handleDownload(previewTemplate.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}