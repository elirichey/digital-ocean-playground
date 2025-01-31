declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  DigitalOceanCredentials,
  DigitalOceanDroplet,
  DigtialOceanFirewall,
  DigtialOceanSnapshot,
} from "../interfaces/interfaces";

const {
  DIGITAL_OCEAN_ACCESS_TOKEN,
  SNAPSHOT_ID,
  FIREWALL_ID,
}: DigitalOceanCredentials = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";
const snapshotId = SNAPSHOT_ID;
const firewallId = FIREWALL_ID;

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
  } catch (error: any) {
    const catchMsg = `Error getting snapshots info: ${error?.message}`;
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
  dropletId: string,
  firewallId?: string
) {
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
          throw new Error(`Could not find firewall with name: ${firewallId}`);
        }

        const firewallResult = await addFirewallToDroplet(
          dropletId,
          firewall.id
        );
        if (!firewallResult) {
          const failedMsg = `Failed to assign firewall ${firewall.id} to droplet ${dropletId}`;
          throw new Error(failedMsg);
        }
      }

      break;
    } else {
      const activeMsg = `Droplet ${dropletId} is still deploying...`;
      console.log({ status: 102, response: activeMsg });
      await new Promise((resolve) => setTimeout(resolve, checkMsThreshold));
    }
  }
}

// ******************** FIREWALLS ******************** //

export async function getFirewalls() {
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
  } catch (error: any) {
    const catchMsg = `Error getting firewalls info: ${error?.message}`;
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
  dropletId: string,
  firewallId: string
): Promise<any | undefined> {
  const addDropletId = Number(dropletId);
  const payload: { droplet_ids: number[] } = {
    droplet_ids: [addDropletId],
  };

  const startFirewallMsg = `Trying to add Firewall ${firewallId} to droplet ${dropletId}`;
  console.log({ status: 100, response: startFirewallMsg, payload });

  try {
    const response = await fetch(`${apiUrl}/firewalls/${firewallId}/droplets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(payload),
    });

    // If response is empty, it's successful a status of 204 will be returned

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
  } catch (error: any) {
    const catchMsg = `Catch Error assigning firewall: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}

// ******************** MAIN ******************** //

export async function createDroplet(
  dropletName: string
): Promise<DigitalOceanDroplet | undefined> {
  const snapshot = await getSnapshotID();
  let snapshotObjId = undefined;
  if (snapshot) snapshotObjId = snapshot?.id;

  const firewall = await getFirewallID();
  let firewallObjId = undefined;
  if (firewall) firewallObjId = firewall?.id;

  const dropletConfig = {
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
    checkDropletStatusOnInit(droplet?.id, firewallId);

    return droplet;
  } catch (error: any) {
    const catchMsg = `Error creating droplet: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}
