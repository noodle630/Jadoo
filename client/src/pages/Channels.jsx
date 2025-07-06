import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, RefreshCcw, Database, BarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function Channels() {
    const [marketplaces, setMarketplaces] = useState([
        {
            id: "amazon",
            name: "Amazon",
            icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.009 19.492c-3.038 1.617-6.097 2.486-9.119 2.486-4.086 0-7.807-1.506-10.649-4.013-.206-.172-.034-.427.225-.304 3.038 1.721 6.806 2.76 10.67 2.76 2.609 0 5.497-.529 8.149-1.617.426-.163.771.265.346.628l-1.506 1.506zM14.934 18.244c-.403-.494-2.654-.244-3.673-.122-.309.04-.355-.225-.081-.409.426-.286 1.191-.815 1.637-1.11.16-.101.32.4.32.132-.8.95-.017 2.244.21 3.015.077.253-.94.34-.32.153-.933-.781-2.215-1.506-2.215-4.013 0-3.38 2.295-6.097 5.415-6.097 2.761 0 4.219 1.326 4.219 3.214 0 2.194-1.453 3.827-3.4 3.827-.669 0-1.301-.356-1.129-1.326l.309-1.355c.264-1.059-.563-1.925-1.364-1.925-1.09 0-1.968 1.13-1.968 2.796 0 1.019.345 1.719 1.06 1.719.471 0 .878-.254 1.046-.571.168-.317.471-1.772.487-1.869.16-1.009.595-1.506 1.396-1.506 1.608 0 2.772 1.671 2.772 4.088 0 1.396-.435 2.499-1.12 3.331-.22.272-.531.224-.691.162l-.31-.162zM18.025 4.013C16.519 2.904 14.364 2.245 12.41 2.245c-2.761 0-5.252 1.022-7.14 2.724-.19.173-.02.41.21.225 1.034-.61 2.123-1.144 3.245-1.429 1.596-.407 3.41-.468 5.08-.203.326.05.669.128 1.006.212.326.081.669.175 1.006.285.326.97.645.204.961.326.153.56.287.115.421.174.065.3.128.56.188.085h.003c.084.42.14.126.06.203l-.425.366z"/>
        </svg>),
            connected: true,
            lastSync: "2 hours ago",
            catalog: true,
            inventory: true,
            orders: false
        },
        {
            id: "walmart",
            name: "Walmart",
            icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.4 2.4h19.2v19.2H2.4V2.4zm10.08 13.764c1.013 0 1.535-.649 1.535-1.535 0-1.05-.875-1.318-1.673-1.51-.483-.126-.847-.252-.847-.521 0-.252.203-.414.539-.414.431 0 .686.288.686.703h1.39c.028-1.14-.948-1.78-2.04-1.78-1.02 0-1.95.617-1.95 1.639 0 .988.858 1.263 1.612 1.427.47.113.895.232.895.575 0 .234-.218.469-.575.469-.486 0-.757-.252-.757-.757H10.09c0 1.222.889 1.703 2.389 1.703zm-4.097-2.66h1.129c.324 0 .559.146.559.543 0 .378-.228.575-.598.575h-1.09v-1.119zm0-1.868h1.03c.31 0 .534.16.534.495 0 .361-.253.495-.534.495h-1.03V11.64zm-1.408 3.99h2.648c.998 0 1.913-.501 1.913-1.51 0-.688-.268-1.046-.723-1.28.218-.18.541-.562.541-1.16 0-.927-.628-1.52-1.857-1.52H6.975v5.47zm7.5-5.47v5.47h1.408v-1.82h.539c1.19 0 1.93-.612 1.93-1.822 0-1.2-.718-1.83-1.913-1.83h-1.961zm1.408 1.139h.495c.378 0 .631.2.631.633 0 .431-.288.631-.598.631h-.535V11.3z"/>
        </svg>),
            connected: true,
            lastSync: "1 day ago",
            catalog: true,
            inventory: true,
            orders: false
        },
        {
            id: "meta",
            name: "Meta (Facebook)",
            icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.001 2c5.523 0 10 4.477 10 10s-4.477 10-10 10c-4.96 0-9.121-3.61-9.88-8.342-.092-.575-.115-1.09-.12-1.635V12c0-5.523 4.477-10 10-10zm0 1.5c-4.69 0-8.5 3.809-8.5 8.5v.069a8.52 8.52 0 0 1 .117 1.367c.646 3.993 4.126 7.054 8.38 7.064 4.687-.001 8.494-3.826 8.5-8.519-.007-4.699-3.814-8.481-8.5-8.481zm-5.002 8.734c.136.616.354 1.192.645 1.723.231.421.55.645.92.645.55 0 .974-.336 1.935-1.437l.937-1.067 1.281 1.067c.969 1.102 1.394 1.437 1.944 1.437.3 0 .558-.141.771-.37l-.141-.172a2.4 2.4 0 0 1-.166-.24 1.415 1.415 0 0 1-.156-.309c-.124-.348-.196-.753-.196-1.177 0-.612.123-1.158.318-1.59a3.12 3.12 0 0 1 .196-.353c.088-.126.188-.246.304-.345l-.138-.162a1.017 1.017 0 0 0-.779-.37c-.55 0-.975.336-1.944 1.438l-1.278 1.067-.934-1.067c-.957-1.102-1.381-1.437-1.932-1.437a1.029 1.029 0 0 0-.92.645c-.294.535-.513 1.115-.65 1.735-.057.259-.086.527-.089.796.003.265.031.531.087.786z"/>
        </svg>),
            connected: false,
            catalog: false,
            inventory: false,
            orders: false
        },
        {
            id: "tiktok",
            name: "TikTok Shop",
            icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258c-.623-.412-1.11-.933-1.448-1.55a5.273 5.273 0 0 1-.494-1.885H16.9v11.458a2.92 2.92 0 0 1-.187 1.025 2.943 2.943 0 0 1-4.072 1.35 2.941 2.941 0 0 1 .89-5.415c.188 0 .376.02.559.06v-3.076c-.184-.013-.37-.012-.555.002a6.005 6.005 0 0 0-1.726.347 6.033 6.033 0 0 0-2.929 2.078 6.027 6.027 0 0 0-1.2 3.604 6.017 6.017 0 0 0 .376 2.123 6.03 6.03 0 0 0 3.312 3.512c1.359.54 2.91.544 4.272.01 1.196-.471 2.19-1.313 2.85-2.41.511-.846.798-1.796.844-2.771V8.257a9.507 9.507 0 0 0 2.306.868c.715.155 1.445.21 2.169.165V6.23a5.259 5.259 0 0 1-1.092-.118 5.07 5.07 0 0 1-2.125-.975l.019.024z"/>
        </svg>),
            connected: false,
            catalog: false,
            inventory: false,
            orders: false
        },
        {
            id: "catch",
            name: "Catch",
            icon: <Globe className="h-6 w-6"/>,
            connected: true,
            lastSync: "5 hours ago",
            catalog: true,
            inventory: false,
            orders: false
        },
        {
            id: "reebelo",
            name: "Reebelo",
            icon: <Globe className="h-6 w-6"/>,
            connected: false,
            catalog: false,
            inventory: false,
            orders: false
        }
    ]);
    const toggleConnection = (id) => {
        setMarketplaces(prev => prev.map(m => m.id === id
            ? Object.assign(Object.assign({}, m), { connected: !m.connected, lastSync: m.connected ? undefined : "Just now" }) : m));
    };
    const toggleSync = (id, type) => {
        setMarketplaces(prev => prev.map(m => m.id === id
            ? Object.assign(Object.assign({}, m), { [type]: !m[type] }) : m));
    };
    return (<Layout>
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Channel Manager</h1>
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCcw size={16}/>
            <span>Sync All</span>
          </Button>
        </div>
        
        <Tabs defaultValue="connections">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Globe size={16}/>
              <span>Marketplace Connections</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Database size={16}/>
              <span>Sync Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="connections">
            <p className="text-slate-400 mb-6">
              Connect your S account to various marketplaces to easily sync your products and manage inventory across multiple platforms.
            </p>
            
            <div className="space-y-4">
              {marketplaces.map((marketplace) => (<Card key={marketplace.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-md ${marketplace.connected ? 'bg-blue-900/20 text-blue-500' : 'bg-slate-800 text-slate-500'} flex items-center justify-center`}>
                          {marketplace.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">{marketplace.name}</h3>
                          <p className="text-sm text-slate-400">
                            {marketplace.connected
                ? `Last synced: ${marketplace.lastSync}`
                : "Not connected"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {marketplace.connected && (<Button variant="outline" size="sm" className="h-8 px-3">
                            <RefreshCcw size={14} className="mr-1"/>
                            Sync
                          </Button>)}
                        
                        <div className="flex items-center gap-2">
                          <Switch id={`connection-${marketplace.id}`} checked={marketplace.connected} onCheckedChange={() => toggleConnection(marketplace.id)}/>
                          <Label htmlFor={`connection-${marketplace.id}`} className="text-sm font-medium cursor-pointer">
                            {marketplace.connected ? "Connected" : "Connect"}
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    {marketplace.connected && (<div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4">
                        <div className="flex items-start gap-3">
                          <Switch id={`catalog-${marketplace.id}`} checked={marketplace.catalog} onCheckedChange={() => toggleSync(marketplace.id, 'catalog')}/>
                          <div>
                            <Label htmlFor={`catalog-${marketplace.id}`} className="text-sm font-medium cursor-pointer">
                              Catalog Sync
                            </Label>
                            <p className="text-xs text-slate-400">
                              Push product data to marketplace
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Switch id={`inventory-${marketplace.id}`} checked={marketplace.inventory} onCheckedChange={() => toggleSync(marketplace.id, 'inventory')}/>
                          <div>
                            <Label htmlFor={`inventory-${marketplace.id}`} className="text-sm font-medium cursor-pointer">
                              Inventory Sync
                            </Label>
                            <p className="text-xs text-slate-400">
                              Keep quantities in sync
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Switch id={`orders-${marketplace.id}`} checked={marketplace.orders} onCheckedChange={() => toggleSync(marketplace.id, 'orders')}/>
                          <div>
                            <Label htmlFor={`orders-${marketplace.id}`} className="text-sm font-medium cursor-pointer">
                              Orders Sync
                            </Label>
                            <p className="text-xs text-slate-400">
                              Import orders from marketplace
                            </p>
                          </div>
                        </div>
                      </div>)}
                  </CardContent>
                </Card>))}
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
                <CardDescription>
                  Configure default behavior for marketplace synchronization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-white">Auto-Sync Frequency</h4>
                        <p className="text-xs text-slate-400">How often should your products be synced with marketplaces</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select className="bg-slate-800 border-slate-700 rounded-md text-sm p-1">
                          <option value="1">Every hour</option>
                          <option value="6" selected>Every 6 hours</option>
                          <option value="12">Every 12 hours</option>
                          <option value="24">Once a day</option>
                          <option value="0">Manual only</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div>
                        <h4 className="text-sm font-medium text-white">Default Priority</h4>
                        <p className="text-xs text-slate-400">If a product is updated in multiple channels, which takes priority</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select className="bg-slate-800 border-slate-700 rounded-md text-sm p-1">
                          <option value="amazon">Amazon</option>
                          <option value="walmart">Walmart</option>
                          <option value="catch">Catch</option>
                          <option value="local" selected>Local inventory (S)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div>
                        <h4 className="text-sm font-medium text-white">Sync Notifications</h4>
                        <p className="text-xs text-slate-400">Get notified when sync operations complete or fail</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="sync-notifications" defaultChecked/>
                        <Label htmlFor="sync-notifications" className="text-sm">Enabled</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 p-4 bg-blue-900/20 text-blue-300 rounded-lg border border-blue-800">
          <div className="flex items-start gap-3">
            <BarChart className="h-5 w-5 text-blue-400 mt-0.5"/>
            <div>
              <h4 className="font-medium text-blue-100">Coming Soon: Advanced Channel Analytics</h4>
              <p className="text-sm mt-1">Track performance across marketplaces, compare sales metrics, and get AI-powered recommendations to optimize your multi-channel strategy.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>);
}
