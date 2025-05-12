import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, PencilLine, Check, Copy, Trash2, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Templates() {
  const { toast } = useToast();
  
  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/templates"],
    // Just get data from API - fetcher is set up in queryClient
  });
  
  const handleCreateTemplate = () => {
    toast({
      title: "Create Template",
      description: "Template creation functionality is coming soon!",
    });
  };
  
  const handleUseTemplate = (templateId: number) => {
    toast({
      title: "Using Template",
      description: `Starting new feed using template #${templateId}`,
    });
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Save and reuse your transformation settings</p>
        </div>
        <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <div className="h-4 w-36 bg-gray-800 rounded animate-pulse"></div>
                <div className="h-3 w-24 bg-gray-800 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-gray-800 rounded animate-pulse"></div>
                <div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse mt-2"></div>
              </CardContent>
              <CardFooter>
                <div className="h-8 w-full bg-gray-800 rounded animate-pulse"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: any) => (
            <Card key={template.id} className="border-gray-800 bg-gray-900/50 relative overflow-hidden">
              {template.marketplace && (
                <div className="absolute top-0 right-0 px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border-l border-b border-blue-500/20 rounded-bl">
                  {template.marketplace}
                </div>
              )}
              <CardHeader>
                <CardTitle>{template.name || "Untitled Template"}</CardTitle>
                <CardDescription>
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-400">
                  <div className="flex items-center">
                    <FileText className="h-3 w-3 mr-2" />
                    {template.usageCount || 0} uses
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <PencilLine className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleUseTemplate(template.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="mr-2 h-4 w-4" /> Use
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle>No Templates Yet</CardTitle>
            <CardDescription>
              Create your first template to save your transformation settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              Templates let you save your field mappings and transformation settings for reuse,
              making it faster to process similar product data in the future.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}