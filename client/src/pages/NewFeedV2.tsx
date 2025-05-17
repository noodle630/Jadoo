import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const schema = z.object({
  name: z.string().min(1),
  marketplace: z.string().min(1),
  file: z.any(),
});

type FormValues = z.infer<typeof schema>;

export default function NewFeedV2() {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'processing' | 'done'>('upload');
  const [feedId, setFeedId] = useState<number | null>(null);
  const [feedStats, setFeedStats] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      marketplace: 'amazon',
    },
  });

  const fetchFeedDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/feeds/${id}`);
      const json = await res.json();
      setFeedStats(json);
    } catch (e) {
      console.error('Error fetching feed details:', e);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('marketplace', values.marketplace);
      formData.append('file', values.file);

      const uploadRes = await fetch('/api/feeds/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.id) throw new Error('Upload failed');

      setFeedId(uploadJson.id);
      setStep('processing');
      setProcessing(true);

      await fetch(`/api/feeds/${uploadJson.id}/process`, { method: 'POST' });

      const poll = async (attempt = 0) => {
        if (attempt > 20) throw new Error('Timeout');
        const res = await fetch(`/api/feeds/${uploadJson.id}`);
        const json = await res.json();
        if (json.status === 'completed') {
          setProcessing(false);
          setStep('done');
          setFeedStats(json);
          queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
        } else if (json.status === 'failed') {
          throw new Error('Feed processing failed');
        } else {
          setTimeout(() => poll(attempt + 1), 2000);
        }
      };

      poll();
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
      setProcessing(false);
      setStep('upload');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-cyan-400 mb-4">New Feed</h1>

      {step === 'upload' || step === 'processing' ? (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label>Feed Name</label>
            <input {...form.register('name')} className="w-full border p-2 bg-slate-900 text-white" />
          </div>
          <div>
            <label>Upload File</label>
            <input
              type="file"
              onChange={(e) => form.setValue('file', e.target.files?.[0])}
              className="w-full border p-2 bg-slate-900 text-white"
            />
          </div>
          <div>
            <label>Marketplace</label>
            <select {...form.register('marketplace')} className="w-full border p-2 bg-slate-900 text-white">
              <option value="amazon">Amazon</option>
              <option value="walmart">Walmart</option>
              <option value="reebelo">Reebelo</option>
              <option value="meta">Meta</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={processing}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            {processing ? 'Processing...' : 'Upload & Process'}
          </button>
        </form>
      ) : null}

      {step === 'done' && feedStats && (
        <div className="mt-6 bg-slate-800 p-4 rounded text-white space-y-2">
          <p className="text-green-400 font-semibold">✅ Feed processed successfully!</p>
          <p>📦 Rows Processed: <strong>{feedStats.itemCount}</strong></p>
          <p>✨ AI Fixes:</p>
          <ul className="ml-4 list-disc text-sm text-slate-300">
            <li>Titles optimized: {feedStats.aiChanges?.titleOptimized}</li>
            <li>Descriptions enhanced: {feedStats.aiChanges?.descriptionEnhanced}</li>
            <li>Categories fixed: {feedStats.aiChanges?.categoryCorrected}</li>
            <li>Errors corrected: {feedStats.aiChanges?.errorsCorrected}</li>
          </ul>
          <a
            href={`/api/feeds/${feedStats.id}/download`}
            target="_blank"
            className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ⬇️ Download Transformed CSV
          </a>
        </div>
      )}
    </div>
  );
}
