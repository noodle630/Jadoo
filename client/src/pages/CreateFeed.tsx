// CreateFeed.tsx

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs, TabsList, TabsTrigger, TabsContent
} from "@/components/ui/tabs";
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter
} from "@/components/ui/card";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import {
  FileUp, FileText, Upload, ArrowRight, FileOutput,
  CheckCircle2, Loader2
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2).max(100),
  marketplace: z.literal("amazon"),
});

export default function CreateFeed() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("idle");
  const [feedId, setFeedId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      marketplace: "amazon",
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        const f = accepted[0];
        setFile(f);
        form.setValue("name", f.name.replace(/\.[^/.]+$/, "") + " (amazon)");
        setActiveTab("details");
      }
    }
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!file) {
      toast({ title: "Missing File", variant: "destructive" });
      return;
    }

    try {
      setUploadProgress(10);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("marketplace", "amazon");
      formData.append("name", data.name);

      const res = await fetch("/transform", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const filename = await res.headers.get("content-disposition")?.match(/filename=(.*)/)?.[1];
      const blob = await res.blob();

      // Create a dummy download link
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename || "transformed_amazon.csv";
      link.click();

      setFeedId("success");
      setProcessingStatus("completed");
      toast({ title: "Transformation complete", variant: "success" });
      setActiveTab("processing");
    } catch (err) {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Create New Feed</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="details" disabled={!file}>Details</TabsTrigger>
          <TabsTrigger value="processing" disabled={!feedId}>Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <div {...getRootProps()} className="border p-10 text-center">
                <input {...getInputProps()} />
                {file ? (
                  <p>{file.name}</p>
                ) : (
                  <p>Drag & drop or click to select a .csv file</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Feed Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Feed Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit">
                      Upload <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing</CardTitle>
            </CardHeader>
            <CardContent>
              {processingStatus === "completed" ? (
                <div className="text-green-600">Done! Your file has been downloaded.</div>
              ) : (
                <Progress value={uploadProgress} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
