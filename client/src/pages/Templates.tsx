import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TemplateCard from "@/components/TemplateCard";
import { Template } from "@shared/schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Templates() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState("");
  const [marketplace, setMarketplace] = useState("amazon");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  
  // Fetch all templates
  const { data: templates, isLoading, isError } = useQuery<Template[]>({
    queryKey: ['/api/templates'],
    staleTime: 30000,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return await apiRequest("POST", "/api/templates", templateData).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "Your template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to create template",
        description: error.message || "There was an error creating your template.",
        variant: "destructive",
      });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/templates/${id}`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Template updated",
        description: "Your template has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to update template",
        description: error.message || "There was an error updating your template.",
        variant: "destructive",
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/templates/${id}`, undefined).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "Your template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete template",
        description: error.message || "There was an error deleting your template.",
        variant: "destructive",
      });
    }
  });

  // Use template mutation
  const useTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/templates/${id}/use`, undefined).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Template used",
        description: "The template has been applied successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to use template",
        description: error.message || "There was an error using this template.",
        variant: "destructive",
      });
    }
  });

  // Reset form
  const resetForm = () => {
    setTemplateName("");
    setMarketplace("amazon");
    setCategories([]);
    setCategoryInput("");
    setEditTemplateId(null);
  };

  // Handle add category
  const handleAddCategory = () => {
    if (categoryInput.trim() !== "") {
      setCategories([...categories, categoryInput.trim()]);
      setCategoryInput("");
    }
  };

  // Handle remove category
  const handleRemoveCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!templateName) {
      toast({
        title: "Validation Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (categories.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one category",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      userId: 1, // Always use demo user
      name: templateName,
      marketplace,
      categories
    };

    if (editTemplateId !== null) {
      updateTemplateMutation.mutate({ id: editTemplateId, data: templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  // Handle edit template
  const handleEdit = (id: number) => {
    const template = templates?.find(t => t.id === id);
    if (template) {
      setEditTemplateId(id);
      setTemplateName(template.name);
      setMarketplace(template.marketplace);
      setCategories(template.categories as string[]);
      setIsEditDialogOpen(true);
    }
  };

  // Handle delete template
  const handleDelete = (id: number) => {
    deleteTemplateMutation.mutate(id);
  };

  // Handle use template
  const handleUse = (id: number) => {
    useTemplateMutation.mutate(id);
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader className="pb-3 border-b flex justify-between items-center">
          <div>
            <CardTitle>Marketplace Templates</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage templates for different marketplaces and product categories
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Show skeletons while loading
              Array(3).fill(0).map((_, idx) => (
                <Card key={idx} className="opacity-50">
                  <CardHeader className="h-16"></CardHeader>
                  <CardContent className="h-40"></CardContent>
                </Card>
              ))
            ) : isError ? (
              <p className="col-span-3 text-center text-muted-foreground py-8">
                There was an error loading templates. Please try again.
              </p>
            ) : templates?.length === 0 ? (
              <p className="col-span-3 text-center text-muted-foreground py-8">
                No templates found. Create your first template to get started.
              </p>
            ) : (
              <>
                {/* List all templates */}
                {templates?.map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    marketplace={template.marketplace}
                    categories={template.categories as string[]}
                    lastUpdated={template.lastUpdated}
                    usageCount={template.usageCount}
                    onUse={handleUse}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                
                {/* Add Template Card */}
                <TemplateCard
                  name="Create New Template"
                  marketplace=""
                  categories={[]}
                  isAddCard={true}
                  onAdd={() => setIsAddDialogOpen(true)}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Add a new template for your marketplace feeds
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Amazon Electronics Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketplace">Marketplace</Label>
              <Select value={marketplace} onValueChange={setMarketplace}>
                <SelectTrigger id="marketplace">
                  <SelectValue placeholder="Select marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="walmart">Walmart</SelectItem>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="tiktok">TikTok Shop</SelectItem>
                  <SelectItem value="etsy">Etsy</SelectItem>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Categories</Label>
              <div className="flex gap-2">
                <Input
                  id="categories"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="Add category"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                />
                <Button type="button" onClick={handleAddCategory}>Add</Button>
              </div>
              
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((category, idx) => (
                    <div 
                      key={idx} 
                      className="bg-primary-50 border border-primary-200 text-primary-700 px-2 py-1 rounded-md text-sm flex items-center"
                    >
                      {category}
                      <button 
                        type="button" 
                        className="ml-1 text-primary-700 hover:text-primary-900"
                        onClick={() => handleRemoveCategory(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your template settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-templateName">Template Name</Label>
              <Input
                id="edit-templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-marketplace">Marketplace</Label>
              <Select value={marketplace} onValueChange={setMarketplace}>
                <SelectTrigger id="edit-marketplace">
                  <SelectValue placeholder="Select marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="walmart">Walmart</SelectItem>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="tiktok">TikTok Shop</SelectItem>
                  <SelectItem value="etsy">Etsy</SelectItem>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-categories">Categories</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-categories"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="Add category"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                />
                <Button type="button" onClick={handleAddCategory}>Add</Button>
              </div>
              
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((category, idx) => (
                    <div 
                      key={idx} 
                      className="bg-primary-50 border border-primary-200 text-primary-700 px-2 py-1 rounded-md text-sm flex items-center"
                    >
                      {category}
                      <button 
                        type="button" 
                        className="ml-1 text-primary-700 hover:text-primary-900"
                        onClick={() => handleRemoveCategory(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateTemplateMutation.isPending}
            >
              {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
