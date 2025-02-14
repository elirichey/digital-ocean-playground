declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  listDropletsByAccount,
  checkDropletExistsByName,
  checkDropletExistsByID,
  getDropletById,
} from "./general-droplet";
import {
  addFirewallToDroplet,
  createDroplet,
  getFirewallID,
} from "./create-droplet";
import { deleteDroplet } from "./delete-droplet";

import {
  DigitalOceanDroplet,
  DropletLightResponse,
  ListDropletsResponse,
} from "../interfaces/interfaces";

export async function listAccountDropletsGenerator(): Promise<
  ListDropletsResponse | string
> {
  const res = await listDropletsByAccount();

  const numberOfDroplets: number = res?.droplets?.length;
  const hasDroplets = numberOfDroplets > 0;

  if (!hasDroplets) {
    const failedMsg = `Account has no Droplets`;
    console.error({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const response: ListDropletsResponse = {
    droplets: res.droplets,
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
    droplet = await getDropletById(`${dropletId}`);
    // droplet = await checkDropletExistsByID(dropletId);
    return droplet;
  }

  return droplet;
}

export async function createDropletGenerator(
  dropletName: string,
  create?: boolean,
  subdomain?: string
): Promise<DigitalOceanDroplet | string> {
  let droplet = await checkDropletExistsByName(dropletName);

  if (!droplet && create) {
    droplet = await createDroplet(dropletName, subdomain);
  }

  if (!droplet) {
    const failureMsg = `Droplet ${dropletName} does not exist`;
    return failureMsg;
  }

  const endTime = new Date().getTime();
  const successMsg = `Droplet with name ${dropletName} has been created: TS_END ${endTime}`;
  console.log({ status: 201, response: successMsg });
  return droplet;
}

export async function deleteDropletGenerator(
  dropletName?: string,
  dropletId?: number,
  subdomain?: string
): Promise<string | undefined> {
  const droplet = await listDropletGenerator(dropletName, dropletId);

  if (!droplet) {
    const id = dropletName || dropletId;
    const noDropletMSg = `Droplet with identifier ${id} does not exist`;
    console.error({ status: 404, response: noDropletMSg });
    return undefined;
  }

  const res = await deleteDroplet(droplet?.id, subdomain);

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

  const res = await addFirewallToDroplet(droplet?.id, firewallObjId);

  if (!res) {
    const failedMsg = `Add Firewall Failed for Droplet with ID: ${droplet?.id}`;
    console.error({ status: 400, response: failedMsg });
    return failedMsg;
  }

  const endTime = new Date().getTime();
  const resMsg = `Added Firewall to Droplet with ID: ${droplet?.id}: TS_END ${endTime}`;
  console.log({ status: 200, response: resMsg });

  return resMsg;
}
