declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  DigitalOceanCatchError,
  DigitalOceanCredentials,
  DigitalOceanDroplet,
  DigtialOceanFirewall,
  DigtialOceanSnapshot,
  DropletConfig,
} from "../interfaces/interfaces";
import { deleteDroplet } from "./delete-droplet";
import { addSubdomain } from "./subdomain";
import { updateNginxConfig } from "./ssl-nginx";

const {
  DIGITAL_OCEAN_ACCESS_TOKEN,
  DIGITAL_OCEAN_SNAPSHOT_ID,
  DIGITAL_OCEAN_FIREWALL_ID,
  DIGITAL_OCEAN_DOMAIN,
}: DigitalOceanCredentials = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";
const snapshotId = DIGITAL_OCEAN_SNAPSHOT_ID;
const firewallId = DIGITAL_OCEAN_FIREWALL_ID;
const domain = DIGITAL_OCEAN_DOMAIN;

const secondTimeout = 1000;

// ******************** SNAPSHOTS ******************** //

export async function getAvailableSnapshots(): Promise<
  DigtialOceanSnapshot[] | undefined
> {
  try {
    const response = await fetch(`${apiUrl}/snapshots`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const notOkMsg = `Error getting snapshots info: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const data = await response.json();
    const snapshots: DigtialOceanSnapshot[] = data?.snapshots;
    return snapshots;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error getting snapshots info: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}

export async function getSnapshotID(): Promise<
  DigtialOceanSnapshot | undefined
> {
  const snapshots = await getAvailableSnapshots();
  const hasSnapshots = snapshots && snapshots.length > 0;
  if (!hasSnapshots) {
    const noSnapshotsMsg = `No Snapshots found`;
    console.error({ status: 404, response: noSnapshotsMsg });
    return undefined;
  }

  const snapshotExists: boolean = snapshots.some(
    (snap: DigtialOceanSnapshot) => snap.name.trim() === snapshotId.trim()
  );

  if (!snapshotExists) {
    const noSnapshotsMsg = `No Snapshot found with name: ${snapshotId}`;
    console.error({ status: 404, response: noSnapshotsMsg });
    return undefined;
  }

  const snapshot: DigtialOceanSnapshot | undefined = snapshots.find(
    (snap: DigtialOceanSnapshot) => snap.name.trim() === snapshotId.trim()
  );

  const snapshotFoundMsg = `Snapshot found with name: ${snapshotId}`;
  console.log({ status: 200, response: snapshotFoundMsg });

  return snapshot;
}

// ******************** MONITORING ******************** //

async function checkDropletStatusOnInit(
  dropletId: number,
  firewallId?: string
): Promise<string | undefined> {
  let showDeployingTimeout = true;
  const checkMsThreshold = 5 * 1000; // 5 seconds
  while (true) {
    const response = await fetch(`${apiUrl}/droplets/${dropletId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = await response.json();

    if (data.droplet.status === "active") {
      const completeMsg = `Droplet ${dropletId} is active and ready`;
      console.log({ status: 200, response: completeMsg });

      if (firewallId) {
        const firewall = await getFirewallID();
        if (!firewall) {
          await deleteDroplet(dropletId);
          const failedMsg = `Could not find firewall with name: ${firewallId}`;
          throw new Error(failedMsg);
        }

        const firewallResult = await addFirewallToDroplet(
          dropletId,
          firewall.id
        );
        if (!firewallResult) {
          await deleteDroplet(dropletId);
          const failedMsg = `Failed to assign firewall ${firewall.id} to droplet ${dropletId}`;
          throw new Error(failedMsg);
        }

        const networkAccess = await waitForNetworkAccess(dropletId);
        if (!networkAccess) {
          await deleteDroplet(dropletId);
          const failedMsg = `Droplet ${dropletId} is not responding on port 80`;
          throw new Error(failedMsg);
        }
      }

      const ip = await getDropletIP(dropletId);
      if (ip) {
        const successMsg = `Droplet IP is ready: ${ip}`;
        console.log({ status: 200, response: successMsg });
        return ip;
      }

      break;
    } else {
      if (showDeployingTimeout) {
        showDeployingTimeout = false;
        const activeMsg = `Droplet ${dropletId} is still deploying...`;
        console.log({ status: 102, response: activeMsg });
        await new Promise((resolve) => setTimeout(resolve, checkMsThreshold));
      }
    }
  }
}

// ******************** FIREWALLS ******************** //

export async function getFirewalls(): Promise<
  DigtialOceanFirewall[] | undefined
> {
  try {
    const response = await fetch(`${apiUrl}/firewalls`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const notOkMsg = `Error getting firewalls info: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const data = await response.json();
    const firewalls: DigtialOceanFirewall[] = data?.firewalls;
    return firewalls;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error getting firewalls info: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}

export async function getFirewallID(): Promise<
  DigtialOceanFirewall | undefined
> {
  const firewalls = await getFirewalls();
  const hasFirewalls = firewalls && firewalls.length > 0;
  if (!hasFirewalls) {
    const noFirewallsMsg = `No Firewalls found`;
    console.error({ status: 404, response: noFirewallsMsg });
    return undefined;
  }

  const firewallExists: boolean = firewalls.some(
    (fw: DigtialOceanFirewall) => fw.name.trim() === firewallId.trim()
  );

  if (!firewallExists) {
    const noFirewallMsg = `No Firewalls found with name: ${firewallId}`;
    console.error({ status: 404, response: noFirewallMsg });
    return undefined;
  }

  const firewall: DigtialOceanFirewall | undefined = firewalls.find(
    (fw: DigtialOceanFirewall) => fw.name.trim() === firewallId.trim()
  );

  const firewallFoundMsg = `Firewall found with name: ${firewallId}`;
  console.log({ status: 200, response: firewallFoundMsg });

  return firewall;
}

export async function addFirewallToDroplet(
  dropletId: number,
  firewallId: string
): Promise<string | undefined> {
  const addDropletId = Number(dropletId);
  const payload: { droplet_ids: number[] } = {
    droplet_ids: [addDropletId],
  };

  const startFirewallMsg = `Trying to add Firewall ${firewallId} to droplet ${dropletId}`;
  console.log({ status: 100, response: startFirewallMsg });

  try {
    const response = await fetch(`${apiUrl}/firewalls/${firewallId}/droplets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(payload),
    });

    // If response is empty, then it was it's successful! A status of 204 will be returned
    if (response.status === 204) {
      const successMsg = `Successfully added Firewall ${firewallId} to droplet ${dropletId}`;
      console.log({ status: 200, response: successMsg });
      return successMsg;
    }

    if (!response.ok) {
      const notOkMsg = `Error assigning firewall ${firewallId} to droplet ${dropletId}: ${response.statusText}`;
      console.error({ status: response.status, statusText: notOkMsg });
      throw new Error(notOkMsg);
    }

    const responseText = await response.text();
    if (!responseText) {
      throw new Error("Empty response received from server");
    }

    const data = JSON.parse(responseText);
    console.log({ addFirewallResponse: data });
    return data;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error assigning firewall: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}

// ******************** DROPLET IP ******************** //

export async function getDropletIP(
  dropletId: number
): Promise<string | undefined> {
  try {
    const response = await fetch(`${apiUrl}/droplets/${dropletId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get droplet info: ${response.statusText}`);
    }

    const data = await response.json();
    const networks = data.droplet.networks.v4;
    const publicIP = networks.find((network: any) => network.type === "public");

    if (!publicIP) {
      throw new Error("No public IP address found for droplet");
    }

    return publicIP.ip_address;
  } catch (error: DigitalOceanCatchError | any) {
    const catchError = `Catch error getting droplet IP: ${error?.message}`;
    console.error({ status: error?.status || 400, response: catchError });
    return undefined;
  }
}

export async function waitForNetworkAccess(
  dropletId: number,
  port: number = 80,
  maxAttempts: number = 30
): Promise<boolean> {
  const ip = await getDropletIP(dropletId);
  if (!ip) return false;

  const startMsg = `Checking network access for ${ip}:${port}...`;
  console.log({ status: 100, response: startMsg });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://${ip}:${port}`, {
        method: "GET",
        signal: AbortSignal.timeout(secondTimeout), // Short timeout to quickly detect if service is up
      });

      if (response.ok) {
        const successMsg = `Network access confirmed for ${ip}:${port}`;
        console.log({ status: 200, response: successMsg });
        return true;
      }
    } catch (error: DigitalOceanCatchError | any) {
      // This will run after each attempt and throw error if network is not yet ready
      // so we keep this catch empty. No need to throw error when it's still checking
    }

    await new Promise((resolve) => setTimeout(resolve, secondTimeout));

    const showAttempts = false;
    if (showAttempts) {
      const attemptNumber = `${attempt + 1}/${maxAttempts}`;
      const waitingMsg = `Waiting for network access... Attempt ${attemptNumber}`;
      console.log({ status: 102, response: waitingMsg });
    }
  }

  const timeoutErrorMsg = `Timeout waiting for network access on ${ip}:${port}`;
  console.error({ status: 400, response: timeoutErrorMsg });
  return false;
}
// ******************** MAIN ******************** //

