declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import * as fs from "node:fs";
import * as os from "node:os";

import axios from "axios";
import {
  LogBody,
  DigitalOceanCatchError,
  DigitalOceanDroplet,
  DigtialOceanFirewall,
  DigtialOceanSnapshot,
  DropletConfig,
  DropletNetwork,
  SuccessfulDroletDeployed,
} from "../interfaces/interfaces";
import { addSubdomain } from "./subdomain";
import { updateNginxConfig } from "./nginx-ssl";

const {
  DIGITAL_OCEAN_ACCESS_TOKEN,
  DIGITAL_OCEAN_FIREWALL_ID,
  DIGITAL_OCEAN_DOMAIN,
  DIGITAL_OCEAN_SSH_KEYS,
  SSL_USER,
  SSL_PRIVATE_KEY_PATH,
  SSL_PRIVATE_KEY_PASSWORD,
} = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";
const firewallId = DIGITAL_OCEAN_FIREWALL_ID;
const domain = DIGITAL_OCEAN_DOMAIN;

const secondTimeout = 1000;

const logger = {
  log: (response: any) => console.log("ServerCreate", { response }),
  error: (response: any) => console.error("ServerCreate", { response }),
};

function logData(options: Partial<LogBody>) {
  const log: Partial<LogBody> = {};
  options.status ? (log.status = options.status) : null;
  options.response ? (log.response = options.response) : null;
  options.body ? (log.body = options.body) : null;
  log.dateTime = new Date().getTime();

  const hasStatusError =
    options.status && (options.status === 400 || options.status === 404);
  if (hasStatusError) logger.error(JSON.stringify(log));
  else logger.log(JSON.stringify(log));
}

// ******************** SNAPSHOTS ******************** //

export async function getAvailableSnapshots(): Promise<
  DigtialOceanSnapshot[] | undefined
> {
  interface SnapshotsResponse {
    status: number;
    snapshots: DigtialOceanSnapshot[];
  }

  try {
    const response = await axios.get<SnapshotsResponse>(`${apiUrl}/snapshots`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status !== 200) {
      const notOkMsg = `Error getting snapshots info: ${response.statusText}`;
      logData({ status: 400, response: notOkMsg, body: response });
      return undefined;
    }

    const snapshots: DigtialOceanSnapshot[] = response?.data?.snapshots;
    return snapshots;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error getting snapshots info: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
    return undefined;
  }
}

export async function getSnapshotID(
  snapshotName: string
): Promise<DigtialOceanSnapshot | undefined> {
  const snapshots = await getAvailableSnapshots();
  const hasSnapshots = snapshots && snapshots.length > 0;
  if (!hasSnapshots) {
    const noSnapshotsMsg = `No Snapshots found`;
    logData({ status: 404, response: noSnapshotsMsg });
    return undefined;
  }

  const snapshotExists: boolean = snapshots.some(
    (snap: DigtialOceanSnapshot) => snap.name.trim() === snapshotName?.trim()
  );

  if (!snapshotExists) {
    const noSnapshotsMsg = `No Snapshot found with name: ${snapshotName}`;
    logData({ status: 404, response: noSnapshotsMsg });
    return undefined;
  }

  const snapshot: DigtialOceanSnapshot | undefined = snapshots.find(
    (snap: DigtialOceanSnapshot) => snap.name.trim() === snapshotName?.trim()
  );

  const snapshotFoundMsg = `Snapshot found with name: ${snapshotName}`;
  logData({ status: 200, response: snapshotFoundMsg });

  return snapshot;
}

// ******************** MONITORING ******************** //

