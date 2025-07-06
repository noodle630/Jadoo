import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, PlusCircle, Eye, Info, Download } from "lucide-react";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok, SiEtsy, SiEbay, SiShopify } from "react-icons/si";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { TemplatePreview } from "./TemplatePreview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
export default function TemplateCard({ id = 0, name, marketplace, categories = [], lastUpdated = "", usageCount = 0, isAddCard = false, onUse, onEdit, onDelete, onAdd }) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const getMarketplaceIcon = () => {
        switch (marketplace.toLowerCase()) {
            case 'amazon': return <SiAmazon className="text-2xl text-[#FF9900]"/>;
            case 'walmart': return <SiWalmart className="text-2xl text-[#0071CE]"/>;
            case 'meta': return <SiMeta className="text-2xl text-[#1877F2]"/>;
            case 'tiktok': return <SiTiktok className="text-2xl text-[#000000]"/>;
            case 'catch': return <div className="text-xl font-bold text-[#00A1E0]">C</div>;
            case 'reebelo': return <div className="text-xl font-bold text-[#6E43C4]">R</div>;
            case 'etsy': return <SiEtsy className="text-2xl text-[#F45800]"/>;
            case 'ebay': return <SiEbay className="text-2xl text-[#E53238]"/>;
            case 'shopify': return <SiShopify className="text-2xl text-[#7AB55C]"/>;
            default: return null;
        }
    };
    if (isAddCard) {
        return (<Card className="border-dashed hover:border-primary transition-all duration-300 cursor-pointer bg-muted/20 flex flex-col items-center justify-center p-10 hover:bg-muted/10 hover:scale-[1.02]" onClick={onAdd}>
        <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mb-4 transition-transform duration-300 transform group-hover:scale-110">
          <PlusCircle className="h-8 w-8 text-primary"/>
        </div>
        <h3 className="font-medium text-gray-700 mb-2">Create New Template</h3>
        <p className="text-sm text-muted-foreground text-center">
          Add a custom template for your marketplace
        </p>
      </Card>);
    }
    const getMarketplaceColor = () => {
        switch (marketplace.toLowerCase()) {
            case 'amazon': return 'bg-gradient-to-r from-[#FF9900]/10 to-[#FF9900]/5 border-t-[#FF9900]';
            case 'walmart': return 'bg-gradient-to-r from-[#0071CE]/10 to-[#0071CE]/5 border-t-[#0071CE]';
            case 'meta': return 'bg-gradient-to-r from-[#1877F2]/10 to-[#1877F2]/5 border-t-[#1877F2]';
            case 'tiktok': return 'bg-gradient-to-r from-[#000000]/10 to-[#000000]/5 border-t-[#000000]';
            case 'catch': return 'bg-gradient-to-r from-[#00A1E0]/10 to-[#00A1E0]/5 border-t-[#00A1E0]';
            case 'reebelo': return 'bg-gradient-to-r from-[#6E43C4]/10 to-[#6E43C4]/5 border-t-[#6E43C4]';
            default: return 'bg-gradient-to-r from-primary/10 to-primary/5 border-t-primary';
        }
    };
    return (<Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-t-2">
      <CardHeader className={`p-4 border-b flex justify-between items-center ${getMarketplaceColor()}`}>
        <div className="flex items-center space-x-2">
          {getMarketplaceIcon()}
          <h3 className="font-medium">{name}</h3>
        </div>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TemplatePreview marketplaceType={marketplace}>
                  <Button size="icon" variant="ghost">
                    <Eye className="h-4 w-4"/>
                  </Button>
                </TemplatePreview>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview Template Structure</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => onEdit && onEdit(id)}>
                  <Pencil className="h-4 w-4"/>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Template</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Template</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialogContent className="bg-slate-900 border border-slate-800 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                  This will permanently delete the template "{name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={() => onDelete && onDelete(id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <Info className="h-3 w-3"/>
            <span>Categories:</span>
          </div>
          <Badge variant="outline" className="rounded-full bg-slate-100">
            {categories.length}
          </Badge>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
          <span>Last Updated:</span>
          <span className="text-xs text-slate-500">{lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'New'}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
          <span>Usage:</span>
          <Badge variant={usageCount > 0 ? "default" : "outline"} className={usageCount > 0 ? "bg-green-600 hover:bg-green-700" : ""}>
            {usageCount} feeds
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 2).map((category, idx) => (<Badge key={idx} variant="secondary" className="text-xs">
              {category}
            </Badge>))}
          {categories.length > 2 && (<Badge variant="secondary" className="text-xs">
              +{categories.length - 2} more
            </Badge>)}
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { }} className="px-2">
                <Download className="h-4 w-4"/>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download Template</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button className="flex-1 ml-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 shadow-md" onClick={() => onUse && onUse(id)}>
          Use Template
        </Button>
      </CardFooter>
    </Card>);
}
