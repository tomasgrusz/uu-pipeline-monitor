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
