import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Filter, 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
  PackageOpen,
  MoreVertical,
  Check,
  X,
  ExternalLink
} from "lucide-react";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok, SiShopify, SiEbay, SiEtsy } from "react-icons/si";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Product, productStatusEnum } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock products data
const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    userId: 1,
    sku: 'IPHONE14-128-BLK',
    name: 'Apple iPhone 14 128GB Black',
    description: 'Latest iPhone model with A15 Bionic chip, 6.1" Super Retina XDR display, and 12MP camera system.',
    brand: 'Apple',
    category: 'Electronics/Phones',
    imageUrl: 'https://example.com/images/iphone14_black.jpg',
    additionalImages: ['https://example.com/images/iphone14_black_2.jpg', 'https://example.com/images/iphone14_black_3.jpg'],
    price: 799.99,
    salePrice: 749.99,
    cost: 600,
    quantity: 45,
    barcode: '123456789012',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0BN93L1RJ' },
      walmart: { itemId: 'WM12345' }
    },
    attributes: {
      color: 'Black',
      storage: '128GB',
      condition: 'New'
    },
    dimensions: {
      height: 5.78,
      width: 2.82,
      length: 0.31,
      weight: 6.07
    },
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date('2023-11-20'),
    status: 'active',
    variantOf: null
  },
  {
    id: 2,
    userId: 1,
    sku: 'IPHONE14-256-BLK',
    name: 'Apple iPhone 14 256GB Black',
    description: 'Latest iPhone model with A15 Bionic chip, 6.1" Super Retina XDR display, 12MP camera system and 256GB storage.',
    brand: 'Apple',
    category: 'Electronics/Phones',
    imageUrl: 'https://example.com/images/iphone14_black.jpg',
    additionalImages: ['https://example.com/images/iphone14_black_2.jpg', 'https://example.com/images/iphone14_black_3.jpg'],
    price: 899.99,
    salePrice: 849.99,
    cost: 700,
    quantity: 32,
    barcode: '123456789013',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0BN93L2RK' },
      walmart: { itemId: 'WM12346' }
    },
    attributes: {
      color: 'Black',
      storage: '256GB',
      condition: 'New'
    },
    dimensions: {
      height: 5.78,
      width: 2.82,
      length: 0.31,
      weight: 6.07
    },
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date('2023-11-20'),
    status: 'active',
    variantOf: null
  },
  {
    id: 3,
    userId: 1,
    sku: 'AIRPODS-PRO-2',
    name: 'Apple AirPods Pro (2nd Generation)',
    description: 'Active Noise Cancellation, Transparency mode, Personalized Spatial Audio with dynamic head tracking.',
    brand: 'Apple',
    category: 'Electronics/Audio',
    imageUrl: 'https://example.com/images/airpods_pro_2.jpg',
    additionalImages: [],
    price: 249.99,
    salePrice: null,
    cost: 180,
    quantity: 78,
    barcode: '456789012345',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0BDJTQRHF' }
    },
    attributes: {
      color: 'White',
      condition: 'New'
    },
    dimensions: {
      height: 1.22,
      width: 0.86,
      length: 0.94,
      weight: 1.79
    },
    createdAt: new Date('2023-09-10'),
    updatedAt: new Date('2023-10-15'),
    status: 'active',
    variantOf: null
  },
  {
    id: 4,
    userId: 1,
    sku: 'MACBOOK-AIR-M2-256-GRAY',
    name: 'Apple MacBook Air M2 13" (2022) 256GB Space Gray',
    description: 'M2 chip with 8-core CPU and 8-core GPU, 8GB unified memory, 256GB SSD storage',
    brand: 'Apple',
    category: 'Electronics/Computers',
    imageUrl: 'https://example.com/images/macbook_air_m2_gray.jpg',
    additionalImages: [],
    price: 999.99,
    salePrice: 899.99,
    cost: 800,
    quantity: 15,
    barcode: '567890123456',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0B3C5HNXD' }
    },
    attributes: {
      color: 'Space Gray',
      storage: '256GB',
      memory: '8GB',
      condition: 'New'
    },
    dimensions: {
      height: 0.44,
      width: 11.97,
      length: 8.46,
      weight: 2.7
    },
    createdAt: new Date('2023-07-05'),
    updatedAt: new Date('2023-11-05'),
    status: 'active',
    variantOf: null
  },
  {
    id: 5,
    userId: 1,
    sku: 'SAMSUNG-GALAXY-S23-128-BLK',
    name: 'Samsung Galaxy S23 128GB Black',
    description: 'Samsung Galaxy S23 with 6.1" Dynamic AMOLED display, Snapdragon 8 Gen 2, and 50MP camera system.',
    brand: 'Samsung',
    category: 'Electronics/Phones',
    imageUrl: 'https://example.com/images/samsung_s23_black.jpg',
    additionalImages: [],
    price: 799.99,
    salePrice: null,
    cost: 580,
    quantity: 28,
    barcode: '678901234567',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0BLP43HZZ' },
      walmart: { itemId: 'WM45678' }
    },
    attributes: {
      color: 'Black',
      storage: '128GB',
      condition: 'New'
    },
    dimensions: {
      height: 5.76,
      width: 2.79,
      length: 0.30,
      weight: 5.93
    },
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2023-10-10'),
    status: 'active',
    variantOf: null
  },
  {
    id: 6,
    userId: 1,
    sku: 'PIXEL-7-PRO-128-BLK',
    name: 'Google Pixel 7 Pro 128GB Obsidian',
    description: 'Google Tensor G2 processor, 6.7" QHD+ LTPO display, 50MP camera system',
    brand: 'Google',
    category: 'Electronics/Phones',
    imageUrl: 'https://example.com/images/pixel_7_pro_obsidian.jpg',
    additionalImages: [],
    price: 899.99,
    salePrice: 799.99,
    cost: 680,
    quantity: 0,
    barcode: '789012345678',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0BCQZXJVS' }
    },
    attributes: {
      color: 'Obsidian',
      storage: '128GB',
      condition: 'New'
    },
    dimensions: {
      height: 6.4,
      width: 3.0,
      length: 0.3,
      weight: 7.5
    },
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-09-25'),
    status: 'inactive',
    variantOf: null
  },
  {
    id: 7,
    userId: 1,
    sku: 'SONY-WH1000XM5',
    name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    description: 'Industry-leading noise cancellation with Auto NC Optimizer, Crystal clear hands-free calling, and 30-hour battery life.',
    brand: 'Sony',
    category: 'Electronics/Audio',
    imageUrl: 'https://example.com/images/sony_wh1000xm5.jpg',
    additionalImages: [],
    price: 399.99,
    salePrice: 349.99,
    cost: 280,
    quantity: 42,
    barcode: '890123456789',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B09XS7JWHH' }
    },
    attributes: {
      color: 'Black',
      condition: 'New'
    },
    dimensions: {
      height: 9.94,
      width: 7.43,
      length: 3.07,
      weight: 8.8
    },
    createdAt: new Date('2023-05-20'),
    updatedAt: new Date('2023-11-01'),
    status: 'active',
    variantOf: null
  },
  {
    id: 8,
    userId: 1,
    sku: 'LOGITECH-MX-MASTER-3S',
    name: 'Logitech MX Master 3S Wireless Mouse',
    description: 'Advanced wireless mouse with ultra-fast scrolling, 8K DPI tracking, and quiet clicks.',
    brand: 'Logitech',
    category: 'Electronics/Computer Accessories',
    imageUrl: 'https://example.com/images/logitech_mx_master_3s.jpg',
    additionalImages: [],
    price: 99.99,
    salePrice: null,
    cost: 60,
    quantity: 65,
    barcode: '901234567890',
    barcodeType: 'UPC',
    marketplaceData: {
      amazon: { asin: 'B0BS2K3R3J' }
    },
    attributes: {
      color: 'Graphite',
      condition: 'New'
    },
    dimensions: {
      height: 4.92,
      width: 3.31,
      length: 2.01,
      weight: 4.97
    },
    createdAt: new Date('2023-04-10'),
    updatedAt: new Date('2023-10-05'),
    status: 'active',
    variantOf: null
  }
];

