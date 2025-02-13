declare var process: any;

import dotenv from "dotenv";
import { DigitalOceanCredentials, SslRecord } from "../interfaces/interfaces";
import axios from "axios";

dotenv.config();

const { DIGITAL_OCEAN_ACCESS_TOKEN }: DigitalOceanCredentials = process.env;
const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const apiUrl = "https://api.digitalocean.com/v2";

export async function getAccountSslCerts(): Promise<any | undefined> {
  const url = `${apiUrl}/account/keys`;

  try {
    // AxiosResponse
    const response: any = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (response.status !== 200) {
      const errorMsg = `Get account SSL certifications failed: `;
      const res = { status: 400, response: errorMsg };
      return res;
    }

    const keys: SslRecord[] = response.data.ssh_keys;
    // console.log("Response", { keys });

    const noKeysMsg = `Account has no SSL Certifications`;
    const successMsg = `Got ${keys.length} SSL certifications for account`;
    const resMsg = keys.length > 0 ? successMsg : noKeysMsg;
    console.log({ status: 200, response: resMsg });

    return keys;
  } catch (error) {
    console.error("Error fetching SSH keys:", error);
    return [];
  }
}
