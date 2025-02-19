declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { LogBody, DigitalOceanCatchError } from "../interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN } = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";

const logger = {
  log: (response: any) => console.log("ServerDelete", { response }),
  error: (response: any) => console.error("ServerDelete", { response }),
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

export async function deleteDroplet(
  dropletId: number
): Promise<string | undefined> {
  interface DeleteResponse {
    status: number;
  }

  const startMsg = `Deleting droplet with ID: ${dropletId}`;
  logData({ status: 100, response: startMsg });

  try {
    const response = await axios.delete<DeleteResponse>(
      `${apiUrl}/droplets/${dropletId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (response.status !== 204) {
      const notOkMsg = `Error deleting droplet: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const endTime = new Date().getTime();
    const successMsg = `Droplet with ID ${dropletId} has been deleted successfully`;
    logData({ status: 200, response: successMsg + `: TS_END ${endTime}` });

    return successMsg;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error deleting droplet: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
    return undefined;
  }
}
