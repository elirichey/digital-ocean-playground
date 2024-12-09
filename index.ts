declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";

import {
  CLIArguments,
  DigitalOceanCredentials,
  DigitalOceanDroplet,
  DropletsResponse,
} from "./interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN, SNAPSHOT_ID }: DigitalOceanCredentials =
  process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2/droplets";
const snapshotId = SNAPSHOT_ID;

async function checkDropletExists(
  dropletName: string
): Promise<DigitalOceanDroplet | undefined> {
  if (!apiToken) {
    console.error("API Token is missing in .env file");
    return undefined;
  }

  try {
    // Fetch the list of all droplets
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching droplets: ${response.statusText}`);
    }

    const data: DropletsResponse = await response.json();

    // Check if any droplet has the specified name
    const dropletExists = data.droplets.some(
      (droplet) => droplet.name === dropletName
    );

    if (dropletExists) {
      console.log(`Droplet with the name "${dropletName}" exists.`);

      const droplet: DigitalOceanDroplet | undefined = data.droplets.find(
        (droplet) => droplet.name === dropletName
      );
      return droplet || undefined;
    } else {
      console.log(`Droplet with the name "${dropletName}" does not exist.`);
      return undefined;
    }
  } catch (error: any) {
    console.error("Error checking droplet existence:", error.message);
    return undefined;
  }
}

async function createDroplet(
  dropletName: string
): Promise<DigitalOceanDroplet | undefined> {
  const dropletConfig = {
    name: dropletName, // Name of your droplet
    region: "sfo3", // Choose a region (e.g., 'sfo3', 'nyc3', 'ams3', etc.)
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
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    const droplet = data.droplet;
    return droplet;
  } catch (error: any) {
    console.error("Error creating droplet:", error.message);
  }
}

async function restoreDropletFromSnapshot(
  dropletId: number
): Promise<DigitalOceanDroplet | undefined> {
  if (!apiToken) {
    console.error("API Token is missing in .env file");
    return undefined;
  }

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
      throw new Error(
        `Error restoring droplet from snapshot: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      `Droplet restore started from snapshot with ID: ${data.action.id}`
    );
    return data.droplet;
  } catch (error: any) {
    console.error("Error restoring droplet from snapshot:", error.message);
    return undefined;
  }
}

async function deleteDroplet(dropletId: number): Promise<any> {
  console.log("Deleting droplet with ID:", dropletId);
  try {
    const response = await fetch(`${apiUrl}/${dropletId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error deleting droplet: ${response.statusText}`);
    }

    console.log(`Droplet with ID ${dropletId} has been deleted successfully.`);
  } catch (error: any) {
    console.error("Error deleting droplet:", error.message);
  }
}

async function run() {
  const sequenceIdMessage = "Please provide a valid event id for uploading";
  const burnMessage = "Will delete the bucket after a minute";

  program
    .requiredOption("-n, --nameId <type>", sequenceIdMessage)
    .option("-b, --burn", burnMessage);

  program.parse(process.argv);
  const options: CLIArguments = program.opts();
  const { nameId, burn } = options;

  console.log("Setup:", { nameId, burn });

  // 1. Check if droplet with nameId name exists. If so, return the url

  let droplet = await checkDropletExists(nameId);
  if (droplet) {
    console.log("Skipping Droplet Creation...");
  }

  // 2. If not, create a new droplet

  if (!droplet) {
    droplet = await createDroplet(nameId);
    console.log("Droplet Created:", { droplet });

    const dropletId: number | undefined = droplet?.id;
    if (dropletId && snapshotId) {
      const updated = await restoreDropletFromSnapshot(dropletId);
      if (updated) droplet = updated;
    }
  }

  // 3. If burn flag is set, delete the droplet after a minute
  const minutes = 1 * 60 * 1000;
  if (burn) {
    setTimeout(async () => {
      await deleteDroplet(droplet?.id || 0);
      console.log("Completed Deleting Droplet");
    }, minutes);
  }
}

run();
