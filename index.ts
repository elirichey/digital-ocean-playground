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

const { DIGITAL_OCEAN_ACCESS_TOKEN }: DigitalOceanCredentials = process.env;
const apiToken = DIGITAL_OCEAN_ACCESS_TOKEN;

async function run() {
  const dropletNameMessage = "Please provide a valid name";
  const dropletIdMessage = "Please provide a valid droplet ID";
  const createMessage = "Will create the droplet if it does not exist";
  const listMessage = "Will return droplet info if the droplet exists";
  const burnMessage = "Will delete the droplet after a minute";
  const firewallMessage = "Will add a firewall to the specified droplet";

  program
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

  if (!dropletName && !dropletId && !list) {
    const noIdentifierMsg = `Command is missing the name or ID of a droplet`;
    console.error({ status: 400, response: noIdentifierMsg });
    return;
  }

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

  if (noType) {
    const noTypeMsg = `Command is missing an action flag: create, list, burn, delete, firewall`;
    console.error({ status: 400, response: noTypeMsg });
    return;
  }

  // Get Account Droplets...

  if (!dropletName && !dropletId && list) {
    const startMsg = `List Account Droplets Generator`;
    console.log({ status: 100, response: startMsg });
    const res = await listAccountDropletsGenerator();
    return res;
  }

  // Get Droplet Contents...

  if ((dropletName || dropletId) && list) {
    const startMsg = `List Droplet Generator: ${dropletName || dropletId}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? Number(dropletId) : undefined;
    const res = await listDropletGenerator(dropletName, numberId);
    return res;
  }

  // Create a new Droplet...

  if (dropletName && create) {
    const startMsg = `Create Droplet Generator: ${dropletName}`;
    console.log({ status: 100, response: startMsg });
    const res = await createDropletGenerator(dropletName, create, burn);
    return res;
  }

  // Delete a Droplet...

  if ((dropletName || dropletId) && !create && (burn || deleteDroplet)) {
    const startMsg = `Delete Droplet Generator: ${dropletName}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? parseInt(dropletId) : undefined;
    const res = await deleteDropletGenerator(dropletName, numberId);
    return res;
  }

  // Add Firewall to Droplet

  if ((dropletName || dropletId) && firewall) {
    const startMsg = `Add Firewall to Droplet Generator: ${dropletName}`;
    console.log({ status: 100, response: startMsg });
    const numberId = dropletId ? parseInt(dropletId) : undefined;
    const res = await addFirewallToDropletGenerator(dropletName, numberId);
    return res;
  }
}

run();
