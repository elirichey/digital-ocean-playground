declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import {
  DigitalOceanCatchError,
  DigitalOceanCredentials,
  SubdomainsList,
  Subdomain,
  SubdomainQueryResponse,
  SubdomainPayload,
  SubdomainResponse,
} from "../interfaces/interfaces";

const {
  DIGITAL_OCEAN_ACCESS_TOKEN,
  DIGITAL_OCEAN_DOMAIN,
}: DigitalOceanCredentials = process.env;

const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const domain = DIGITAL_OCEAN_DOMAIN;
const apiUrl = "https://api.digitalocean.com/v2";

export async function listSubdomains(
  skipLogging?: boolean
): Promise<SubdomainsList[]> {
  const url = `${apiUrl}/domains/${domain}/records`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) {
      const notOkMsg = `Error fetching account subdomains: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const results: SubdomainQueryResponse = await response.json();
    const dnsRecords = results?.domain_records;

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
      console.log({ status: 404, response: notFoundRecordsMsg });
      return [];
    }

    const recordsString =
      "[" +
      records.map((record: SubdomainsList) => record.subdomain).join(", ") +
      "]";

    if (skipLogging) return records;

    const resMsg = `Found ${records.length} subdomains for domain ${domain}: ${recordsString}`;
    console.log({ status: 200, response: resMsg });
    return records;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error checking account subdomains: ${error?.message}`;
    console.error({ status: 400, response: catchMsg, error });
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
  console.log({ status: 200, response: successMsg });
  return record;
}

export async function addSubdomain(
  subdomain: string,
  ipAddress: string
): Promise<any | undefined> {
  const alreadyExists = await checkIfSubdomainExists(subdomain);

  if (alreadyExists) {
    const failMsg = `Subdomain ${subdomain} already added to domain ${domain}`;
    const res = { status: 400, response: failMsg };
    console.error(res);
    return res;
  }

  const notExistsMsg = `${subdomain}.${domain} does not exist. Begin creating ${subdomain}.${domain}`;
  console.log({ status: 100, response: notExistsMsg });

  const payload: SubdomainPayload = {
    type: "A", // Type of DNS record
    name: subdomain, // The subdomain
    data: ipAddress, // The IP address to associate with this subdomain
    ttl: 1800,
  };

  const url = `${apiUrl}/domains/${domain}/records`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const notOkMsg = `Error creating "A" record for ${subdomain}.${domain}: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    await awaitForSubdomainReady(subdomain);

    const subdomainResponse: SubdomainResponse = await response.json();
    const id = subdomainResponse?.id;
    const subdomainSuccessMsg = `${subdomain}.${domain} "A" record successfully created with ID ${id}.`;
    console.log({ status: 201, response: subdomainSuccessMsg });
    return true;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error checking account subdomains: ${error?.message}`;
    console.error({ status: 400, response: catchMsg, error });
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
    console.error(res);
    return undefined;
  }

  const url = `${apiUrl}/domains/${domain}/records/${record?.id}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) {
      const notOkMsg = `Error deleting "A" record for subdomain ${subdomain}.${domain}: ${response.statusText}`;
      throw new Error(notOkMsg);
    }

    const successMsg = `Subdomain with ID ${record.id} has been deleted successfully`;
    console.log({ status: 200, response: successMsg });

    return successMsg;
  } catch (error: DigitalOceanCatchError | any) {
    const catchMsg = `Catch error deleting subdomain "A" record: ${error?.message}`;
    console.error({ status: 400, response: catchMsg, error });
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
      console.log(res);
      return true; // Return the result if ready
    } else {
      console.log(`${subdomain}.${domain} is not ready, checking again...`);
      await delay(10000); // Wait for 10 seconds before checking again
    }
  }
}
