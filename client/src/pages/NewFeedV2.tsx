// File: client/src/pages/NewFeedV2.tsx

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";

export default function NewFeedV2() {
  const [feedName, setFeedName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [marketplace, setMarketplace] = useState("Walmart");
  const [step, setStep] = useState<"upload" | "processing" | "done">("upload");
  const [processing, setProcessing] = useState(false);
  const [feedStats, setFeedStats] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
  });

  const uploadAndProcess = async () => {
    if (!file || !feedName || !marketplace) {
      toast({
        title: "Missing info",
        description: "Please fill out all fields before uploading.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setStep("processing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("marketplace", marketplace);
    formData.append("feedName", feedName);

    try {
      const res = await fetch("/api/feeds/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await res.json();
      if (!uploadJson.id) throw new Error("Upload failed");

      const trigger = await fetch(`/api/feeds/${uploadJson.id}/process`, {
        method: "POST",
      });

      if (!trigger.ok) throw new Error("Processing initiation failed");

      const poll = async (attempt = 0) => {
        if (attempt > 40) throw new Error("Timeout while polling result");

        try {
          const res = await fetch(`/api/feeds/${uploadJson.id}`);
          const contentType = res.headers.get("content-type");

          if (!res.ok || !contentType?.includes("application/json")) {
            const fallback = await res.text();
            console.error("❌ Not JSON:", fallback.slice(0, 200));
            toast({
              title: "Unexpected response",
              description: "Server returned invalid content. Check logs.",
              variant: "destructive",
            });
            return;
          }

          const json = await res.json();
          if (json.status === "completed") {
            setProcessing(false);
            setStep("done");
            setFeedStats(json);
            queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
          } else if (json.status === "failed") {
            toast({
              title: "Feed processing failed",
              description: "Check your input and try again.",
              variant: "destructive",
            });
            setProcessing(false);
          } else {
            setTimeout(() => poll(attempt + 1), 2000);
          }
        } catch (err: any) {
          console.error("❌ Polling failed", err);
          toast({
            title: "Polling error",
            description: err.message || "Unknown error",
            variant: "destructive",
          });
          setProcessing(false);
        }
      };

      poll();
    } catch (err: any) {
      console.error("Upload error", err);
      toast({
        title: "Upload or processing failed",
        description: err.message,
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

if (step === "done") {
  return (
    <div className="max-w-xl mx-auto mt-10 text-center space-y-4">
      <h2 className="text-2xl font-bold text-green-500">✅ Feed Processed!</h2>
      <p className="text-lg">Rows Processed: {feedStats?.row_count}</p>
      <a
        href={`/api/feeds/${feedStats?.id}/download`}
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        ⬇️ Download Transformed CSV
      </a>
      <Button onClick={() => setStep("upload")}>Upload Another</Button>
    </div>
  );
}
  

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">📤 Upload New Feed</h2>

          <div>
            <Label>Feed Name</Label>
            <Input
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
            />
          </div>

          <div>
            <Label>Upload File</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <Label>Marketplace</Label>
            <select
              className="w-full border border-gray-300 p-2 rounded bg-white text-black"
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
            >
              <option value="Walmart">Walmart</option>
              <option value="Amazon">Amazon</option>
            </select>
          </div>

          <Button disabled={processing} onClick={uploadAndProcess}>
            {processing ? "Processing..." : "Upload & Transform"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