export async function createDroplet(
  dropletName: string,
  subdomain?: string
): Promise<DigitalOceanDroplet | undefined> {
  const snapshot = await getSnapshotID();
  let snapshotObjId = undefined;
  if (snapshot) snapshotObjId = snapshot?.id;

  const firewall = await getFirewallID();
  let firewallObjId = undefined;
  if (firewall) firewallObjId = firewall?.id;

  const dropletConfig: DropletConfig = {
    name: dropletName, // Name of your droplet
    region: "nyc1", // Choose a region (e.g., 'nyc1', 'sfo3', etc.)
    size: "c-60-intel", // Droplet size (e.g., 'c-60-intel', 's-1vcpu-1gb', 's-2vcpu-2gb', etc.)
    image: snapshotObjId ? snapshotObjId : "ubuntu-24-10-x64", // OS image (e.g., 'ubuntu-24-10-x64', 'ubuntu-22-04-x64', 'centos-7-x64', etc.)
    ssh_keys: null, // You can specify an array of SSH keys (optional)
    backups: false, // Enable backups (optional)
    ipv6: true, // Enable IPv6 (optional)
    user_data: null, // User data script (optional)
    private_networking: null, // Enable private networking (optional)
    volumes: null, // Attach volumes (optional)
    monitoring: true, // Add feedback for when the droplet has been created completely
    tags: [],
  };

  try {
    const response: any = await fetch(`${apiUrl}/droplets`, {
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

    // Wait for firewall to be deployed so firewall can be attached
    // No need to await before returning droplet, we can let this run in the background
    const ip = await checkDropletStatusOnInit(droplet?.id, firewallId);
    const successMsg = `Completed setting up droplet with IP: ${ip}`;
    console.log({ status: 201, response: successMsg });

    if (domain && subdomain && ip) {
      const resWithSubdomain = await addSubdomain(subdomain, ip);
      if (resWithSubdomain) {
        const subdomainSuccessMsg = `Droplet ${dropletName} is ready at ${subdomain}.${domain}`;
        console.log({ status: 201, response: subdomainSuccessMsg });

        // Then configure SSL & DNS for server
        const completeDomain = `${subdomain}.${domain}`;
        const username = "root"; // Change this to your username if needed
        const privateKeyPath = ""; // Path to the private key for SSH login
        await updateNginxConfig(completeDomain, ip, username, privateKeyPath);
      }
    }

    return droplet;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error creating droplet: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}
