declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  DigitalOceanCredentials,
  DigitalOceanDroplet,
} from "../interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN, SNAPSHOT_ID }: DigitalOceanCredentials =
  process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2/droplets";
const snapshotId = SNAPSHOT_ID;

export async function createDroplet(
  dropletName: string
): Promise<DigitalOceanDroplet | undefined> {
  const dropletConfig = {
    name: dropletName, // Name of your droplet
    region: "nyc1", // Choose a region (e.g., 'nyc1', 'sfo3', etc.)
    size: "c-60-intel", // Droplet size (e.g., 'c-60-intel', 's-1vcpu-1gb', 's-2vcpu-2gb', etc.)
    image: "ubuntu-24-10-x64", // OS image (e.g., 'ubuntu-24-10-x64', 'ubuntu-22-04-x64', 'centos-7-x64', etc.)
    ssh_keys: null, // You can specify an array of SSH keys (optional)
    backups: false, // Enable backups (optional)
    ipv6: true, // Enable IPv6 (optional)
    user_data: null, // User data script (optional)
    private_networking: null, // Enable private networking (optional)
    volumes: null, // Attach volumes (optional)
  };

  try {
    const response: any = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(dropletConfig),
    });

    if (!response.ok) {
      const notOkMsg = `Error creating droplet: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const data = await response.json();
    const droplet = data.droplet;

    const createdMsg = `Completed Creating Droplet: ${dropletName} (${droplet?.id})`;
    console.log({ status: 200, response: createdMsg });

    return droplet;
  } catch (error: any) {
    const catchMsg = `Error creating droplet: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}

export async function restoreDropletFromSnapshot(
  dropletId: number
): Promise<DigitalOceanDroplet | undefined> {
  try {
    const response = await fetch(`${apiUrl}/${dropletId}/actions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "restore", image: snapshotId }),
    });

    if (!response.ok) {
      const notOkMsg = `Error restoring droplet from snapshot: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const data = await response.json();

    const restoreMsg = `Droplet restore started from snapshot with ID: ${data.action.id}`;
    console.log({ status: 200, response: restoreMsg });
    return data.droplet;
  } catch (error: any) {
    const catchMsg = `Error restoring droplet from snapshot: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}
