declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  DigitalOceanCredentials,
  DigitalOceanDroplet,
  DropletsResponse,
} from "../interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN }: DigitalOceanCredentials = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";

export async function listDropletsByAccount(): Promise<DropletsResponse> {
  try {
    // Fetch the list of all droplets
    const response = await fetch(`${apiUrl}/droplets`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) {
      const notOkMsg = `Error fetching account droplets: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const data: DropletsResponse = await response.json();
    const resMsg = `Got Droplets for Account`;
    console.log({ status: 200, response: resMsg });
    return data;
  } catch (error: any) {
    const catchMsg = `Error checking account droplets: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return { droplets: [] };
  }
}

export async function checkDropletExistsByName(
  dropletName: string
): Promise<DigitalOceanDroplet | undefined> {
  const accountDroplets = await listDropletsByAccount();
  if (accountDroplets && accountDroplets.droplets.length === 0) {
    const noneFoundMsg = `No Droplets Found`;
    console.log({ status: 404, response: noneFoundMsg });
    return undefined;
  }

  // Check if any droplet has the specified name
  const dropletExists = accountDroplets.droplets.some(
    (droplet) => droplet.name === dropletName
  );

  if (dropletExists) {
    const droplet: DigitalOceanDroplet | undefined =
      accountDroplets.droplets.find((droplet) => droplet.name === dropletName);

    const ipAddress = droplet?.networks.v4.find(
      (net) => net.type === "public"
    ).ip_address;
    const successMsg = `Droplet with the name "${dropletName}" exists. It has ID ${droplet?.id}.`;
    console.log({ status: 200, response: successMsg, droplet });

    return droplet || undefined;
  } else {
    const noExistMsg = `Droplet with the name "${dropletName}" does not exist.`;
    console.log({ status: 404, response: noExistMsg });
    return undefined;
  }
}

export async function checkDropletExistsByID(
  dropletId: number
): Promise<DigitalOceanDroplet | undefined> {
  const accountDroplets = await listDropletsByAccount();
  if (accountDroplets && accountDroplets.droplets.length === 0) {
    const noneFoundMsg = `No Droplets Found`;
    console.log({ status: 404, response: noneFoundMsg });
    return undefined;
  }

  // Check if any droplet has the specified ID
  const dropletExists = accountDroplets.droplets.some(
    (droplet) => droplet.id === dropletId
  );

  if (dropletExists) {
    const droplet: DigitalOceanDroplet | undefined =
      accountDroplets.droplets.find((droplet) => droplet.id === dropletId);

    const successMsg = `Droplet with the ID "${dropletId}" exists. It's name is ${droplet?.name}.`;
    console.log({ status: 200, response: successMsg });

    return droplet || undefined;
  } else {
    const noExistMsg = `Droplet with the ID "${dropletId}" does not exist.`;
    console.log({ status: 404, response: noExistMsg });
    return undefined;
  }
}
