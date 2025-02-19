declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { LogBody, SslRecord } from "../interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN } = process.env;
const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";

const logger = {
  log: (response: any) => console.log("ServerSSL", { response }),
  error: (response: any) => console.error("ServerSSL", { response }),
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

export async function getAccountSslCerts(): Promise<any | undefined> {
  interface SSHKeys {
    status: number;
    ssh_keys: SslRecord[];
  }

  const url = `${apiUrl}/account/keys`;

  try {
    const response = await axios.get<SSHKeys>(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (response.status !== 200) {
      const errorMsg = `Get account SSL certifications failed: `;
      const res = { status: 400, response: errorMsg };
      return res;
    }

    const keys: SslRecord[] = response?.data?.ssh_keys || [];

    const noKeysMsg = `Account has no SSL Certifications`;
    const successMsg = `Got ${keys.length} SSL certifications for account`;
    const resMsg = keys.length > 0 ? successMsg : noKeysMsg;

    logData({ status: 200, response: resMsg, body: { keys } });

    return keys;
  } catch (error) {
    const catchErrorMsg = "Catch error fetching SSH keys";
    logData({ status: 400, response: catchErrorMsg, body: error });
    return [];
  }
}
