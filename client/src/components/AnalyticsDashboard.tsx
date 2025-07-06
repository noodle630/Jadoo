import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface AnalyticsData {
  jobSummary: any[];
  fieldSummary: any[];
  llmSummary: any[];
  recentJobs: any[];
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/dashboard');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center">No analytics data available</div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Performance</TabsTrigger>
          <TabsTrigger value="fields">Field Analytics</TabsTrigger>
          <TabsTrigger value="llm">LLM Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.jobSummary.reduce((sum, job) => sum + (job.total_jobs || 0), 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(
                    data.jobSummary.reduce((sum, job) => sum + (job.avg_processing_time_ms || 0), 0) / 
                    Math.max(data.jobSummary.length, 1)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(
                    data.jobSummary.reduce((sum, job) => sum + (job.avg_success_rate || 0), 0) / 
                    Math.max(data.jobSummary.length, 1)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total LLM Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.jobSummary.reduce((sum, job) => sum + (job.total_llm_calls || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feed ID</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Processing Time</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentJobs.map((job) => (
                    <TableRow key={job.feed_id}>
                      <TableCell className="font-mono text-sm">{job.feed_id}</TableCell>
                      <TableCell>{job.platform}</TableCell>
                      <TableCell>{job.category || 'N/A'}</TableCell>
                      <TableCell>{formatDuration(job.processing_time_ms)}</TableCell>
                      <TableCell>{formatPercentage(job.success_rate)}</TableCell>
                      <TableCell>
                        <Badge variant={job.success_rate > 0.8 ? 'default' : 'secondary'}>
                          {job.success_rate > 0.8 ? 'Good' : 'Needs Review'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Performance by Platform & Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Total Jobs</TableHead>
                    <TableHead>Avg Processing Time</TableHead>
                    <TableHead>Avg Success Rate</TableHead>
                    <TableHead>Total LLM Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.jobSummary.map((job, index) => (
                    <TableRow key={index}>
                      <TableCell>{job.platform}</TableCell>
                      <TableCell>{job.category || 'N/A'}</TableCell>
                      <TableCell>{job.total_jobs}</TableCell>
                      <TableCell>{formatDuration(job.avg_processing_time_ms)}</TableCell>
                      <TableCell>{formatPercentage(job.avg_success_rate)}</TableCell>
                      <TableCell>{job.total_llm_calls}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total Occurrences</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Confidence</TableHead>
                    <TableHead>Blank Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.fieldSummary.map((field, index) => (
                    <TableRow key={index}>
                      <TableCell>{field.field_name}</TableCell>
                      <TableCell>{field.field_type}</TableCell>
                      <TableCell>{field.total_occurrences}</TableCell>
                      <TableCell>
                        {formatPercentage(field.total_successful / Math.max(field.total_occurrences, 1))}
                      </TableCell>
                      <TableCell>{formatPercentage(field.avg_confidence)}</TableCell>
                      <TableCell>{field.total_blanks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Total Calls</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>Avg Confidence</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Error Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.llmSummary.map((llm, index) => (
                    <TableRow key={index}>
                      <TableCell>{llm.model}</TableCell>
                      <TableCell>{llm.total_calls}</TableCell>
                      <TableCell>{formatDuration(llm.avg_duration_ms)}</TableCell>
                      <TableCell>{formatPercentage(llm.avg_confidence)}</TableCell>
                      <TableCell>${llm.total_cost?.toFixed(4) || '0.0000'}</TableCell>
                      <TableCell>
                        {formatPercentage(llm.error_count / Math.max(llm.total_calls, 1))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard; 