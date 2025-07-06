import { Check } from "lucide-react";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok, SiEtsy, SiEbay, SiShopify } from "react-icons/si";
import { cn } from "@/lib/utils";
const marketplaces = [
    {
        id: "amazon",
        name: "Amazon",
        icon: <SiAmazon className="h-6 w-6"/>,
        categoriesCount: 15
    },
    {
        id: "walmart",
        name: "Walmart",
        icon: <SiWalmart className="h-6 w-6"/>,
        categoriesCount: 12
    },
    {
        id: "meta",
        name: "Meta",
        icon: <SiMeta className="h-6 w-6"/>,
        categoriesCount: 8
    },
    {
        id: "tiktok",
        name: "TikTok Shop",
        icon: <SiTiktok className="h-6 w-6"/>,
        categoriesCount: 6
    },
    {
        id: "etsy",
        name: "Etsy",
        icon: <SiEtsy className="h-6 w-6"/>,
        categoriesCount: 10
    },
    {
        id: "ebay",
        name: "eBay",
        icon: <SiEbay className="h-6 w-6"/>,
        categoriesCount: 14
    },
    {
        id: "shopify",
        name: "Shopify",
        icon: <SiShopify className="h-6 w-6"/>,
        categoriesCount: 9
    }
];
export default function MarketplaceSelector({ selectedMarketplace, onSelect }) {
    return (<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {marketplaces.map((marketplace) => (<div key={marketplace.id} className={cn("border rounded-lg p-4 hover:border-primary-500 cursor-pointer transition relative", selectedMarketplace === marketplace.id ? "border-primary-500 bg-primary-50" : "")} onClick={() => onSelect(marketplace.id)}>
          <div className="flex items-center mb-2">
            <span className="mr-2">{marketplace.icon}</span>
            <span className="font-medium">{marketplace.name}</span>
          </div>
          <p className="text-xs text-gray-500">Supports {marketplace.categoriesCount}+ categories</p>
          
          {selectedMarketplace === marketplace.id && (<div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
              <Check className="h-3 w-3"/>
            </div>)}
        </div>))}
    </div>);
}
