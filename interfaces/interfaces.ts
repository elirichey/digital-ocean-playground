export interface CLIArguments {
  dropletName?: string;
  dropletId?: string;
  create?: boolean;
  list?: boolean;
  burn?: boolean;
}

export interface DigitalOceanCredentials {
  DIGITAL_OCEAN_ACCESS_TOKEN: string;
  SNAPSHOT_ID: string;
  FIREWALL_ID: string;
}

export interface Droplet {
  id: number;
  name: string;
  status: string;
}

export interface DropletsResponse {
  droplets: DigitalOceanDroplet[];
}

export interface DropletConfig {
  name: string;
  region: string;
  size: string;
  image: string;
  ssh_keys: null;
  backups: boolean;
  ipv6: boolean;
  user_data: null;
  private_networking: null;
  volumes: null;
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

export interface DigtialOceanSnapshot {
  id: string;
  name: string;
  regions: string[];
  created_at: string;
  resource_id: string;
  resource_type: string;
  min_disk_size: number;
  size_gigabytes: number;
  tags: string[];
}

export interface DigtialOceanFirewall {
  id: string;
  name: string;
  status: string;
  inbound_rules: string;
  outbound_rules: string;
  created_at: string;
  droplet_ids: string[];
  tags: string[];
  pending_changes: string[];
}
