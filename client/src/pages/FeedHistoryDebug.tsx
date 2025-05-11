import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";

interface Feed {
  id: number;
  name: string;
  source: string;
  marketplace: string;
  status: "success" | "processing" | "error" | "pending";
  itemCount: number | null;
  processedAt: string | null;
  createdAt: string;
  outputUrl: string | null;
}

export default function FeedHistoryDebug() {
  // Fetch feed history
  const { data: feeds = [], isLoading } = useQuery<Feed[]>({
    queryKey: ["/api/feeds"],
  });
  
  // Debugging state for inspecting specific feed
  const [inspectFeed, setInspectFeed] = useState<number | null>(null);
  
  // Step 1: Log all feed data with timestamps to track freshness
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Feeds data loaded:`, feeds);
    // Check the actual structure and availability of feed names
    feeds.forEach((feed, index) => {
      console.log(`Feed ${index} (id=${feed.id}):`, {
        allKeys: Object.keys(feed),
        name: feed.name,
        nameType: typeof feed.name,
        isEmpty: !feed.name || feed.name.trim() === "",
        nameJson: JSON.stringify(feed.name)
      });
    });
  }, [feeds]);

  // Display loading state
  if (isLoading) {
    return <Layout><div className="p-8">Loading feeds data...</div></Layout>;
  }

  // Get the specific feed being inspected
  const inspectedFeed = inspectFeed !== null ? feeds.find(f => f.id === inspectFeed) : null;

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-8">
        <div className="bg-slate-900 p-4 rounded-lg">
          <h1 className="text-xl font-bold mb-4">Feed Debugging Page</h1>
          
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-2">1. Raw Feed Data</h2>
            <div className="bg-slate-800 p-4 rounded-lg overflow-auto max-h-60">
              <pre className="text-xs text-green-400">{JSON.stringify(feeds, null, 2)}</pre>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">2. Simple Feed Names List</h2>
            <div className="bg-slate-800 p-4 rounded-lg">
              {feeds.length === 0 ? (
                <div className="text-slate-400">No feeds found</div>
              ) : (
                <ul className="space-y-1">
                  {feeds.map((feed) => (
                    <li key={feed.id} className="flex justify-between">
                      <span>
                        <span className="text-blue-400">ID: {feed.id}</span> - 
                        <span className="text-white font-bold"> {feed.name || "[empty]"}</span>
                      </span>
                      <button 
                        className="text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600"
                        onClick={() => setInspectFeed(feed.id)}
                      >
                        Inspect
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">3. Feed Names with Fallback</h2>
            <div className="bg-slate-800 p-4 rounded-lg">
              <ul className="space-y-1">
                {feeds.map((feed) => (
                  <li key={feed.id}>
                    <span className="text-yellow-400">ID: {feed.id}</span> - 
                    <span className="text-white font-bold"> {!feed.name || feed.name.trim() === "" ? 
                      `Untitled Feed ${feed.id}` : 
                      feed.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">4. Random String Test</h2>
            <div className="bg-slate-800 p-4 rounded-lg">
              <ul className="space-y-1">
                {feeds.map((feed) => (
                  <li key={feed.id}>
                    <span className="text-teal-400">ID: {feed.id}</span> - 
                    <span className="text-purple-400 font-bold"> Random: {Date.now()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {inspectedFeed && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Feed Inspector</h2>
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-md font-bold mb-2">Feed ID: {inspectedFeed.id}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(inspectedFeed).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-slate-400">{key}:</div>
                      <div className="font-mono text-white">
                        {typeof value === 'object' ? 
                          (value ? JSON.stringify(value) : 'null') : 
                          String(value)}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  className="mt-4 text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600"
                  onClick={() => setInspectFeed(null)}
                >
                  Close Inspector
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}