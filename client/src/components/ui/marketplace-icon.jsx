import { SiAmazon, SiWalmart, SiTiktok, SiMeta, SiShopify } from "react-icons/si";
import { Globe } from "lucide-react";
export function MarketplaceIcon({ marketplace, size = "md", className = "" }) {
    const sizeMap = {
        xs: 14,
        sm: 18,
        md: 24,
        lg: 32
    };
    const iconSize = sizeMap[size];
    // Use lowercase for consistency
    const marketplaceLower = marketplace.toLowerCase();
    // Return the appropriate icon based on marketplace
    switch (marketplaceLower) {
        case "amazon":
            return <SiAmazon size={iconSize} className={`text-[#FF9900] ${className}`}/>;
        case "walmart":
            return <SiWalmart size={iconSize} className={`text-[#0071DC] ${className}`}/>;
        case "tiktok":
            return <SiTiktok size={iconSize} className={`text-[#000000] ${className}`}/>;
        case "meta":
        case "facebook":
            return <SiMeta size={iconSize} className={`text-[#1877F2] ${className}`}/>;
        case "shopify":
            return <SiShopify size={iconSize} className={`text-[#7AB55C] ${className}`}/>;
        case "catch":
            return (<div className={`flex items-center justify-center bg-[#2F3FFF] text-white rounded w-${iconSize === 14 ? '4' : iconSize === 18 ? '5' : iconSize === 24 ? '6' : '8'} h-${iconSize === 14 ? '4' : iconSize === 18 ? '5' : iconSize === 24 ? '6' : '8'} ${className}`} style={{ fontSize: iconSize * 0.6 }}>
          C
        </div>);
        case "reebelo":
            return (<div className={`flex items-center justify-center bg-[#00B67A] text-white rounded w-${iconSize === 14 ? '4' : iconSize === 18 ? '5' : iconSize === 24 ? '6' : '8'} h-${iconSize === 14 ? '4' : iconSize === 18 ? '5' : iconSize === 24 ? '6' : '8'} ${className}`} style={{ fontSize: iconSize * 0.6 }}>
          R
        </div>);
        default:
            return <Globe size={iconSize} className={`text-blue-400 ${className}`}/>;
    }
}