async function checkDropletStatusOnInit(
  dropletId: number,
  firewallId?: string
): Promise<string | undefined> {
  interface DropletResponse {
    status: number;
    droplet: DigitalOceanDroplet;
  }

  let showDeployingTimeout = true;
  const checkMsThreshold = 5 * 1000; // 5 seconds
  while (true) {
    const response = await axios.get<DropletResponse>(
      `${apiUrl}/droplets/${dropletId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    const data = response.data;

    if (data.droplet.status === "active") {
      const completeMsg = `Droplet ${dropletId} is active and ready`;
      logData({ status: 200, response: completeMsg });

      if (firewallId) {
        const firewall = await getFirewallID();
        if (!firewall) {
          const failedMsg = `Could not find firewall with name: ${firewallId}`;
          logData({ status: 400, response: failedMsg });
          return undefined;
        }

        const firewallResult = await addFirewallToDroplet(
          dropletId,
          firewall.id
        );
        if (!firewallResult) {
          const failedMsg = `Failed to assign firewall ${firewall.id} to droplet ${dropletId}`;
          logData({ status: 400, response: failedMsg });
          return undefined;
        }

        const networkAccess = await waitForNetworkAccess(dropletId);
        if (!networkAccess) {
          // await deleteDroplet(dropletId);
          const failedMsg = `Droplet ${dropletId} is not responding on port 80`;
          logData({ status: 400, response: failedMsg });
          return undefined;
        }
      }

      const ip = await getDropletIP(dropletId);
      if (ip) {
        const successMsg = `Droplet IP is ready: ${ip}`;
        logData({ status: 200, response: successMsg });
        return ip;
      }

      break;
    } else {
      if (showDeployingTimeout) {
        showDeployingTimeout = false;
        const activeMsg = `Droplet ${dropletId} is still deploying...`;
        logData({ status: 102, response: activeMsg });
        await new Promise((resolve) => setTimeout(resolve, checkMsThreshold));
      }
    }
  }
}

// ******************** FIREWALLS ******************** //

export async function getFirewalls(): Promise<
  DigtialOceanFirewall[] | undefined
> {
  interface FirewallsResponse {
    status: number;
    firewalls: DigtialOceanFirewall[];
  }

  try {
    const response = await axios.get<FirewallsResponse>(`${apiUrl}/firewalls`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status !== 200) {
      const notOkMsg = `Error getting firewalls info: ${response.statusText}`;
      logData({ status: 400, response: notOkMsg, body: response });
      return undefined;
    }

    const firewalls: DigtialOceanFirewall[] = response?.data?.firewalls;
    return firewalls;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error getting firewalls info: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
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
    logData({ status: 404, response: noFirewallsMsg });
    return undefined;
  }

  const firewallExists: boolean = firewalls.some(
    (fw: DigtialOceanFirewall) => fw.name.trim() === firewallId?.trim()
  );

  if (!firewallExists) {
    const noFirewallMsg = `No Firewalls found with name: ${firewallId}`;
    logData({ status: 404, response: noFirewallMsg });
    return undefined;
  }

  const firewall: DigtialOceanFirewall | undefined = firewalls.find(
    (fw: DigtialOceanFirewall) => fw.name.trim() === firewallId?.trim()
  );

  const firewallFoundMsg = `Firewall found with name: ${firewallId}`;
  logData({ status: 200, response: firewallFoundMsg });

  return firewall;
}

export async function addFirewallToDroplet(
  dropletId: number,
  firewallId: string
): Promise<string | undefined> {
  interface FirewallResponse {
    status: number;
    data: string;
  }

  const addDropletId = Number(dropletId);
  const payload: { droplet_ids: number[] } = {
    droplet_ids: [addDropletId],
  };

  const startFirewallMsg = `Trying to add Firewall ${firewallId} to droplet ${dropletId}`;
  logData({ status: 100, response: startFirewallMsg });

  try {
    const response = await axios.post<FirewallResponse>(
      `${apiUrl}/firewalls/${firewallId}/droplets`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    // If response is empty, then it was it's successful! A status of 204 will be returned
    if (response.status === 204) {
      const successMsg = `Successfully added Firewall ${firewallId} to droplet ${dropletId}`;
      logData({ status: 200, response: successMsg });
      return successMsg;
    }

    const responseData = response.data;
    if (!responseData) {
      const failedMsg = "Empty response received from server";
      logData({ status: 400, response: failedMsg });
      return undefined;
    }

    logData({ response: responseData });
    return "Ok";
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error assigning firewall: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
    return undefined;
  }
}

// ******************** DROPLET IP ******************** //

export async function getDropletIP(
  dropletId: number
): Promise<string | undefined> {
  interface Droplet {
    status: number;
    droplet: DigitalOceanDroplet;
  }

  try {
    const response = await axios.get<Droplet>(
      `${apiUrl}/droplets/${dropletId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (response.status !== 200) {
      const failedMsg = `Failed to get droplet info: ${response.statusText}`;
      logData({ status: 400, response: failedMsg });
      return undefined;
    }

    const data = response.data;
    const networks: DropletNetwork[] = data.droplet.networks.v4;
    const publicIP = networks.find(
      (network: DropletNetwork) => network.type === "public"
    );

    if (!publicIP) {
      const failedMsg = "No public IP address found for droplet";
      logData({ status: 400, response: failedMsg });
      return undefined;
    }

    return publicIP.ip_address;
  } catch (error: DigitalOceanCatchError | any) {
    const catchError = `Catch error getting droplet IP: ${error?.message}`;
    logData({ status: error?.status || 400, response: catchError });
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
  logData({ status: 100, response: startMsg });

  interface NetworkAccess {
    status: number;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get<NetworkAccess>(`http://${ip}:${port}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: secondTimeout,
      });

      if (response.status === 200) {
        const successMsg = `Network access confirmed for ${ip}:${port}`;
        logData({ status: 200, response: successMsg });
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
      logData({ status: 102, response: waitingMsg });
    }
  }

  const timeoutErrorMsg = `Timeout waiting for network access on ${ip}:${port}`;
  logData({ status: 400, response: timeoutErrorMsg });
  return false;
}
// ******************** MAIN ******************** //

export async function createDroplet(
  dropletName: string,
  snapshotId: string,
  subdomain: string,
  speed: "Slow" | "Medium" | "Fast" | "Blazing",
  tags?: string[]
): Promise<SuccessfulDroletDeployed | undefined> {
  const sslKeys = DIGITAL_OCEAN_SSH_KEYS;
  let ssh_keys: string[] | null = null;
  const hasSslKeys = typeof sslKeys === "string";
  if (hasSslKeys) {
    const keys = sslKeys.split(","); // .map(Number); // to make numbers
    if (keys.length > 0) ssh_keys = keys.map((k: string) => k.trim());
  }

  // Server Type
  // - Development        $122 / Month           $0.18155 / Hour
  // - Slow               $218 / Month           $0.32440 / Hour
  // - Medium             $437 / Month           $0.65030 / Hour
  // - Fast               $874 / Month           $1.30060 / Hour
  // - Blazing            $1,639 / Month         $2.43899 / Hour

  const getDropletSize = (
    size: "Slow" | "Medium" | "Fast" | "Blazing"
  ): string => {
    const { ENV } = process.env;
    const isDevelopment = ENV && ENV === "development";
    if (isDevelopment) return "c2-4vcpu-8gb-intel";

    switch (size) {
      case "Slow":
        return "c-8-intel";
      case "Medium":
        return "c-16-intel";
      case "Fast":
        return "c-32-intel";
      case "Blazing":
        return "c-60-intel";
      default:
        return "c-8-intel";
    }
  };

  const name = dropletName;
  const region = "nyc1";
  const size = getDropletSize(speed);
  const image = snapshotId;

  let dropletConfig: DropletConfig = {
    name, // Name of your droplet
    region, // Choose a region (e.g., 'nyc1', 'sfo3', etc.)
    size,
    image, // OS image (e.g., 'ubuntu-24-10-x64', 'ubuntu-22-04-x64', 'centos-7-x64', etc.)
    backups: false, // Enable backups (optional)
    ipv6: true, // Enable IPv6 (optional)
    monitoring: true, // Add feedback for when the droplet has been created completely
  };

  if (tags) dropletConfig.tags = tags;
  if (ssh_keys) dropletConfig.ssh_keys = ssh_keys;

  interface Droplet {
    status: number;
    droplet: DigitalOceanDroplet;
  }

  try {
    const response = await axios.post<Droplet>(
      `${apiUrl}/droplets`,
      dropletConfig,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (response.status !== 202) {
      const notOkMsg = `Error creating droplet: ${response.statusText}`;
      logData({ status: 400, response: notOkMsg });
      return undefined;
    }

    const droplet: DigitalOceanDroplet = response.data.droplet;
    const createdMsg = `Completed Creating Droplet: ${dropletName} (${droplet?.id})`;
    logData({ status: 200, response: createdMsg });

    const dropletId: number = droplet.id;

    // Wait for firewall to be deployed so firewall can be attached
    // No need to await before returning droplet, we can let this run in the background
    const ip = await checkDropletStatusOnInit(droplet?.id, firewallId);

    if (!ip) {
      const notOkMsg = `Error connecting to droplet ${droplet?.id} on port 80`;
      logData({ status: 400, response: notOkMsg });
      return undefined;
    }

    const successMsg = `Completed setting up droplet with IP: ${ip}`;
    logData({ status: 201, response: successMsg });

    // Add Domain Here...
    let completeDomain: string | undefined = undefined;
    if (domain && subdomain && ip) {
      const resWithSubdomain = await addSubdomain(subdomain, ip);
      if (resWithSubdomain) {
        const subdomainSuccessMsg = `Droplet ${dropletName} is ready at ${subdomain}.${domain}`;
        logData({ status: 201, response: subdomainSuccessMsg });
        completeDomain = `${subdomain}.${domain}`;

        if (SSL_USER && SSL_PRIVATE_KEY_PATH && SSL_PRIVATE_KEY_PASSWORD) {
          const username = SSL_USER || "";
          const passphrase = SSL_PRIVATE_KEY_PASSWORD || "";

          const privateKeyEnvPath = SSL_PRIVATE_KEY_PATH || "";
          const privateKeyPath = privateKeyEnvPath.replace("~", os.homedir());
          const privateKeyFound = fs.existsSync(privateKeyPath);

          if (privateKeyFound) {
            const privateKey = fs.readFileSync(privateKeyPath, "utf8");
            const updatedNginx = await updateNginxConfig(
              completeDomain,
              ip,
              username,
              privateKey,
              passphrase
            );

            if (updatedNginx.status !== 200) {
              const errorMsg = `Error updating NGINX`;
              logData({ status: 400, response: errorMsg });
              return undefined;
            }

            const nginxUpdateCompleteMsg = `NGINX Update Successful`;
            logData({ status: 101, response: nginxUpdateCompleteMsg });
            return { server: droplet, subdomain, domain: completeDomain };
          } else {
            const noKeyMsg = `Private Key not found`;
            logData({ status: 404, response: noKeyMsg });
            return undefined;
          }
        } else {
          const errorMsg = `Error creating droplet - Missing SSL in .env - Private Key Not Found`;
          logData({ status: 400, response: errorMsg });
          return undefined;
        }
      }
    }

    return undefined;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error creating droplet: ${error?.message}`;
    logData({ status: 400, response: catchMsg, body: error });
    return undefined;
  }
}
