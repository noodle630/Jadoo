import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok, SiEtsy, SiEbay, SiShopify } from "react-icons/si";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TemplateCardProps {
  id?: number;
  name: string;
  marketplace: string;
  categories: string[];
  lastUpdated?: string;
  usageCount?: number;
  isAddCard?: boolean;
  onUse?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onAdd?: () => void;
}

export default function TemplateCard({
  id = 0,
  name,
  marketplace,
  categories = [],
  lastUpdated = "",
  usageCount = 0,
  isAddCard = false,
  onUse,
  onEdit,
  onDelete,
  onAdd
}: TemplateCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getMarketplaceIcon = () => {
    switch (marketplace.toLowerCase()) {
      case 'amazon': return <SiAmazon className="text-2xl mr-2" />;
      case 'walmart': return <SiWalmart className="text-2xl mr-2" />;
      case 'meta': return <SiMeta className="text-2xl mr-2" />;
      case 'tiktok': return <SiTiktok className="text-2xl mr-2" />;
      case 'etsy': return <SiEtsy className="text-2xl mr-2" />;
      case 'ebay': return <SiEbay className="text-2xl mr-2" />;
      case 'shopify': return <SiShopify className="text-2xl mr-2" />;
      default: return null;
    }
  };

  if (isAddCard) {
    return (
      <Card 
        className="border-dashed hover:border-primary transition cursor-pointer bg-muted/20 flex flex-col items-center justify-center p-10"
        onClick={onAdd}
      >
        <div className="bg-primary-100 rounded-full h-16 w-16 flex items-center justify-center mb-4">
          <PlusCircle className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-medium text-gray-700 mb-2">Create New Template</h3>
        <p className="text-sm text-muted-foreground text-center">
          Add a custom template for your marketplace
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition">
      <CardHeader className="bg-muted/20 p-4 border-b flex justify-between items-center">
        <div className="flex items-center">
          {getMarketplaceIcon()}
          <h3 className="font-medium">{name}</h3>
        </div>
        <div className="flex space-x-2">
          <Button size="icon" variant="ghost" onClick={() => onEdit && onEdit(id)}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the template "{name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete && onDelete(id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Categories:</span>
          <span>{categories.length}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Last Updated:</span>
          <span>{lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'New'}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mb-4">
          <span>Usage:</span>
          <span>{usageCount} feeds</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 2).map((category, idx) => (
            <Badge key={idx} variant="outline" className="bg-muted/20 text-muted-foreground">
              {category}
            </Badge>
          ))}
          {categories.length > 2 && (
            <Badge variant="outline" className="bg-muted/20 text-muted-foreground">
              +{categories.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t bg-muted/20">
        <Button 
          className="w-full" 
          onClick={() => onUse && onUse(id)}
        >
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
}
