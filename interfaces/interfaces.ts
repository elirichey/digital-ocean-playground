// ********************* Setup ********************* //

export interface CLIArguments {
  dropletName?: string;
  dropletId?: string;
  create?: boolean;
  list?: boolean;
  burn?: boolean;
  delete?: boolean;
  firewall?: boolean;
}

export interface DigitalOceanCredentials {
  DIGITAL_OCEAN_ACCESS_TOKEN: string;
  DIGITAL_OCEAN_SNAPSHOT_ID: string;
  DIGITAL_OCEAN_FIREWALL_ID: string;
}

// ********************* General ********************* //

export interface DigitalOceanCatchError {
  message: string;
  name: string;
  stack?: string;
}

// ********************* Droplets - Main ********************* //

export interface DropletLightResponse {
  id: number;
  name: string;
  status: string;
}

export interface DropletsResponse {
  droplets: DigitalOceanDroplet[];
}

export interface ListDropletsResponse {
  droplets: DigitalOceanDroplet[];
  numberOfDroplets: number;
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
  tags: string[];
}

export interface DigitalOceanDroplet {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  disk_info: DropletDiskInfo[];
  locked: boolean;
  status: string;
  kernel: any | null;
  created_at: string;
  features: string[];
  backup_ids: string[];
  next_backup_window: any | null;
  snapshot_ids: string[];
  image: DropletImage;
  volume_ids: string[];
  size: DropletSize;
  size_slug: string;
  networks: DropletNetworks;
  region: DropletRegion;
  tags: string[];
}

// ********************* Droplet Details ********************* //

export interface DropletDiskInfoSize {
  amount: number;
  unit: string;
}

export interface DropletDiskInfo {
  type: string;
  size: DropletDiskInfoSize[];
}

export interface DropletImage {
  id: number;
  name: string;
  distribution: string;
  slug: string | null;
  public: boolean;
  regions: string[];
  created_at: string;
  min_disk_size: number;
  type: string;
  size_gigabytes: number;
  description: string;
  tags: string[];
  status: string;
}

// export interface DropletImageRegion {}

export interface DropletSize {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  price_hourly: number;
  regions: string[];
  available: boolean;
  description: string;
  networking_throughput: number;
  disk_info: DropletDiskInfo[];
}

// export interface DropletSizeRegion

// export interface DropletSizeDiskInfo

export interface DropletNetwork {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: string;
}

export interface DropletNetworks {
  v4: DropletNetwork[];
  v6: DropletNetwork[];
}

// export interface DropletNetworkV4

// export interface DropletNetworkV6

export interface DropletRegion {
  name: string;
  slug: string;
  features: string[];
  available: boolean;
  sizes: string[];
}

// export interface

// export interface

// ********************* Droplet Features / Options ********************* //

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
