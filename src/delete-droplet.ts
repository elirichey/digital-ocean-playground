declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import { DigitalOceanCredentials } from "../interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN }: DigitalOceanCredentials = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";

export async function deleteDroplet(
  dropletId: number
): Promise<undefined | string> {
  const startMsg = `Deleting droplet with ID: ${dropletId}`;
  console.log({ status: 100, response: startMsg });

  try {
    const response = await fetch(`${apiUrl}/droplets/${dropletId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) {
      const notOkMsg = `Error deleting droplet: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const successMsg = `Droplet with ID ${dropletId} has been deleted successfully.`;
    console.log({ status: 200, response: successMsg });

    return successMsg;
  } catch (error: any) {
    const catchMsg = `Error deleting droplet: ${error?.message}`;
    console.error({ status: 400, response: catchMsg });
    return undefined;
  }
}
