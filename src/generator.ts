declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  listDropletsByAccount,
  checkDropletExistsByName,
  checkDropletExistsByID,
} from "./general-droplet";
import {
  addFirewallToDroplet,
  createDroplet,
  getFirewallID,
} from "./create-droplet";
import { deleteDroplet } from "./delete-droplet";

import { DigitalOceanDroplet } from "../interfaces/interfaces";

export async function listAccountDropletsGenerator(): Promise<any | undefined> {
  const res = await listDropletsByAccount();

  const numberOfDroplets: number = res?.droplets?.length;
  const hasDroplets = numberOfDroplets > 0;

  if (!hasDroplets) {
    const failedMsg = `Account has no Droplets`;
    console.error({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const response: {
    droplets: DigitalOceanDroplet[];
    numberOfDroplets: number;
  } = {
    droplets: res.droplets,
    numberOfDroplets,
  };

  const msgDroplets = response.droplets.map((drop: DigitalOceanDroplet) => {
    const { id, name, status } = drop;
    return { id, name, status };
  });

  const msgDropletsString = JSON.stringify(msgDroplets);
  const resMsg = `Account has ${numberOfDroplets} Droplets: ${msgDropletsString}`;
  console.log({ status: 200, response: resMsg });

  return response;
}

export async function listDropletGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<DigitalOceanDroplet | undefined> {
  let droplet = undefined;

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

export async function createDropletGenerator(
  dropletName: string,
  create?: boolean,
  burn?: boolean
): Promise<any> {
  // Check if droplet with dropletName name exists. If so, return the url
  let droplet = await checkDropletExistsByName(dropletName);

  // If not, create a new droplet
  if (!droplet && create) {
    droplet = await createDroplet(dropletName);

    // If burn flag is set, delete the droplet after a minute and a half
    const minutes = 1.5 * 60 * 1000;
    if (droplet && burn) {
      setTimeout(async () => {
        await deleteDroplet(droplet?.id || 0);
      }, minutes);
    } else {
      return droplet;
    }
  }
}

export async function deleteDropletGenerator(
  dropletName?: string,
  dropletId?: number
): Promise<string | undefined> {
  const droplet = await listDropletGenerator(dropletName, dropletId);

  if (!droplet) {
    const id = dropletName || dropletId;
    const noDropletMSg = `Droplet with identifier ${id} does not exist`;
    console.error({ status: 404, response: noDropletMSg });
    return undefined;
  }

  const res = await deleteDroplet(droplet?.id);

  if (!res) {
    const failedMsg = `Delete Droplet Failed for ID: ${droplet?.id}`;
    console.error({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const resMsg = `Deleted Droplet with ID: ${droplet?.id}`;
  console.log({ status: 200, response: resMsg });

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
    console.error({ status: 404, response: noDropletMSg });
    return undefined;
  }

  const firewall = await getFirewallID();
  let firewallObjId = undefined;
  if (firewall) firewallObjId = firewall?.id;

  if (!droplet?.id || !firewallObjId) {
    const missingDropletCredsMsg = `Missing Droplet ID`;
    const missingFirewallCredsMsg = `Missing Firewall ID`;
    const missingBothCredsMsg = `Missing Droplet ID and Firewall ID`;

    if (!droplet?.id) {
      console.log({ status: 404, response: missingDropletCredsMsg });
    } else if (!firewallObjId) {
      console.log({ status: 404, response: missingFirewallCredsMsg });
    } else if (!droplet?.id && !firewallObjId) {
      console.log({ status: 404, response: missingBothCredsMsg });
    }

    return;
  }

  const res = await addFirewallToDroplet(`${droplet?.id}`, firewallObjId);

  if (!res) {
    const failedMsg = `Add Firewall Failed for Droplet with ID: ${droplet?.id}`;
    console.error({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const resMsg = `Added Firewall to Droplet with ID: ${droplet?.id}`;
  console.log({ status: 200, response: resMsg });

  return resMsg;
}
