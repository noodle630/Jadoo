import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Loader2, 
  AlertCircle, 
  FileText,
  Plus,
  Star,
  Copy,
  Edit,
  Trash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
interface Template {
  id: number;
  name: string;
  marketplace: string;
  createdAt: string;
  usageCount: number;
  description?: string;
}

export default function Templates() {
  const { toast } = useToast();
  
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["/api/templates"],
  });
  
  const handleCopyTemplate = (templateId: number) => {
    toast({
      title: "Template copied",
      description: "Template was copied successfully"
    });
  };
  
  const handleDeleteTemplate = (templateId: number) => {
    // Implementation would go here
    toast({
      title: "Template deleted",
      description: "Template was deleted successfully",
      variant: "destructive"
    });
  };
  
  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mapping Templates</h1>
          <p className="text-muted-foreground">Save and reuse your mapping configurations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 
          Create Template
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="flex justify-center items-center p-8 text-center">
              <div>
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-gray-400">Failed to load templates</p>
              </div>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: Template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <span className="capitalize">{template.marketplace}</span>
                      </TableCell>
                      <TableCell>{formatDate(template.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className={`h-4 w-4 mr-1 ${template.usageCount > 0 ? 'text-yellow-400' : 'text-gray-300'}`} />
                          <span>{template.usageCount || 0} uses</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyTemplate(template.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Use Template
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex justify-center items-center p-8 text-center">
              <div>
                <FileText className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No templates created yet</p>
                <Button className="mt-4" onClick={() => window.location.href = "/new-feed"}>
                  Create your first template
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        {templates && templates.length > 3 && (
          <CardFooter className="flex justify-center border-t p-4">
            <Button variant="outline">View All Templates</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}