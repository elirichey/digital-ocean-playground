declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  checkDropletExistsByName,
  checkDropletExistsByID,
} from "./general-droplet";
import { createDroplet, restoreDropletFromSnapshot } from "./create-droplet";
import { deleteDroplet } from "./delete-droplet";

import {
  DigitalOceanCredentials,
  DigitalOceanDroplet,
} from "../interfaces/interfaces";

const { SNAPSHOT_ID }: DigitalOceanCredentials = process.env;

const snapshotId = SNAPSHOT_ID;

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

    const dropletId: number | undefined = droplet?.id;
    if (dropletId && snapshotId) {
      const updated = await restoreDropletFromSnapshot(dropletId);
      if (updated) droplet = updated;
    }

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