// Helper function to get marketplace icon
const getMarketplaceIcon = (marketplace: string) => {
  switch (marketplace.toLowerCase()) {
    case 'amazon': return <SiAmazon className="text-[#FF9900]" />;
    case 'walmart': return <SiWalmart className="text-[#0071CE]" />;
    case 'meta': return <SiMeta className="text-[#1877F2]" />;
    case 'tiktok': return <SiTiktok className="text-[#000000]" />;
    case 'shopify': return <SiShopify className="text-[#7AB55C]" />;
    case 'ebay': return <SiEbay className="text-[#E53238]" />;
    case 'etsy': return <SiEtsy className="text-[#F45800]" />;
    default: return null;
  }
};

export default function Products() {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Fetch products - using mock data for now
  const { data: products, isLoading, isError, refetch } = useQuery<Product[]>({
    queryKey: ['/api/products', statusFilter, sortBy, sortOrder, searchQuery, currentPage],
    queryFn: async () => {
      // In a real app, this would be an API call with filters
      return new Promise<Product[]>((resolve) => {
        setTimeout(() => {
          let filteredProducts = [...MOCK_PRODUCTS];
          
          // Apply status filter
          if (statusFilter) {
            filteredProducts = filteredProducts.filter(p => p.status === statusFilter);
          }
          
          // Apply search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
              p.name.toLowerCase().includes(query) || 
              p.sku.toLowerCase().includes(query) ||
              p.brand?.toLowerCase().includes(query) ||
              p.category?.toLowerCase().includes(query)
            );
          }
          
          // Apply sorting
          filteredProducts.sort((a: any, b: any) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return sortOrder === 'asc' 
                ? aValue.localeCompare(bValue) 
                : bValue.localeCompare(aValue);
            }
            
            // For numeric values
            return sortOrder === 'asc' ? (aValue - bValue) : (bValue - aValue);
          });
          
          resolve(filteredProducts);
        }, 500);
      });
    },
    staleTime: 30000,
  });
  
  const handleSelectAll = () => {
    if (products) {
      if (selectedProducts.length === products.length) {
        setSelectedProducts([]);
      } else {
        setSelectedProducts(products.map(p => p.id));
      }
    }
  };
  
  const handleSelectProduct = (id: number) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };
  
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed inventory",
      description: "Your product catalog has been refreshed",
    });
  };
  
  const handleExport = () => {
    toast({
      title: "Exporting products",
      description: `Exporting ${selectedProducts.length > 0 ? selectedProducts.length : 'all'} products...`,
    });
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };
  
  const renderMarketplaces = (product: Product) => {
    const marketplaces = product.marketplaceData ? Object.keys(product.marketplaceData) : [];
    return (
      <div className="flex space-x-1">
        {marketplaces.map(marketplace => (
          <TooltipProvider key={marketplace}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  {getMarketplaceIcon(marketplace)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };
  
  const InventoryBadge = ({ quantity }: { quantity: number }) => {
    if (quantity <= 0) {
      return <Badge variant="destructive">Out of stock</Badge>;
    } else if (quantity < 5) {
      return <Badge variant="destructive" className="bg-orange-500">Low stock</Badge>;
    } else if (quantity < 15) {
      return <Badge variant="outline" className="border-orange-300 text-orange-700">Limited</Badge>;
    } else {
      return <Badge variant="outline" className="border-green-300 text-green-700">In stock</Badge>;
    }
  };

  return (
    <div className="p-6">
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-br from-slate-800 to-slate-700 bg-clip-text text-transparent flex items-center">
              <PackageOpen className="mr-2 h-6 w-6 text-slate-700" />
              Products
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your inventory across all marketplaces
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Add a new product to your inventory
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Form fields would go here */}
                  <p className="text-sm text-muted-foreground">
                    Product creation form will be implemented in future update
                  </p>
                </div>
                
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Add Product</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div className="flex-1 relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, brand..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
                <SelectTrigger className="h-9 w-[160px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[40px] text-center">
                      <Checkbox 
                        checked={products && products.length > 0 && selectedProducts.length === products.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('sku')}
                    >
                      SKU{renderSortIndicator('sku')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('name')}
                    >
                      Product{renderSortIndicator('name')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('price')}
                    >
                      Price{renderSortIndicator('price')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('quantity')}
                    >
                      Inventory{renderSortIndicator('quantity')}
                    </TableHead>
                    <TableHead>Marketplaces</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('status')}
                    >
                      Status{renderSortIndicator('status')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, idx) => (
                      <TableRow key={idx} className="animate-pulse">
                        <TableCell><div className="h-4 w-4 bg-slate-200 rounded"></div></TableCell>
                        <TableCell><div className="h-4 w-20 bg-slate-200 rounded"></div></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-200 rounded"></div>
                            <div className="h-4 w-32 bg-slate-200 rounded"></div>
                          </div>
                        </TableCell>
                        <TableCell><div className="h-4 w-16 bg-slate-200 rounded"></div></TableCell>
                        <TableCell><div className="h-4 w-20 bg-slate-200 rounded"></div></TableCell>
                        <TableCell><div className="h-4 w-24 bg-slate-200 rounded"></div></TableCell>
                        <TableCell><div className="h-4 w-16 bg-slate-200 rounded"></div></TableCell>
                        <TableCell><div className="h-8 w-8 bg-slate-200 rounded-full ml-auto"></div></TableCell>
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Failed to load products. Please try refreshing.
                      </TableCell>
                    </TableRow>
                  ) : products?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No products found. Try adjusting your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products?.map((product) => (
                      <TableRow key={product.id} className="group">
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => handleSelectProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=No+Image';
                                  }}
                                />
                              ) : (
                                <PackageOpen className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.brand}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">${product.price.toFixed(2)}</span>
                            {product.salePrice && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs line-through text-muted-foreground">${product.price.toFixed(2)}</span>
                                <span className="text-xs text-green-600">${product.salePrice.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{product.quantity}</span>
                            <InventoryBadge quantity={product.quantity} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderMarketplaces(product)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={product.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View in Marketplaces
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export Product
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <X className="h-4 w-4 mr-2" />
                                  Delete Product
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900 border-t">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{products?.length || 0}</span> of{" "}
                <span className="font-medium">{products?.length || 0}</span> products
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(3, Math.max(1, products?.length || 0)) }).map((_, idx) => (
                    <PaginationItem key={idx}>
                      <PaginationLink 
                        isActive={currentPage === idx + 1}
                        onClick={() => setCurrentPage(idx + 1)}
                      >
                        {idx + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(Math.min(3, currentPage + 1))} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}