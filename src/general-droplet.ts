declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import {
  LogBody,
  DigitalOceanCatchError,
  DigitalOceanDroplet,
  DropletNetwork,
} from "../interfaces/interfaces";
// import { getDropletIP } from "./create-droplet";

const { DIGITAL_OCEAN_ACCESS_TOKEN } = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";

const logger = {
  log: (response: any) => console.log("ServerGeneral", { response }),
  error: (response: any) => console.error("ServerGeneral", { response }),
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

export async function listDropletsByAccount(): Promise<DigitalOceanDroplet[]> {
  interface Droplets {
    droplets: DigitalOceanDroplet[];
  }

  console.log({ apiToken, apiUrl });

  try {
    const response = await axios.get<Droplets>(`${apiUrl}/droplets`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status !== 200) {
      const notOkMsg = `Error fetching account droplets: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const droplets: DigitalOceanDroplet[] = response.data.droplets;
    const length: number = droplets.length;
    const resMsg = `Got ${length} Droplets for Account`;
    logData({ status: 200, response: resMsg });

    return droplets;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error checking account droplets: ${error?.message}`;
    logData({
      status: error?.status || 400,
      response: error?.message,
      params: { name: error?.name, stack: error?.stack },
    });
    logData({ status: 400, response: catchMsg });
    return [];
  }
}

export async function checkDropletExistsByName(
  dropletName: string,
  skipThrowError?: boolean
): Promise<DigitalOceanDroplet | undefined> {
  const accountDroplets = await listDropletsByAccount();
  if (accountDroplets && accountDroplets.length === 0) {
    const noneFoundMsg = `No Droplets Found`;
    if (skipThrowError) logData({ status: 102, response: noneFoundMsg });
    else logData({ status: 404, response: noneFoundMsg });
    return undefined;
  }

  // Check if any droplet has the specified name
  const dropletExists = accountDroplets.some(
    (droplet) => droplet.name === dropletName
  );

  if (dropletExists) {
    const droplet: DigitalOceanDroplet | undefined = accountDroplets.find(
      (droplet) => droplet.name === dropletName
    );

    if (!droplet) return undefined;

    const dropletNetwork = droplet?.networks.v4.find(
      (net: DropletNetwork) => net?.type === "public"
    );

    const ipAddress = dropletNetwork?.ip_address;
    const successMsg = `Droplet with the name ${dropletName} exists. It has ID ${
      droplet?.id
    }${ipAddress ? ` and an IP address of ${ipAddress}.` : "."}`;

    logData({ status: 200, response: successMsg });
    return droplet;
  } else {
    const noExistMsg = `Droplet with the name ${dropletName} does not exist.`;
    logData({ status: skipThrowError ? 100 : 404, response: noExistMsg });
    return undefined;
  }
}

export async function checkDropletExistsByID(
  dropletId: number
): Promise<DigitalOceanDroplet | undefined> {
  const accountDroplets = await listDropletsByAccount();
  if (accountDroplets && accountDroplets.length === 0) {
    const noneFoundMsg = `No Droplets Found`;
    logData({ status: 404, response: noneFoundMsg });
    return undefined;
  }

  // Check if any droplet has the specified ID
  const dropletExists = accountDroplets.some(
    (droplet) => droplet.id === dropletId
  );

  if (dropletExists) {
    const droplet: DigitalOceanDroplet | undefined = accountDroplets.find(
      (droplet) => droplet.id === dropletId
    );

    const successMsg = `Droplet with the ID "${dropletId}" exists. It's name is ${droplet?.name}.`;
    logData({ status: 200, response: successMsg });

    // const ip = await getDropletIP(`${dropletId}`);
    // logData({ ip });

    return droplet || undefined;
  } else {
    const noExistMsg = `Droplet with the ID "${dropletId}" does not exist.`;
    logData({ status: 404, response: noExistMsg });
    return undefined;
  }
}
