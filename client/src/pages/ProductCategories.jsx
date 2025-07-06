var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, File, Folder, FolderPlus, Pencil, Plus, Trash2, MenuSquare, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
// Mock category data
const MOCK_CATEGORIES = [
    {
        id: 1,
        userId: 1,
        name: 'Electronics',
        parentId: null,
        description: 'Electronic devices and gadgets',
        createdAt: new Date('2023-01-15')
    },
    {
        id: 2,
        userId: 1,
        name: 'Phones',
        parentId: 1,
        description: 'Mobile phones and smartphones',
        createdAt: new Date('2023-01-15')
    },
    {
        id: 3,
        userId: 1,
        name: 'Computers',
        parentId: 1,
        description: 'Laptops, desktops and accessories',
        createdAt: new Date('2023-01-15')
    },
    {
        id: 4,
        userId: 1,
        name: 'Audio',
        parentId: 1,
        description: 'Headphones, speakers and audio equipment',
        createdAt: new Date('2023-01-15')
    },
    {
        id: 5,
        userId: 1,
        name: 'Laptops',
        parentId: 3,
        description: 'Portable computers',
        createdAt: new Date('2023-01-20')
    },
    {
        id: 6,
        userId: 1,
        name: 'Desktops',
        parentId: 3,
        description: 'Desktop computers',
        createdAt: new Date('2023-01-20')
    },
    {
        id: 7,
        userId: 1,
        name: 'Computer Accessories',
        parentId: 3,
        description: 'Keyboards, mice, and other computer peripherals',
        createdAt: new Date('2023-01-25')
    },
    {
        id: 8,
        userId: 1,
        name: 'Clothing',
        parentId: null,
        description: 'Apparel and fashion items',
        createdAt: new Date('2023-02-10')
    },
    {
        id: 9,
        userId: 1,
        name: "Men's",
        parentId: 8,
        description: "Men's clothing",
        createdAt: new Date('2023-02-10')
    },
    {
        id: 10,
        userId: 1,
        name: "Women's",
        parentId: 8,
        description: "Women's clothing",
        createdAt: new Date('2023-02-10')
    },
    {
        id: 11,
        userId: 1,
        name: "Children's",
        parentId: 8,
        description: "Children's clothing",
        createdAt: new Date('2023-02-10')
    }
];
export default function ProductCategories() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState([]);
    // Fetch categories - using mock data for now
    const { data: categories, isLoading, isError, refetch } = useQuery({
        queryKey: ['/api/product-categories'],
        queryFn: () => __awaiter(this, void 0, void 0, function* () {
            // In a real app, this would be an API call
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(MOCK_CATEGORIES);
                }, 500);
            });
        }),
        staleTime: 30000,
    });
    const toggleCategory = (categoryId) => {
        if (expandedCategories.includes(categoryId)) {
            setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
        }
        else {
            setExpandedCategories([...expandedCategories, categoryId]);
        }
    };
    const buildCategoryTree = (categories = [], parentId = null, level = 0, parentPath = "") => {
        const filtered = categories.filter(cat => cat.parentId === parentId);
        return filtered.map(category => {
            const path = parentPath ? `${parentPath} / ${category.name}` : category.name;
            return Object.assign(Object.assign({}, category), { level, children: buildCategoryTree(categories, category.id, level + 1, path), isExpanded: expandedCategories.includes(category.id), path });
        });
    };
    const flattenCategoryTree = (tree) => {
        return tree.reduce((acc, node) => {
            acc.push(node);
            if (node.isExpanded && node.children.length > 0) {
                acc.push(...flattenCategoryTree(node.children));
            }
            return acc;
        }, []);
    };
    // Process the categories into a tree structure
    const categoryTree = buildCategoryTree(categories);
    const flattenedCategories = flattenCategoryTree(categoryTree);
    // Filter categories based on search
    const filteredCategories = searchQuery
        ? flattenedCategories.filter(cat => {
            var _a;
            return cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ((_a = cat.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchQuery.toLowerCase()));
        })
        : flattenedCategories;
    return (<div className="p-6">
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-br from-slate-800 to-slate-700 bg-clip-text text-transparent flex items-center">
              <MenuSquare className="mr-2 h-6 w-6 text-slate-700"/>
              Product Categories
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize your products with hierarchical categories
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600">
                <Plus className="h-4 w-4 mr-2"/>
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new product category to organize your inventory
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Form fields would go here */}
                <p className="text-sm text-muted-foreground">
                  Category creation form will be implemented in future update
                </p>
              </div>
              
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Add Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Search categories..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="w-[50%]">Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (Array(5).fill(0).map((_, idx) => (<TableRow key={idx} className="animate-pulse">
                      <TableCell>
                        <div className="h-4 w-40 bg-slate-200 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-60 bg-slate-200 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-10 bg-slate-200 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-20 bg-slate-200 rounded ml-auto"></div>
                      </TableCell>
                    </TableRow>))) : isError ? (<TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Failed to load categories. Please try refreshing.
                    </TableCell>
                  </TableRow>) : filteredCategories.length === 0 ? (<TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No categories found. {searchQuery ? "Try adjusting your search." : "Add your first category to get started."}
                    </TableCell>
                  </TableRow>) : (filteredCategories.map((category) => (<TableRow key={category.id} className="group">
                      <TableCell>
                        <div className="flex items-center">
                          <div style={{ marginLeft: `${category.level * 20}px` }} className="flex items-center">
                            {category.children.length > 0 ? (<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCategory(category.id)}>
                                <ChevronRight className={`h-4 w-4 transition-transform ${category.isExpanded ? 'rotate-90' : ''}`}/>
                              </Button>) : (<div className="w-7"></div>)}
                            
                            {category.children.length > 0 ? (<Folder className="h-5 w-5 text-blue-500 mr-2"/>) : (<File className="h-5 w-5 text-slate-400 mr-2"/>)}
                            
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium inline-block">
                          0 products
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowRight className="h-4 w-4"/>
                            <span className="sr-only">View products</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4"/>
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4"/>
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)))}
              </TableBody>
            </Table>
          </div>
          
          {/* Add Category Card - shown when table is empty */}
          {!isLoading && !isError && (categories === null || categories === void 0 ? void 0 : categories.length) === 0 && (<div className="mt-6 border border-dashed rounded-lg p-6 text-center">
              <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4"/>
              <h3 className="text-lg font-medium mb-2">No Categories Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first product category to organize your inventory.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2"/>
                    Add First Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  {/* Category creation form would go here */}
                </DialogContent>
              </Dialog>
            </div>)}
        </CardContent>
      </Card>
    </div>);
}
