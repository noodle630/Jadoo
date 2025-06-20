import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function NewFeedV2() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputId, setOutputId] = useState<string | null>(null);

  const handleUploadAndProcess = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setProcessing(true);
    setOutputId(null);

    try {
      // ✅ Upload step
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/feeds/upload", {
        method: "POST",
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadJson.id) throw new Error("Upload failed");

      console.log("✅ Upload ID:", uploadJson.id);

      // ✅ Process step
      const processRes = await fetch(`/api/feeds/${uploadJson.id}/process`, {
        method: "POST",
      });

      const processJson = await processRes.json();
      console.log("✅ Process result:", processJson);

      setOutputId(uploadJson.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">📤 Upload & Transform Feed</h2>

          <div>
            <Label>Select CSV File</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button
            onClick={handleUploadAndProcess}
            disabled={processing || !file}
          >
            {processing ? "Processing..." : "Upload & Process"}
          </Button>

          {outputId && (
            <a
              href={`/api/feeds/${outputId}/download`}
              className="block mt-4 px-4 py-2 bg-green-600 text-white rounded"
            >
              ⬇️ Download Transformed File
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
