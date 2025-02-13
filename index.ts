declare var process: any;

import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";

import { CLIArguments, DigitalOceanCredentials } from "./interfaces/interfaces";
import {
  listAccountDropletsGenerator,
  listDropletGenerator,
  createDropletGenerator,
  deleteDropletGenerator,
  addFirewallToDropletGenerator,
} from "./src/generator";
import { listSubdomains, checkIfSubdomainExists } from "./src/subdomain";
import { getAccountSslCerts } from "./src/ssl";

const {
  DIGITAL_OCEAN_ACCESS_TOKEN,
  DIGITAL_OCEAN_DOMAIN,
}: DigitalOceanCredentials = process.env;
const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;
const domain = DIGITAL_OCEAN_DOMAIN;

async function run() {
  const sslMessage = "Will return a list of SSL certifications tied to account";
  const subdomainMessage = "Please provide a valid subdomain";
  const dropletNameMessage = "Please provide a valid name";
  const dropletIdMessage = "Please provide a valid droplet ID";
  const createMessage = "Will create the droplet if it does not exist";
  const listMessage = "Will return droplet info if the droplet exists";
  const burnMessage = "Will delete the droplet after a minute";
  const firewallMessage = "Will add a firewall to the specified droplet";

  program
    .option("-ssl, --ssl", sslMessage)
    .option("-s, --subdomain <type>", subdomainMessage)
    .option("-n, --dropletName <type>", dropletNameMessage)
    .option("-i, --dropletId <type>", dropletIdMessage)
    .option("-c, --create", createMessage)
    .option("-l, --list", listMessage)
    .option("-b, --burn", burnMessage)
    .option("-d, --delete", burnMessage)
    .option("-f, --firewall", firewallMessage);

  program.parse(process.argv);
  const options: CLIArguments = program.opts();
  const {
    ssl,
    subdomain,
    dropletName,
    dropletId,
    create,
    list,
    burn,
    delete: deleteDroplet,
    firewall,
  } = options;

  // Make sure setup is correct

  if (!apiToken) {
    const noApiTokenMsg = "API Token is missing in .env file";
    console.error({ status: 400, response: noApiTokenMsg });
    return undefined;
  }

  // Return SSL if ssl is true

  if (ssl) {
    const startMsg = `Start getting account SSL certs`;
    console.log({ status: 100, response: startMsg });
    const res = await getAccountSslCerts();
    return res;
  }

  // If not SSL, run other scripts

  const createTypeIsUndefined = typeof create === "undefined";
  const listTypeIsUndefined = typeof list === "undefined";
  const deleteTypeIsUndefined =
    typeof burn === "undefined" && typeof deleteDroplet === "undefined";
  const firewallTypeIsUndefined = typeof firewall === "undefined";

  const noType =
    createTypeIsUndefined &&
    listTypeIsUndefined &&
    deleteTypeIsUndefined &&
    firewallTypeIsUndefined;

  if (!dropletName && subdomain === "" && list) {
    const startMsg = `Start listing subdomains for: ${domain}`;
    console.log({ status: 100, response: startMsg });
    const res = await listSubdomains();
    return res;
  }

  if (!dropletName && subdomain && list) {
    const startMsg = `Checking if subdomain exits: ${subdomain}`;
    console.log({ status: 100, response: startMsg });
    const res = await checkIfSubdomainExists(subdomain);
    return res;
  }

  // THIS NEEDS TO FIRE OFF AFTER DROPLET IS DELETED
  //   if (!create && (burn || deleteDroplet)) {
  //     const startMsg = `Start deleting subdomain: ${subdomain}`;
  //     console.log({ status: 100, response: startMsg });
  //     // const res = await deleteSubdomain(subdomain);
  //     // return res;
  //     return;
  //   }

  if (!dropletName && !dropletId && !list) {
    const noIdentifierMsg = `Command is missing the name or ID of a droplet`;
    console.error({ status: 400, response: noIdentifierMsg });
    return;
  }

  if (noType) {
    const noTypeMsg = `Command is missing an action flag: create, list, burn, delete, firewall`;
    console.error({ status: 400, response: noTypeMsg });
    return;
  }

  const startTime = new Date().getTime();
  const startString = `TS_START ${startTime}`;

  // Get Account Droplets...

  if (!dropletName && !dropletId && list) {
    const startMsg = `List Account Droplets Generator: ${startString}`;
    console.log({ status: 100, response: startMsg });
    const res = await listAccountDropletsGenerator();
    return res;
  }

  // Get Droplet Contents...

  if ((dropletName || dropletId) && list) {
    const startMsg = `List Droplet Generator: ${
      dropletName || dropletId
    }: ${startString}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? Number(dropletId) : undefined;
    const res = await listDropletGenerator(dropletName, numberId);
    return res;
  }

  // Create a new Droplet...

  if (dropletName && create) {
    const startMsg = `Create Droplet Generator: ${dropletName}: ${startString}`;
    console.log({ status: 100, response: startMsg });
    const res = await createDropletGenerator(dropletName, create, subdomain);
    return res;
  }

  // Delete a Droplet...

  if ((dropletName || dropletId) && !create && (burn || deleteDroplet)) {
    const startMsg = `Delete Droplet Generator: ${dropletName}: ${startString}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? parseInt(dropletId) : undefined;
    const res = await deleteDropletGenerator(dropletName, numberId, subdomain);
    return res;
  }

  // Add Firewall to Droplet

  if ((dropletName || dropletId) && firewall) {
    const startMsg = `Add Firewall to Droplet Generator: ${dropletName}: ${startString}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? parseInt(dropletId) : undefined;
    const res = await addFirewallToDropletGenerator(dropletName, numberId);
    return res;
  }
}

run();
