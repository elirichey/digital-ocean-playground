import {
  listDropletsByAccount,
  checkDropletExistsByName,
  checkDropletExistsByID,
} from "./general-droplet";
import {
  addFirewallToDroplet,
  createDroplet,
  getDropletIP,
  getFirewallID,
} from "./create-droplet";
import { deleteDroplet } from "./delete-droplet";

import {
  LogBody,
  DigitalOceanDroplet,
  DropletLightResponse,
  ListDropletsResponse,
  SuccessfulDroletDeployed,
} from "../interfaces/interfaces";

const logger = {
  log: (response: any) => console.log("ServerGenerator", { response }),
  error: (response: any) => console.error("ServerGenerator", { response }),
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

export async function listAccountDropletsGenerator(): Promise<
  ListDropletsResponse | string
> {
  const res = await listDropletsByAccount();

  const numberOfDroplets: number = res?.length;
  const hasDroplets = numberOfDroplets > 0;

  if (!hasDroplets) {
    const failedMsg = `Account has no Droplets`;
    logData({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const response: ListDropletsResponse = {
    droplets: res,
    numberOfDroplets,
  };

  const msgDroplets = response.droplets.map(
    (drop: DigitalOceanDroplet): DropletLightResponse => {
      const { id, name, status } = drop;
      return { id, name, status };
    }
  );

  const msgDropletsString = JSON.stringify(msgDroplets);
  const resMsg = `Account has ${numberOfDroplets} Droplets: ${msgDropletsString}`;
  logData({ status: 200, response: resMsg });

  return response;
}

export async function listDropletGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<DigitalOceanDroplet | undefined> {
  let droplet: DigitalOceanDroplet | undefined = undefined;

  if (dropletName) {
    droplet = await checkDropletExistsByName(dropletName);
    return droplet;
  }

  if (dropletId) {
    droplet = await checkDropletExistsByID(dropletId);
    return droplet;
  }

  return droplet;
}

export async function listDropletStatusGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<string | undefined> {
  const droplet: DigitalOceanDroplet | undefined = await listDropletGenerator(
    dropletName,
    dropletId
  );

  const status = droplet?.status;
  return status;
}

export async function listDropletIpAddressGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<string | undefined> {
  const droplet: DigitalOceanDroplet | undefined = await listDropletGenerator(
    dropletName,
    dropletId
  );

  if (!droplet) {
    const dropletNotFoundMsg: string = "Droplet not found";
    logData({ status: 404, response: dropletNotFoundMsg });
    return undefined;
  }

  const ip: string | undefined = await getDropletIP(droplet.id);
  if (ip) {
    const foundIpMsg = `Found IP for roplet droplet named ${droplet.name}: ${ip}`;
    logData({ status: 200, response: foundIpMsg });
    return ip;
  }

  let ipNotFoundMsg: string = "IP Address not found";
  logData({ status: 404, response: ipNotFoundMsg });
  return undefined;
}

export async function createDropletGenerator(
  dropletName: string,
  snapshotId: string,
  subdomain: string,
  speed: "Slow" | "Medium" | "Fast" | "Blazing",
  tags?: string[]
): Promise<SuccessfulDroletDeployed | undefined> {
  let server: DigitalOceanDroplet | undefined = undefined;
  let domainVal: string | undefined = undefined;
  const dropletExists = await checkDropletExistsByName(dropletName, true);
  if (typeof dropletExists !== "undefined") server = dropletExists;
  else {
    const newDroplet = await createDroplet(
      dropletName,
      snapshotId,
      subdomain,
      speed,
      tags
    );
    domainVal = newDroplet?.domain;
    const serverVal = newDroplet?.server;
    server = serverVal;
  }

  if (!server) {
    const failureMsg = `Create droplet ${dropletName} failed!`;
    logData({ status: 400, response: failureMsg });
    return undefined;
  }

  const endTime = new Date().getTime();
  const successMsg = `Droplet with name ${dropletName} has been created: TS_END ${endTime}`;
  logData({ status: 201, response: successMsg });
  return { server, domain: domainVal, subdomain };
}

export async function deleteDropletGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<string | undefined> {
  const droplet = await listDropletGenerator(dropletName, dropletId);

  if (!droplet) {
    const id = dropletName || dropletId;
    const noDropletMSg = `Droplet with identifier ${id} does not exist`;
    logData({ status: 404, response: noDropletMSg });
    return undefined;
  }

  const id: number = droplet.id;
  const res = await deleteDroplet(id);

  if (!res) {
    const failedMsg = `Delete Droplet Failed for ID: ${droplet?.id}`;
    logData({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const resMsg = `Deleted Droplet with ID: ${droplet?.id}`;
  logData({ status: 200, response: resMsg });

  return resMsg;
}

export async function addFirewallToDropletGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<string | undefined> {
  const droplet = await listDropletGenerator(dropletName, dropletId);

  if (!droplet) {
    const id = dropletName || dropletId;
    const noDropletMSg = `Droplet with identifier ${id} does not exist`;
    logData({ status: 404, response: noDropletMSg });
    return undefined;
  }

  const firewall = await getFirewallID();
  let firewallObjId: string | undefined = undefined;
  if (firewall) firewallObjId = firewall?.id;

  if (!droplet?.id || !firewallObjId) {
    const missingDropletCredsMsg = `Missing Droplet ID`;
    const missingFirewallCredsMsg = `Missing Firewall ID`;
    const missingBothCredsMsg = `Missing Droplet ID and Firewall ID`;

    if (!droplet?.id) {
      logData({ status: 404, response: missingDropletCredsMsg });
    } else if (!firewallObjId) {
      logData({ status: 404, response: missingFirewallCredsMsg });
    } else if (!droplet?.id && !firewallObjId) {
      logData({ status: 404, response: missingBothCredsMsg });
    }

    return;
  }

  const res = await addFirewallToDroplet(droplet?.id, firewallObjId);

  if (!res) {
    const failedMsg = `Add Firewall Failed for Droplet with ID: ${droplet?.id}`;
    logData({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const endTime = new Date().getTime();
  const resMsg = `Added Firewall to Droplet with ID: ${droplet?.id}: TS_END ${endTime}`;
  logData({ status: 200, response: resMsg });

  return resMsg;
}
