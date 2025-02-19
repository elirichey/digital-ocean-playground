declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import {
  LogBody,
  DigitalOceanCatchError,
  SubdomainsList,
  Subdomain,
  SubdomainPayload,
} from "../interfaces/interfaces";

const { DIGITAL_OCEAN_ACCESS_TOKEN, DIGITAL_OCEAN_DOMAIN } = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const domain = DIGITAL_OCEAN_DOMAIN;
const apiUrl = "https://api.digitalocean.com/v2";

const logger = {
  log: (response: any) => console.log("ServerSubdomain", { response }),
  error: (response: any) => console.error("ServerSubdomain", { response }),
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

export async function listSubdomains(
  skipLogging?: boolean
): Promise<SubdomainsList[]> {
  if (!domain) {
    const noDomainMsg = `Invalid Config. ENV missing value for DIGITAL_OCEAN_DOMAIN`;
    logData({ status: 404, response: noDomainMsg });
    throw new Error(noDomainMsg);
  }

  interface DomainRecords {
    status: number;
    domain_records: Subdomain[];
  }

  const url = `${apiUrl}/domains/${domain}/records`;

  try {
    const response = await axios.get<DomainRecords>(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status !== 200) {
      const notOkMsg = `Error fetching account subdomains: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const dnsRecords = response?.data?.domain_records;

    let records: SubdomainsList[] = [];
    if (dnsRecords && dnsRecords.length > 0) {
      dnsRecords.map((record: Subdomain) => {
        const { id, name, type, data } = record;
        const isSubdomain = type === "A" && name !== "@" && name !== "api";
        const subdomain = name;
        const ip = data;
        if (isSubdomain) records.push({ id, subdomain, domain, ip });
      });
    } else {
      if (skipLogging) return [];

      const notFoundRecordsMsg = `Did not find DNS records for domain ${domain}.`;
      logData({ status: 404, response: notFoundRecordsMsg });
      return [];
    }

    const recordsString =
      "[" +
      records.map((record: SubdomainsList) => record.subdomain).join(", ") +
      "]";

    if (skipLogging) return records;

    const resMsg = `Found ${records.length} subdomains for domain ${domain}: ${recordsString}`;
    logData({ status: 200, response: resMsg });
    return records;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error checking account subdomains: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
    return [];
  }
}

export async function checkIfSubdomainExists(
  subdomain: string,
  skipLogging?: boolean
): Promise<SubdomainsList | undefined> {
  const records = await listSubdomains(skipLogging);
  const record = records.find((x: SubdomainsList) => x.subdomain === subdomain);
  if (skipLogging) {
    return record;
  }
  const successMsg = `Subdomain ${subdomain} exists on domain ${domain}`;
  logData({ status: 200, response: successMsg });
  return record;
}

export async function addSubdomain(
  subdomain: string,
  ipAddress: string
): Promise<boolean> {
  const alreadyExists = await checkIfSubdomainExists(subdomain);

  if (alreadyExists) {
    const failMsg = `Subdomain ${subdomain} already added to domain ${domain}`;
    const res = { status: 400, response: failMsg };
    logData(res);
    return true;
  }

  const notExistsMsg = `${subdomain}.${domain} does not exist. Begin creating ${subdomain}.${domain}`;
  logData({ status: 101, response: notExistsMsg });

  interface DomainRecord {
    status: number;
    domain_record: Subdomain;
  }

  const payload: SubdomainPayload = {
    type: "A", // Type of DNS record
    name: subdomain, // The subdomain
    data: ipAddress, // The IP address to associate with this subdomain
    ttl: 1800,
  };

  const url = `${apiUrl}/domains/${domain}/records`;
  try {
    const response = await axios.post<DomainRecord>(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status !== 200 && response.status !== 201) {
      const notOkMsg = `Error creating "A" record for ${subdomain}.${domain}: ${response.statusText}`;
      logData({ status: 400, response: notOkMsg, body: response });
      return false;
    }

    const subdomainResponse = response?.data?.domain_record;
    await awaitForSubdomainReady(subdomain);

    const id = subdomainResponse?.id;
    const subdomainSuccessMsg = `${subdomain}.${domain} "A" record successfully created with ID ${id}.`;
    logData({ status: 201, response: subdomainSuccessMsg });
    return true;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error adding account subdomains: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
    return false;
  }
}

export async function deleteSubdomain(
  subdomain: string
): Promise<string | undefined> {
  const record = await checkIfSubdomainExists(subdomain);
  if (!record) {
    const failMsg = `Subdomain ${subdomain} does not exist on domain ${domain}`;
    const res = { status: 400, response: failMsg };
    logData(res);
    return undefined;
  }

  interface DeleteRecord {
    status: number;
  }

  const url = `${apiUrl}/domains/${domain}/records/${record?.id}`;

  try {
    const response = await axios.delete<DeleteRecord>(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status !== 204) {
      const notOkMsg = `Error deleting "A" record for subdomain ${subdomain}.${domain}: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const successMsg = `Subdomain with ID ${record.id} has been deleted successfully`;
    logData({ status: 200, response: successMsg });

    return successMsg;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error deleting subdomain "A" record: ${error?.message}`;
    logData({ status: 400, response: catchMsg });
    return undefined;
  }
}

export async function awaitForSubdomainReady(
  subdomain: string
): Promise<boolean> {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  while (true) {
    const isReady = await checkIfSubdomainExists(subdomain, true);
    if (isReady) {
      const readyMsg = `${subdomain}.${domain} is ready`;
      const res = { status: 200, response: readyMsg };
      logData(res);
      return true; // Return the result if ready
    } else {
      const notOkMsg = `${subdomain}.${domain} is not ready, checking again...`;
      logData({ status: 101, response: notOkMsg });
      await delay(10000); // Wait for 10 seconds before checking again
    }
  }
}
