export interface CLIArguments {
  nameId: string;
  burn?: boolean;
}

export interface B2Credentials {
  BACKBLAZE_ACCESS_KEY_ID: string;
  BACKBLAZE_SECRET_ACCESS_KEY: string;
  BACKBLAZE_REGION: string;
  BACKBLAZE_BUCKET_NAME: string;
  BACKBLAZE_DESTINATION_PATH: string;
  BACKBLAZE_CDN_URL?: string;
}

export interface DigitalOceanCredentials {
  DIGITAL_OCEAN_ACCESS_TOKEN: string;
  SNAPSHOT_ID: string;
}

export interface Droplet {
  id: number;
  name: string;
  status: string;
}

export interface DropletsResponse {
  droplets: DigitalOceanDroplet[];
}

export interface DigitalOceanDroplet {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  disk_info: any[];
  locked: boolean;
  status: string;
  kernel: any;
  created_at: string;
  features: string[];
  backup_ids: any[];
  next_backup_window: any;
  snapshot_ids: any[];
  image: {
    id: number;
    name: string;
    distribution: string;
    slug: string;
    public: boolean;
    regions: any[];
    created_at: string;
    min_disk_size: number;
    type: string;
    size_gigabytes: number;
    description: string;
    tags: any[];
    status: string;
  };
  volume_ids: any[];
  size: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
    transfer: number;
    price_monthly: number;
    price_hourly: number;
    regions: any[];
    available: boolean;
    description: string;
    networking_throughput: number;
    disk_info: any[];
  };
  size_slug: string;
  networks: { v4: any[]; v6: any[] };
  region: {
    name: string;
    slug: string;
    features: any[];
    available: boolean;
    sizes: any[];
  };
  tags: any[];
}
