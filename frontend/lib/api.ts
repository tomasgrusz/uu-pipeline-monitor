const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface Dataset {
  id: string;
  name: string;
  description: string;
  owner: string;
  schemaVersion: number;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  datasetId: string;
  name: string;
  description: string | null;
  schedule: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobRun {
  id: string;
  pipelineId: string;
  pipelineVersion: number;
  status: "pending" | "running" | "success" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  recordsProcessed: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface JobRunStep {
  id: string;
  runId: string;
  name: string;
  status: "pending" | "running" | "success" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface JobRunDetail extends JobRun {
  steps: JobRunStep[];
}

export interface AlertRule {
  id: string;
  pipelineId: string;
  name: string;
  condition: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  runId: string;
  message: string;
  createdAt: string;
}

export async function getDatasets(): Promise<Dataset[]> {
  try {
    const response = await fetch(`${API_URL}/datasets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch datasets: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching datasets:", error);
    throw error;
  }
}

export async function getPipelines(): Promise<Pipeline[]> {
  try {
    const response = await fetch(`${API_URL}/pipelines`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pipelines: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    throw error;
  }
}

export async function getRuns(): Promise<JobRun[]> {
  try {
    const response = await fetch(`${API_URL}/runs`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch runs: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching runs:", error);
    throw error;
  }
}

export async function getRunById(id: string): Promise<JobRunDetail> {
  try {
    const response = await fetch(`${API_URL}/runs/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch run ${id}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching run by id:", error);
    throw error;
  }
}

export async function getAlertRules(): Promise<AlertRule[]> {
  try {
    const response = await fetch(`${API_URL}/alert-rules`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alert rules: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching alert rules:", error);
    throw error;
  }
}

export async function getAlertEvents(): Promise<AlertEvent[]> {
  try {
    const response = await fetch(`${API_URL}/alert-events`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alert events: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching alert events:", error);
    throw error;
  }
}

export async function createDataset(data: {
  name: string;
  description?: string;
  owner: string;
  schemaVersion?: number;
}): Promise<Dataset> {
  try {
    const response = await fetch(`${API_URL}/datasets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create dataset: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating dataset:", error);
    throw error;
  }
}

export async function createAlertRule(data: {
  pipelineId: string;
  name: string;
  condition: string;
  enabled?: boolean;
}): Promise<AlertRule> {
  try {
    const response = await fetch(`${API_URL}/alert-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create alert rule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating alert rule:", error);
    throw error;
  }
}

export async function createPipeline(data: {
  datasetId: string;
  name: string;
  description?: string;
  schedule?: string;
  active?: boolean;
}): Promise<Pipeline> {
  try {
    const response = await fetch(`${API_URL}/pipelines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create pipeline: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating pipeline:", error);
    throw error;
  }
}

export async function triggerPipeline(pipelineId: string): Promise<{ pipelineId: string; status: string; message: string }>{
  try{
    const response = await fetch(`${API_URL}/pipelines/${pipelineId}/trigger`, {
      method: 'POST',
    });

    if(!response.ok) throw new Error(`Failed to trigger pipeline: ${response.statusText}`);
    return await response.json();
  }catch(err){
    console.error('Error triggering pipeline', err);
    throw err;
  }
}

export async function updatePipeline(pipelineId: string, data: Record<string, any>){
  try{
    const response = await fetch(`${API_URL}/pipelines/${pipelineId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if(!response.ok) throw new Error(`Failed to update pipeline: ${response.statusText}`);
    return await response.json();
  }catch(err){
    console.error('Error updating pipeline', err);
    throw err;
  }
}

export async function deletePipeline(pipelineId: string){
  try{
    const response = await fetch(`${API_URL}/pipelines/${pipelineId}`, {
      method: 'DELETE',
    });

    if(!response.ok && response.status !== 204) throw new Error(`Failed to delete pipeline: ${response.statusText}`);
    return true;
  }catch(err){
    console.error('Error deleting pipeline', err);
    throw err;
  }
}
